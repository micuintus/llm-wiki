// Generic fallback: run Defuddle in-page on the rendered DOM.
// Used for providers without a dedicated extractor (e.g. Le Chat, Gemini until selectors land).
import type { Page } from "rebrowser-playwright-core";
import type { RawChat } from "./claude.ts";

export async function extractFallback(
  page: Page,
  url: string,
  provider: string,
): Promise<RawChat> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const html = await page.content();
  const title = (await page.title()) || provider + " chat";
  const convId = url.split("/").pop()?.split("?")[0] ?? "unknown";

  // No turn segmentation in fallback — single "assistant" turn carrying the whole rendered HTML.
  // The user can re-run with a real provider extractor once one exists.
  return {
    provider: provider as "claude",
    title: title.trim(),
    url,
    conv_id: convId,
    turns: [{ role: "assistant", html, text: "" }],
  };
}
