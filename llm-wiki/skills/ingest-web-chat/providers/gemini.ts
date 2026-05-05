// Gemini provider. Targets the share-viewer DOM:
//   <share-turn-viewer>
//     <user-query> ... <user-query-content> ... </user-query-content> </user-query>
//     <response-container> ... <message-content> ... </message-content> </response-container>
//   </share-turn-viewer>
// Each turn-viewer holds one user query plus one model response.
import type { Page } from "rebrowser-playwright-core";
import type { RawChat, RawTurn } from "./claude.ts";

export const GEMINI_HOSTS = ["gemini.google.com"];

export async function extractGemini(page: Page, url: string): Promise<RawChat> {
  await page.waitForSelector("user-query, share-turn-viewer", { timeout: 45_000 });
  await page.waitForTimeout(2500);

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
    rawTitle = rawTitle.replace(/^\u200E?Gemini\s*-\s*/, "").trim() || "Gemini chat";
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
    provider: "gemini" as unknown as "claude",
    title: data.title || "Gemini chat",
    url,
    conv_id: convId,
    turns: data.turns as RawTurn[],
  };
}
