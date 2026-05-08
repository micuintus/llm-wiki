---
title: Google Workspace integration
type: reference
updated: 2026-05-05
sources:
  - https://github.com/googleworkspace/cli
  - this session 2026-05-05 (install + auth + first successful API calls)
tags: [skill, google-workspace, install, gws, oauth]
---

# Google Workspace integration

Pi ↔ Google Workspace via the **official `gws` CLI** (`@googleworkspace/cli`, npm). Validated end-to-end on 2026-05-05: Drive read, Docs export to plaintext, Calendar agenda, Gmail triage and search all working from inside a Pi session.

## What it is

- `gws` from `github.com/googleworkspace/cli` — official Google org, but carries a "not an officially supported Google product" disclaimer (Google's standard boilerplate, same as `gcloud alpha`). No more-official Workspace CLI exists; alternatives (GAM, GAMADV-XTD3) are third-party.
- **Surface is not narrow** — earlier wiki claim was wrong. `gws` reads Google's Discovery Service at runtime and dynamically builds a CLI for *every* Workspace API: Drive, Gmail, Calendar, Docs, Sheets, Slides, Chat, Forms, Tasks, People, Keep, Meet, Classroom, Apps Script, Admin Reports, Workspace Events, Model Armor, plus `+helper` commands (`gmail +send`, `calendar +agenda`, `workflow +standup-report`, etc.).
- Output is structured JSON; designed for AI-agent consumption.
- **`gws` and `gcloud` are unrelated.** `gcloud` is only useful here for the optional `gws auth setup` flow that auto-creates a GCP project. With a pre-existing OAuth client (our case), `gcloud` is not needed at all.

## Install (validated path)

```bash
npm install -g @googleworkspace/cli       # binary lands as `gws`
gws --version                             # 0.22.5 at time of writing
```

Skills (44 of them, one per API + workflow recipes) ship inside the same repo under `skills/gws-*/SKILL.md`. Pi auto-loads any `SKILL.md` it finds in `~/.pi/skills/<name>/`.

**Do not** `pi install git:github.com/googleworkspace/cli` — the repo's `prepare` script invokes `lefthook` which is not on PATH and the install fails with npm error 127. Workaround: clone separately and symlink the skills.

```bash
git clone --depth 1 https://github.com/googleworkspace/cli \
  ~/.pi/agent/git/github.com/googleworkspace/cli-skills
for d in ~/.pi/agent/git/github.com/googleworkspace/cli-skills/skills/gws-*; do
  ln -sf "$d" ~/.pi/skills/$(basename "$d")
done
```

Update later with `git -C ~/.pi/agent/git/github.com/googleworkspace/cli-skills pull` — symlinks stay valid.

## Auth (manual OAuth flow, what worked here)

OAuth client was created by a colleague in an existing GCP project (`fx-ml-260911`) as **Desktop app** type. Flow:

1. Save the `client_secret.json` to `~/.config/gws/client_secret.json` (chmod 600).
2. `gws auth login -s drive,gmail,calendar,docs,sheets` — opens browser, OAuth consent, localhost callback.
3. Credentials stored encrypted (AES-256-GCM, key in macOS keyring) at `~/.config/gws/credentials.enc`.

Scope-pruning matters: unverified (testing-mode) OAuth apps are capped at ~25 scopes. The `recommended` preset has 85+ and will fail. Pass an explicit `-s` list of services.

## Two GCP-side prerequisites (both required)

When using someone else's OAuth client, two server-side checks gate every API call. Both 403 surface from Google's side, not the CLI's.

1. **IAM**: your Google account needs `roles/serviceusage.serviceUsageConsumer` (or any role with `serviceusage.services.use`) on the OAuth client's project. Without this every call returns "Caller does not have required permission to use project …". OAuth login still succeeds — only API calls 403.
2. **API enablement**: each Workspace API must be enabled on that project (Calendar, Gmail, Drive, Docs, Sheets independently). Symptom: `accessNotConfigured` / `SERVICE_DISABLED`. The `enable_url` in the error JSON is clickable.

The two failures are independent and can stack — fix one, then the next surfaces.

One-liner the project owner can run:
```bash
gcloud projects add-iam-policy-binding <project-id> \
  --member="user:<your-email>" \
  --role="roles/serviceusage.serviceUsageConsumer" \
&& gcloud services enable \
  calendar-json.googleapis.com gmail.googleapis.com \
  drive.googleapis.com docs.googleapis.com sheets.googleapis.com \
  --project=<project-id>
```

Also: account must be added under **Test users** on the OAuth consent screen, otherwise login (not just API calls) fails with "Access blocked".

## Useful command shapes

```bash
# Drive listing
gws drive files list --params '{"pageSize": 5}'

# Export a Doc as plain text — best path for "summarize this Doc" workflows
gws drive files export --params '{"fileId":"<id>","mimeType":"text/plain"}'
# writes to ./download.txt (yes, hardcoded filename in current version)

# Calendar
gws calendar +agenda --today
gws calendar +agenda --timezone Europe/Berlin

# Gmail recent non-bot mail (newer_than uses Gmail search syntax)
gws gmail users messages list --params \
  '{"userId":"me","q":"newer_than:21d -from:notifications@github.com -from:noreply -category:promotions","maxResults":30}'
# returns IDs only — fetch metadata per id with messages.get format=metadata
```

For "give me readable headers" the `messages.list` → `messages.get format=metadata` two-step is needed; there is no built-in mass-headers helper.

## Open questions

- Whether `download.txt` filename for `drive files export` is configurable (didn't see a flag).
- Whether the per-message metadata fetch can be parallelised through a single helper (current loop pattern is per-id, slow for large queries).
- Whether the bundled skills' triggers actually fire reliably in Pi or whether the system prompt needs an explicit nudge.

## See also

- [Local Pi Setup](../references/local-pi-setup.md)
- Project memory: `pi-setup-and-memory.md` (now references this page).
