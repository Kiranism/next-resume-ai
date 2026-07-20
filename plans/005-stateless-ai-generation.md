# Plan 005: Stateless per-request AI generation (fix shared Gemini session)

## Status
- **Priority**: P1 — **Effort**: S — **Risk**: LOW
- **Depends on**: none — **Category**: correctness / privacy
- **Planned at**: commit `f464c9c`, 2026-07-21

## Why this matters

`src/server/services/google-ai-model.ts` exports a **single module-level Gemini
chat session** (`model.startChat({ history: [] })`) shared by every request and
every user. `startChat` accumulates conversation history, so each resume
generation appends one user's PII (name, email, phone, work history) to a history
that the next user's generation then sends to the model — a cross-user data-leak,
plus unbounded token growth and concurrency corruption on warm serverless
instances. Fix: generate statelessly per request with `model.generateContent`
(no shared session, no history). Also remove the two `console.log`s that dump the
prompt schema and the raw AI response (which contains resume PII).

## Commands
- Install: `pnpm install` → exit 0
- Typecheck: `pnpm exec tsc --noEmit` → exit 0
- Lint: `pnpm lint` → exit 0

## Scope
IN SCOPE:
- `src/server/services/google-ai-model.ts` (rewrite)
- `src/server/services/ai-resume.ts` (swap the call + remove 2 logs)
OUT OF SCOPE: routers, schema, anything else.

## Git workflow
Commit in the worktree. Conventional Commits, e.g.
`fix(ai): stateless per-request generation (no shared chat session)`. Do NOT push.

## Current state

`src/server/services/google-ai-model.ts` (full):

```tsx
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash'
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json'
};

export const AIChatSession = model.startChat({
  generationConfig,
  history: []
});
```

`src/server/services/ai-resume.ts` — the two relevant regions:

```tsx
import {
  resumeFormSchema,
  TResumeEditFormValues
} from '@/features/resume/utils/form-schema';
import { AIChatSession } from './google-ai-model';
```

```tsx
  console.log('schema strucutre', schemaStructure);
```

```tsx
  try {
    const result = await AIChatSession.sendMessage(prompt);
    const responseText = await result.response.text();
    console.log('AI Response:', responseText);

    const content = JSON.parse(responseText) as TResumeEditFormValues;
```

## Step 1 — Rewrite `src/server/services/google-ai-model.ts` with:

```tsx
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash'
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json'
};

// Stateless generation: a fresh call per request with no shared chat session or
// history. This prevents one user's prompt/PII from leaking into another user's
// request, and avoids unbounded history growth and concurrency corruption that a
// shared module-level `startChat` session causes on warm serverless instances.
export async function generateJsonContent(prompt: string): Promise<string> {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig
  });

  return result.response.text();
}
```

**Verify**: `pnpm exec tsc --noEmit` (will fail in ai-resume.ts until Step 2 —
that's expected; re-run after Step 2).

## Step 2 — Update `src/server/services/ai-resume.ts`

**2a.** Change the import. Replace:

```tsx
import { AIChatSession } from './google-ai-model';
```

with:

```tsx
import { generateJsonContent } from './google-ai-model';
```

**2b.** Remove the schema-structure log. Delete this line:

```tsx
  console.log('schema strucutre', schemaStructure);
```

**2c.** Swap the generation call and remove the AI-response log. Replace:

```tsx
  try {
    const result = await AIChatSession.sendMessage(prompt);
    const responseText = await result.response.text();
    console.log('AI Response:', responseText);

    const content = JSON.parse(responseText) as TResumeEditFormValues;
```

with:

```tsx
  try {
    const responseText = await generateJsonContent(prompt);

    const content = JSON.parse(responseText) as TResumeEditFormValues;
```

Leave the rest of the function (the `return { personal_details: … }` mapping and
the `catch` block) unchanged.

**Verify**:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `grep -rn "AIChatSession" src/server` → no matches
- `grep -rn "startChat" src/server` → no matches
- `grep -n "console.log" src/server/services/ai-resume.ts` → no matches

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -rn "AIChatSession" src/server` → no matches
- [ ] `grep -rn "startChat" src/server` → no matches
- [ ] `grep -rn "console.log" src/server/services/ai-resume.ts` → no matches
- [ ] `git status` shows only the two in-scope files modified

## STOP conditions
- Current file contents don't match the excerpts (drift).
- `model.generateContent(...)` typechecks incorrectly against the installed
  `@google/generative-ai` version (`^0.21.0`) — if the `contents`/`generationConfig`
  shape errors, STOP and report the exact type error (do not guess an alternate API).

## Maintenance notes
- Generation is now per-call and holds no state; safe under concurrency.
- `responseMimeType: 'application/json'` still asks Gemini for JSON, and
  `JSON.parse` remains guarded by the existing try/catch.
- Follow-up (separate plan): the create flow inserts the resume row before the AI
  call, so an AI failure leaves an orphan row — wrap insert+generate in a
  transaction or reorder. Also enforce `accounts.quotaLimit` here to cap paid
  generations per account.
