# Plan 021: Harden OpenRouter key reading in ai-model.ts

## Status
- **Priority**: P1 — **Effort**: S — **Risk**: LOW
- **Depends on**: 019, 020 — **Category**: fix
- **Planned at**: integration branch `improve/product-upgrades` (post-020)

## Why this matters

A user hit `OpenRouter request failed (401): "Missing Authentication header"`. The
request sent an Authorization header but OpenRouter saw no usable token — i.e. the
`OPENROUTER_API_KEY` value was empty/whitespace or a stale module capture. This
hardens the AI service: read the key **inside** the function (no stale top-level
capture), **trim** it (kills whitespace/newline), and throw a clear
*"OPENROUTER_API_KEY is not set"* when it's missing/blank instead of a confusing
downstream 401.

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — EDIT: `src/server/services/ai-model.ts` (the only file).
OUT: everything else.

## Git workflow
`git checkout -b advisor-021 improve/product-upgrades`, then `pnpm install`.
Commit: `fix(ai): read+trim OPENROUTER_API_KEY at request time with a clear error`. Do NOT push.

## Step 1 — replace the ENTIRE contents of `src/server/services/ai-model.ts` with:

```ts
// AI text generation via OpenRouter (OpenAI-compatible chat completions).
// One request per call (stateless). Model configurable with OPENROUTER_MODEL.
export async function generateJsonContent(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set — add your OpenRouter key to .env (OPENROUTER_API_KEY=sk-or-...) and restart the dev server.'
    );
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
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

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `grep -n "process.env.OPENROUTER_API_KEY?.trim()" src/server/services/ai-model.ts` → 1
- [ ] `grep -n "is not set" src/server/services/ai-model.ts` → 1
- [ ] `git status` shows only `src/server/services/ai-model.ts` changed

## STOP conditions
- tsc errors on `process.env.X?.trim()` (should be fine — string | undefined).

## Maintenance notes
- Reading env at request time is the robust Next.js pattern; the value is no longer
  captured at module load. Trimming defends against a key with trailing whitespace.
- If a user still sees "Missing Authentication header" after this, their
  `OPENROUTER_API_KEY` value is wrong (placeholder/quoted/invalid) — a data problem,
  not a code one.
