#!/usr/bin/env tsx
// LLM Wiki subskill: ingest a single web LLM chat into a wiki raw-source.
// Usage: tsx ingest.ts <chat-url> [--out <wiki-root>]
// Requires: a Chrome launched with --remote-debugging-port=9222.

import { chromium, type BrowserContext, type Page } from "rebrowser-playwright-core";
import TurndownService from "turndown";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { extractClaude, CLAUDE_HOSTS, type RawChat } from "./providers/claude.ts";
import { extractGemini, GEMINI_HOSTS } from "./providers/gemini.ts";
import { extractChatgpt, CHATGPT_HOSTS } from "./providers/chatgpt.ts";
import { extractFallback } from "./providers/_fallback.ts";
import { assertNotGated, GateError } from "./providers/gate.ts";

// Below this much readable text the page is a shell, a redirect target or an
// empty conversation, not something worth a wiki entry.
const MIN_TEXT_CHARS = 200;

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

type Provider = "claude" | "gemini" | "chatgpt" | "fallback";

function pickProvider(url: string): Provider {
  const host = new URL(url).hostname;
  if (CLAUDE_HOSTS.some((h) => host.includes(h))) return "claude";
  if (GEMINI_HOSTS.some((h) => host.includes(h))) return "gemini";
  if (CHATGPT_HOSTS.some((h) => host.includes(h))) return "chatgpt";
  return "fallback";
}

const CDP_ENDPOINT = process.env.LLM_WIKI_CDP ?? "http://localhost:9222";
const CHROME_PROFILE = join(homedir(), ".chrome-llm-wiki");

async function cdpAlive(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const LAUNCH_HINT =
  `Start one and re-run:\n` +
  `  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\\n` +
  `    --remote-debugging-port=9222 --user-data-dir="${CHROME_PROFILE}"\n` +
  `--user-data-dir is required: since Chrome 136 the flag is ignored on the\n` +
  `default profile. Sign in to the chat provider once in that Chrome.`;

async function ensureCdp(endpoint: string): Promise<void> {
  if (await cdpAlive(endpoint)) return;

  const port = Number(new URL(endpoint).port || 9222);
  const chrome =
    process.env.LLM_WIKI_CHROME ??
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome");

  // Only auto-launch the default endpoint and profile. A custom LLM_WIKI_CDP
  // means someone else owns that browser.
  const ours = endpoint === "http://localhost:9222";
  if (!ours || (chrome.includes("/") && !existsSync(chrome))) {
    throw new Error(`No Chrome listening at ${endpoint}.\n${LAUNCH_HINT}`);
  }

  console.error(`[ingest] no CDP at ${endpoint}, launching Chrome (${CHROME_PROFILE})`);
  spawn(
    chrome,
    [`--remote-debugging-port=${String(port)}`, `--user-data-dir=${CHROME_PROFILE}`],
    { detached: true, stdio: "ignore" },
  ).unref();

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await cdpAlive(endpoint)) return;
  }
  throw new Error(`Chrome did not open ${endpoint} within 30s.\n${LAUNCH_HINT}`);
}

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
      await assertNotGated(page);
      if (provider === "claude") return await extractClaude(page, url);
      if (provider === "gemini") return await extractGemini(page, url);
      if (provider === "chatgpt") return await extractChatgpt(page, url);
      return await extractFallback(page, url);
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
      // Match existing section header case-insensitively to honor whatever
      // casing the wiki already uses (e.g. "## conversations" vs "## Conversations").
      const sectionMatch = cur.match(/^(##\s+conversations\s*)$/im);
      const updated = sectionMatch
        ? cur.replace(sectionMatch[0], `${sectionMatch[0]}\n${entry}`.replace(/\n\n+/g, "\n"))
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
  await ensureCdp(CDP_ENDPOINT);

  let chat: RawChat;
  try {
    chat = await extract(args.url);
  } catch (err) {
    if (err instanceof GateError) {
      console.error(`[ingest] ${err.message}`);
      console.error(`[ingest] ${err.hint}`);
      process.exit(1);
    }
    throw err;
  }

  const readable = chat.turns.map((t) => t.text).join("\n").trim();
  if (readable.length < MIN_TEXT_CHARS) {
    console.error(
      `[ingest] Refusing to write: only ${readable.length} readable characters from ${args.url} (need ${MIN_TEXT_CHARS}).`,
    );
    console.error(
      "[ingest] The page is probably a sign-in wall, an empty conversation or an app shell. Nothing was written.",
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
  console.error(`[ingest] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
