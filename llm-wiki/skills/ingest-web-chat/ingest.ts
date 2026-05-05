#!/usr/bin/env tsx
// LLM Wiki subskill: ingest a single web LLM chat into a wiki raw-source.
// Usage: tsx ingest.ts <chat-url> [--out <wiki-root>]
// Requires: a Chrome launched with --remote-debugging-port=9222.

import { chromium, type BrowserContext, type Page } from "rebrowser-playwright-core";
import TurndownService from "turndown";
import { mkdir, writeFile, readFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { extractClaude, CLAUDE_HOSTS, type RawChat } from "./providers/claude.ts";
import { extractGemini, GEMINI_HOSTS } from "./providers/gemini.ts";
import { extractFallback } from "./providers/_fallback.ts";

interface Args {
  url: string;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else rest.push(a);
  }
  if (!rest[0]) {
    console.error("Usage: tsx ingest.ts <chat-url> [--out <wiki-root>]");
    process.exit(2);
  }
  return { url: rest[0], out: resolve(args.out ?? process.cwd()) };
}

function pickProvider(url: string): "claude" | "gemini" | "unknown" {
  const host = new URL(url).hostname;
  if (CLAUDE_HOSTS.some((h) => host.includes(h))) return "claude";
  if (GEMINI_HOSTS.some((h) => host.includes(h))) return "gemini";
  return "unknown";
}

const CDP_ENDPOINT = process.env.LLM_WIKI_CDP ?? "http://localhost:9222";

async function withContext<T>(
  fn: (ctx: BrowserContext) => Promise<T>,
): Promise<T> {
  const browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  const ctx = browser.contexts()[0] ?? (await browser.newContext());
  try {
    return await fn(ctx);
  } finally {
    // Disconnect only — closing the context would close the user's Chrome.
    await browser.close();
  }
}

async function extract(url: string): Promise<RawChat> {
  const provider = pickProvider(url);
  return withContext(async (ctx) => {
    const page: Page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (provider === "claude") return await extractClaude(page, url);
      if (provider === "gemini") return await extractGemini(page, url);
      return await extractFallback(page, url, provider);
    } finally {
      await page.close();
    }
  });
}

function turndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  return td;
}

function toMarkdown(chat: RawChat): { filename: string; body: string } {
  const td = turndown();
  const today = new Date().toISOString().slice(0, 10);
  const slug = (chat.title || "chat")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const filename = `${today}-${chat.provider}-${slug || chat.conv_id.slice(0, 8)}.md`;

  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: ${JSON.stringify(chat.title)}`);
  lines.push(`type: source`);
  lines.push(`source_kind: web-chat`);
  lines.push(`provider: ${chat.provider}`);
  lines.push(`url: ${chat.url}`);
  lines.push(`conv_id: ${chat.conv_id}`);
  lines.push(`collected: ${today}`);
  lines.push(`published: Unknown`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${chat.title}`);
  lines.push("");
  lines.push(`> Imported from ${chat.url} on ${today}.`);
  lines.push("");

  for (const turn of chat.turns) {
    const heading = turn.role === "user" ? "## User" : "## Assistant";
    lines.push(heading);
    lines.push("");
    const md = turn.html
      ? td.turndown(turn.html).trim()
      : turn.text.trim();
    lines.push(md);
    lines.push("");
  }
  return { filename, body: lines.join("\n") };
}

async function findWikiRoot(start: string): Promise<string | null> {
  let cur = start;
  while (true) {
    if (existsSync(join(cur, "llm-wiki", "SCHEMA.md"))) return join(cur, "llm-wiki");
    const up = dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

async function writeIntoWiki(
  wikiRoot: string,
  filename: string,
  body: string,
  chat: RawChat,
): Promise<string> {
  const dir = join(wikiRoot, "raw-sources", "conversations");
  await mkdir(dir, { recursive: true });
  const path = join(dir, filename);
  await writeFile(path, body, "utf8");

  const indexPath = join(wikiRoot, "raw-sources", "index.md");
  const today = new Date().toISOString().slice(0, 10);
  const entry = `- **${chat.title}** — \`${chat.url}\` — collected ${today} — copy: [${filename}](conversations/${filename})\n`;
  if (existsSync(indexPath)) {
    const cur = await readFile(indexPath, "utf8");
    if (!cur.includes(filename)) {
      const updated = cur.includes("## Conversations")
        ? cur.replace(/(## Conversations\n)/, `$1${entry}`)
        : cur.trimEnd() + `\n\n## Conversations\n${entry}`;
      await writeFile(indexPath, updated, "utf8");
    }
  } else {
    await writeFile(
      indexPath,
      `# Raw Sources\n\n## Conversations\n${entry}`,
      "utf8",
    );
  }
  return path;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const wikiRoot = await findWikiRoot(args.out);
  if (!wikiRoot) {
    console.error(
      `[ingest] No llm-wiki/SCHEMA.md found at or above ${args.out}. Pass --out <project> pointing at a project that contains llm-wiki/.`,
    );
    process.exit(2);
  }

  console.error(`[ingest] ${args.url}`);
  const chat = await extract(args.url);
  if (!chat.turns.length) {
    console.error(
      "[ingest] No turns extracted. Is your CDP Chrome running and signed in to the provider?",
    );
    process.exit(1);
  }
  const { filename, body } = toMarkdown(chat);
  const path = await writeIntoWiki(wikiRoot, filename, body, chat);
  const logPath = join(wikiRoot, "log.md");
  const today = new Date().toISOString().slice(0, 10);
  const logEntry = `\n## [${today}] ingest | web-chat: ${chat.title}\n- Source: ${chat.url}\n- File: raw-sources/conversations/${filename}\n- Turns: ${chat.turns.length}\n`;
  if (existsSync(logPath)) await appendFile(logPath, logEntry, "utf8");
  else await writeFile(logPath, `# Wiki Log\n${logEntry}`, "utf8");

  console.log(path);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
