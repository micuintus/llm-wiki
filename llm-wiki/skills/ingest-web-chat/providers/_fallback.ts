// Generic fallback for providers without a dedicated extractor.
// Returns one bulk "assistant" turn with the full page HTML — no turn segmentation.
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
    provider,
    title: title.trim(),
    url,
    conv_id: convId,
    turns: [{ role: "assistant", html, text: "" }],
  };
}
