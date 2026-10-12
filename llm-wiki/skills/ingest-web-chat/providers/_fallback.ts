// Generic fallback for providers without a dedicated extractor.
// Returns one bulk "assistant" turn carrying the readable page body.
//
// The captured HTML is cloned and stripped first. `page.content()` hands back
// every <style> and <script> in the app shell, and Turndown renders their text
// nodes verbatim, which is how a Cloudflare interstitial got saved as a chat.
import type { Page } from "rebrowser-playwright-core";
import type { RawChat } from "./claude.ts";

const DROP_SELECTORS = ["script", "style", "noscript", "template", "nav", "aside"].join(",");

const HOST_LABELS: Record<string, string> = {
  "chatgpt.com": "chatgpt",
  "gemini.google.com": "gemini",
  "claude.ai": "claude",
  "perplexity.ai": "perplexity",
};

export function providerLabel(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return (
    HOST_LABELS[host] ??
    host.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
  );
}

export async function extractFallback(page: Page, url: string): Promise<RawChat> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2500);

  const data = await page.evaluate((drop: string) => {
    // No functions may be declared inside this callback: tsx transpiles with
    // esbuild keepNames, which wraps them in a __name shim, and Playwright ships
    // fn.toString() into the page where __name does not exist.
    const root = document.body.cloneNode(true) as HTMLElement;
    for (const el of Array.from(root.querySelectorAll(drop))) el.remove();
    // innerText on a detached node is empty, so read textContent here.
    return {
      title: document.title.trim(),
      html: root.innerHTML,
      text: (root.textContent ?? "").replace(/[ \t]+\n/g, "\n").trim(),
    };
  }, DROP_SELECTORS);

  const provider = providerLabel(url);
  const convId = url.split("/").pop()?.split("?")[0] ?? "unknown";

  return {
    provider,
    title: data.title || `${provider} chat`,
    url,
    conv_id: convId,
    // Zero turns when the stripped page is empty, so the caller can tell a real
    // extraction from a page that had nothing readable on it.
    turns: data.text ? [{ role: "assistant", html: data.html, text: data.text }] : [],
  };
}
