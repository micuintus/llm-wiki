// ChatGPT provider. Targets the conversation DOM:
//   <article data-testid="conversation-turn-...">
//     <h4>...</h4>  [author heading]
//     <div data-message-author-role="user|assistant"> ... message content ...
//   </article>
// Older builds put the role on a sibling of the content node, so both shapes
// are handled and the role falls back to the turn index order.
import type { Page } from "rebrowser-playwright-core";
import type { RawChat } from "./claude.ts";

export const CHATGPT_HOSTS = ["chatgpt.com", "chat.openai.com"];

const TURN_SEL =
  "article[data-testid^='conversation-turn'], [data-testid^='conversation-turn']";

// ChatGPT mounts conversation turns lazily, so a fixed wait captures whatever
// slice happened to render and two runs of the same URL disagree. Scroll to the
// top to force early turns to mount, then wait for the count to settle.
async function mountAllTurns(page: Page): Promise<void> {
  let prev = "";
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate((turnSel: string) => {
      const anchor = document.querySelector(turnSel);
      let box: Element | null = anchor;
      while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
      (box ?? (document.scrollingElement ?? document.body)).scrollTop = 0;
      return `${document.querySelectorAll(turnSel).length}|${(box ?? document.body).scrollHeight}`;
    }, TURN_SEL);
    if (state === prev) return;
    prev = state;
    await page.waitForTimeout(700);
  }
}

export async function extractChatgpt(page: Page, url: string): Promise<RawChat> {
  await page.waitForSelector(
    "[data-message-author-role], article[data-testid^='conversation-turn']",
    { timeout: 45_000 },
  );
  await mountAllTurns(page);

  const data = await page.evaluate((turnSel: string) => {
    // No functions may be declared inside this callback. tsx transpiles with
    // esbuild keepNames, which wraps them in a __name shim, and Playwright ships
    // fn.toString() into the page where __name does not exist.
    type Turn = { role: "user" | "assistant"; html: string; text: string };
    const turns: Turn[] = [];
    const drop = "script, style, noscript, template, nav, aside";

    const nodes = Array.from(document.querySelectorAll(turnSel));
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const authored = node.querySelector("[data-message-author-role]");
      const rawRole = authored?.getAttribute("data-message-author-role");
      // No author attribute: alternate user/assistant in DOM order.
      const role: Turn["role"] =
        rawRole === "user" || rawRole === "assistant"
          ? rawRole
          : turns.length % 2 === 0
            ? "user"
            : "assistant";

      const root = (authored ?? node).cloneNode(true) as HTMLElement;
      for (const bad of Array.from(root.querySelectorAll(drop))) bad.remove();
      const text = (root.textContent ?? "").replace(/[ \t]+\n/g, "\n").trim();
      if (text) turns.push({ role, html: root.innerHTML, text });
    }

    const title = (document.title || "ChatGPT chat")
      .replace(/\s*[-|]\s*ChatGPT$/i, "")
      .trim();
    return { title: title || "ChatGPT chat", turns };
  }, TURN_SEL);

  const convId = url.split("/").pop()?.split("?")[0] ?? "unknown";
  return {
    provider: "chatgpt",
    title: data.title,
    url,
    conv_id: convId,
    turns: data.turns,
  };
}
