// Bot-check and login-wall detection. A challenge page is still a page, so a
// bulk extractor happily turns it into a "chat" and the run reports success.
// Check before extracting and fail loudly instead.
//
// Only structural signals are used. Sniffing for auth URLs is unreliable:
// signed-in Gemini pages carry `accounts.google.com/ServiceLogin` inside a
// serialized account-menu blob and get misread as a sign-in wall.
import type { Page } from "rebrowser-playwright-core";

export class GateError extends Error {
  readonly hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.name = "GateError";
    this.hint = hint;
  }
}

// Cloudflare challenge pages carry one of these regardless of UI language.
const CHALLENGE_MARKERS = [
  "__cf_chl_opt",
  "challenge-platform/h/",
  "Enable JavaScript and cookies to continue",
];

// Present on a conversation page, whatever the provider.
const CONVERSATION_SELECTORS = [
  "[data-message-author-role]",
  "user-query",
  "share-turn-viewer",
  "message-content",
  "[data-testid^='conversation-turn']",
].join(",");

// Only these read as a sign-in form.
const LOGIN_SELECTORS = ["input[type='password']", "#identifierId", "[data-testid='login-button']"].join(",");

export async function assertNotGated(page: Page): Promise<void> {
  const url = page.url();
  const html = await page.content();

  const challenge = CHALLENGE_MARKERS.find((m) => html.includes(m));
  if (challenge) {
    throw new GateError(
      `Bot check at ${url} (matched ${challenge}).`,
      "The page is a Cloudflare challenge, not a conversation. Click the checkbox by hand in the CDP Chrome, then re-run. The clearance cookie usually keeps working for later runs.",
    );
  }

  const state = await page.evaluate((sel: { conv: string; login: string }) => ({
    conversation: document.querySelector(sel.conv) !== null,
    loginForm: document.querySelector(sel.login) !== null,
  }),
    { conv: CONVERSATION_SELECTORS, login: LOGIN_SELECTORS },
  );

  if (state.loginForm && !state.conversation) {
    throw new GateError(
      `Sign-in wall at ${url}.`,
      "Sign in to the provider in the CDP Chrome, then re-run. The session persists in that profile.",
    );
  }
}
