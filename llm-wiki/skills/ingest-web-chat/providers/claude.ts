// Selectors lifted from revivalstack/ai-chat-exporter v3.1.0 (MIT).
// https://github.com/revivalstack/ai-chat-exporter
import type { Page } from "rebrowser-playwright-core";

export const CLAUDE_HOSTS = ["claude.ai"];

export interface RawTurn {
  role: "user" | "assistant";
  html: string;
  text: string;
}

export interface RawChat {
  provider: string;
  title: string;
  url: string;
  conv_id: string;
  turns: RawTurn[];
}

export async function extractClaude(page: Page, url: string): Promise<RawChat> {
  const messageSelector =
    ".font-claude-response:not(#markdown-artifact), [data-testid='user-message']";
  await page.waitForSelector(messageSelector, { timeout: 30_000 });
  // Let lazy content settle.
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => {
    const MESSAGE_SEL =
      ".font-claude-response:not(#markdown-artifact), [data-testid='user-message']";
    const USER_SEL = "[data-testid='user-message']";
    const THINKING_CLASS = "transition-all";
    const ARTIFACT_CELL = ".artifact-block-cell";

    const items = Array.from(document.querySelectorAll(MESSAGE_SEL));
    const turns: { role: "user" | "assistant"; html: string; text: string }[] =
      [];

    for (const item of items) {
      const isUser = (item as HTMLElement).matches(USER_SEL);
      let html = "";
      let text = "";
      if (isUser) {
        html = (item as HTMLElement).innerHTML;
        text = (item as HTMLElement).innerText.trim();
      } else {
        const wrapper = document.createElement("div");
        for (const child of Array.from(item.children)) {
          const cls = (child as HTMLElement).className || "";
          const isThinking =
            typeof cls === "string" && cls.includes(THINKING_CLASS);
          const isArtifact =
            (typeof cls === "string" &&
              cls.includes("pt-3") &&
              cls.includes("pb-3")) ||
            !!child.querySelector(ARTIFACT_CELL);
          if (isThinking || isArtifact) continue;
          const grid = child.querySelector(".grid-cols-1");
          if (grid) wrapper.appendChild(grid.cloneNode(true));
        }
        html = wrapper.innerHTML;
        text = wrapper.innerText.trim();
      }
      if (!text) continue;
      turns.push({ role: isUser ? "user" : "assistant", html, text });
    }

    const rawTitle = (document.title || "Claude chat").replace(
      /\s-\sClaude$/,
      "",
    );
    return { title: rawTitle.trim(), turns };
  });

  const convId = url.split("/").pop()?.split("?")[0] ?? "unknown";
  return {
    provider: "claude",
    title: data.title || "Claude chat",
    url,
    conv_id: convId,
    turns: data.turns,
  };
}
