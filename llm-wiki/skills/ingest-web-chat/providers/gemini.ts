// Gemini provider. Targets the share-viewer DOM:
//   <share-turn-viewer>
//     <user-query> ... <user-query-content> ... </user-query-content> </user-query>
//     <response-container> ... <message-content> ... </message-content> </response-container>
//   </share-turn-viewer>
// Each turn-viewer holds one user query plus one model response.
import type { Page } from "rebrowser-playwright-core";
import type { RawChat } from "./claude.ts";

export const GEMINI_HOSTS = ["gemini.google.com"];

// The /app/ viewer virtualizes older turns inside an
// infinite-scroller.chat-history element, so drive that container to the top
// until the turn count (and first-turn text) is stable before reading.
// Navigation noise (Execution context destroyed) is retried.
async function mountAllTurns(page: Page): Promise<void> {
  const turnSel = "share-turn-viewer, user-query";
  let prev = "";
  let stable = 0;
  for (let i = 0; i < 60; i++) {
    let state = "";
    try {
      state = await page.evaluate((sel: string) => {
        const h = document.querySelector(
          "infinite-scroller.chat-history",
        ) as HTMLElement | null;
        if (h) h.scrollTop = 0;
        else {
          const anchor = document.querySelector(sel);
          let box: Element | null = anchor;
          while (box && box.scrollHeight <= box.clientHeight)
            box = box.parentElement;
          (box ?? (document.scrollingElement ?? document.body)).scrollTop = 0;
        }
        const first = document.querySelector(sel);
        const firstText = first
          ? (((first as HTMLElement).innerText ?? "").slice(0, 80))
          : "";
        const n = document.querySelectorAll(sel).length;
        const hh = h ? h.scrollHeight : document.body.scrollHeight;
        return `${n}|${hh}|${firstText}`;
      }, turnSel);
    } catch {
      await page.waitForTimeout(2000);
      continue;
    }
    // Two consecutive identical readings (count, height AND first-turn text).
    if (state === prev) {
      stable++;
      if (stable >= 2) return;
    } else {
      stable = 0;
      prev = state;
    }
    await page.waitForTimeout(1200);
  }
}

export async function extractGemini(page: Page, url: string): Promise<RawChat> {
  await page.waitForSelector("user-query, share-turn-viewer", { timeout: 45_000 });
  await page.waitForTimeout(2500);
  await mountAllTurns(page);

  const data = await page.evaluate(() => {
    const turns: { role: "user" | "assistant"; html: string; text: string }[] = [];

    const turnViewers = Array.from(document.querySelectorAll("share-turn-viewer"));
    const containers = turnViewers.length
      ? turnViewers
      : Array.from(document.querySelectorAll("conversation-container, .conversation-container"));

    for (const tv of containers) {
      const userEl =
        tv.querySelector("user-query-content") ||
        tv.querySelector("user-query");
      if (userEl) {
        const html = (userEl as HTMLElement).innerHTML;
        const text = (userEl as HTMLElement).innerText.trim();
        if (text) turns.push({ role: "user", html, text });
      }
      const respEl =
        tv.querySelector("message-content") ||
        tv.querySelector("response-container");
      if (respEl) {
        const html = (respEl as HTMLElement).innerHTML;
        const text = (respEl as HTMLElement).innerText.trim();
        if (text) turns.push({ role: "assistant", html, text });
      }
    }

    let rawTitle = document.title || "Gemini chat";
    rawTitle = rawTitle
      .replace(/^\u200E?Gemini\s*-\s*/, "")
      .replace(/\s*-\s*Google Gemini$/i, "")
      .trim() || "Gemini chat";
    // The share-viewer has a heading with the actual conversation title.
    const headingEl = document.querySelector("share-viewer h1, share-viewer h2");
    if (headingEl) {
      const t = (headingEl as HTMLElement).innerText.trim();
      if (t) rawTitle = t;
    }
    return { title: rawTitle, turns };
  });

  const convId = url.split("/").pop()?.split("?")[0] ?? "unknown";
  return {
    provider: "gemini",
    title: data.title || "Gemini chat",
    url,
    conv_id: convId,
    turns: data.turns,
  };
}
