# Plan 019: Switch AI generation from direct Gemini to OpenRouter

## Status
- **Priority**: P0 (fixes broken AI import/generation) — **Effort**: S — **Risk**: LOW
- **Depends on**: 005 (the `generateJsonContent` interface) — **Category**: fix / integration
- **Planned at**: integration branch `improve/product-upgrades` (post-018)

## Why this matters

All AI features (resume generation, ATS report, profile import) go through
`generateJsonContent` in `src/server/services/google-ai-model.ts`, which calls
Google's `@google/generative-ai` SDK with `GEMINI_API_KEY`. That path is failing
for the maintainer (profile import errors out). The maintainer has an **OpenRouter**
API key. OpenRouter is OpenAI-compatible and exposes many cheap models via one key,
so this swaps the single `generateJsonContent` implementation to call OpenRouter —
fixing every AI feature at once, with the model configurable via env.

This also **hardens** the call: lower temperature for deterministic JSON, strips
accidental ```` ```json ```` fences, and throws clear errors (which the server logs)
instead of failing opaquely.

## Model choice
- Default: **`openai/gpt-4o-mini`** — cheap, very reliable JSON/instruction-following.
- Configurable via `OPENROUTER_MODEL`; cheaper options: `google/gemini-2.0-flash-001`,
  `deepseek/deepseek-chat`.

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — REPLACE: `src/server/services/google-ai-model.ts` (keep the filename + the
`generateJsonContent` export so no other file changes).
IN — EDIT: `env.example.txt` (document the new env vars).
OUT: `ai-resume.ts`, `parse-profile.ts`, `ats-analysis.ts` (they import
`generateJsonContent` unchanged), routers, schema, package.json.

## Git workflow
`git checkout -b advisor-019 improve/product-upgrades`, then `pnpm install`.
Commit on `advisor-019`: `fix(ai): call OpenRouter instead of direct Gemini SDK`. Do NOT push.

## Step 1 — replace the ENTIRE contents of `src/server/services/google-ai-model.ts` with:

```ts
// AI text generation via OpenRouter (OpenAI-compatible chat completions).
// One request per call (stateless). The model is configurable with
// OPENROUTER_MODEL; default is a cheap, reliable JSON-capable model.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

export async function generateJsonContent(prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise data-extraction assistant. Respond with a single valid JSON object only — no markdown code fences and no commentary.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `OpenRouter request failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty response');
  }

  // Strip accidental code fences if a model ignores response_format.
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}
```

## Step 2 — `env.example.txt`: document the new vars

Add these lines (near the old `GEMINI_API_KEY=` line; you may leave GEMINI_API_KEY
in place for reference):

```
OPENROUTER_API_KEY=

# Optional — defaults to openai/gpt-4o-mini. Cheaper: google/gemini-2.0-flash-001, deepseek/deepseek-chat
OPENROUTER_MODEL=
```

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0
- [ ] `pnpm lint` → 0
- [ ] `pnpm typecheck` → 0
- [ ] `grep -n "openrouter.ai/api/v1/chat/completions" src/server/services/google-ai-model.ts` → 1
- [ ] `grep -n "GoogleGenerativeAI\|@google/generative-ai" src/server/services/google-ai-model.ts` → 0 (SDK no longer used there)
- [ ] `grep -n "OPENROUTER_API_KEY" env.example.txt` → 1
- [ ] `git status` shows only `google-ai-model.ts` and `env.example.txt` changed

## STOP conditions
- tsc errors on `fetch`/`Response` types → the TS lib config lacks DOM/fetch types;
  STOP and report (Next.js server code has global `fetch`, so this shouldn't happen).

## Maintenance notes
- **The maintainer must set `OPENROUTER_API_KEY` in `.env`** (and restart `pnpm dev`)
  for AI features to work. Optionally set `OPENROUTER_MODEL`.
- The file is still named `google-ai-model.ts` to avoid touching its importers; it
  no longer uses Google's SDK. Rename to `ai-model.ts` + update the 3 importers
  (`ai-resume.ts`, `parse-profile.ts`, `ats-analysis.ts`) in a later cleanup, and
  drop the now-unused `@google/generative-ai` dependency then.
- If a chosen `OPENROUTER_MODEL` doesn't support `response_format: json_object`,
  the fence-stripping + the "JSON only" prompt still usually yield parseable JSON;
  prefer models that support structured output.
- Errors now throw with a clear message (logged by the server `onError`), so future
  failures are diagnosable from the dev terminal.
