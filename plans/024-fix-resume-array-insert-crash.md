# Plan 024: Validate AI resume output with zod (fixes "value.map is not a function")

## Status
- **Priority**: P0 (blocking — resume creation errors out) — **Effort**: S — **Risk**: LOW
- **Depends on**: 007 (createResume), 019 (OpenRouter) — **Category**: bug / robustness
- **Planned at**: integration branch `improve/product-upgrades` (post-023)

## Why this matters

Creating a resume throws `TypeError: value.map is not a function` from Drizzle's
`PgArray.mapToDriverValue` during `db.insert(resumes)`. The `resumes` columns
`skills`/`tools`/`languages`/`jobs`/`education` are Postgres `jsonb[]`; Drizzle
calls `.map` on whatever it's handed. `generateResumeContent` guards those fields
with `content.skills || []`, which only catches **falsy** values — so a **truthy
non-array** from the model (e.g. `skills` returned as a string or object) flows
into the insert and crashes.

Root cause: we trust the model's JSON *shape*. `response_format: json_object`
guarantees valid JSON, not the right structure, and we don't use structured-output/
tool-calling. The robust, model-agnostic fix is to **validate the parsed output with
zod** — coercing non-arrays to `[]` and normalizing stray string items — so
malformed AI output can never reach the DB. This kills the whole class of bug.

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — EDIT: `src/server/services/ai-resume.ts` (only). Fixing at the source means
the insert (`resume-router.ts`) always receives well-formed arrays; no router change
needed.
OUT: everything else. Do NOT change the DB schema, the prompt text, or the OpenRouter
call.

## Git workflow
`git checkout -b advisor-024 improve/product-upgrades`, then `pnpm install`.
Commit on `advisor-024`: `fix(resume): zod-validate AI output so malformed JSON can't crash the insert`. Do NOT push.

## Step 1 — import `z`

In `src/server/services/ai-resume.ts`, change:
```ts
import { ZodObject } from 'zod';
```
to:
```ts
import { z, ZodObject } from 'zod';
```

## Step 2 — add the validation schema

Insert this block immediately BEFORE the line
`export async function generateResumeContent(`:

```ts
// Lenient item schemas: accept a plain string OR an object and normalize to the
// expected { <name>, proficiency_level } shape; never throw (per-item .catch).
const skillItem = z
  .preprocess(
    (v) => (typeof v === 'string' ? { skill_name: v } : v),
    z.object({
      skill_name: z.string().catch(''),
      proficiency_level: z.string().catch('')
    })
  )
  .catch({ skill_name: '', proficiency_level: '' });

const toolItem = z
  .preprocess(
    (v) => (typeof v === 'string' ? { tool_name: v } : v),
    z.object({
      tool_name: z.string().catch(''),
      proficiency_level: z.string().catch('')
    })
  )
  .catch({ tool_name: '', proficiency_level: '' });

const languageItem = z
  .preprocess(
    (v) => (typeof v === 'string' ? { lang_name: v } : v),
    z.object({
      lang_name: z.string().catch(''),
      proficiency_level: z.string().catch('')
    })
  )
  .catch({ lang_name: '', proficiency_level: '' });

// Validates the model's JSON. Every field .catch()es to a safe default, so a
// non-array (or otherwise malformed) field becomes [] / {} instead of crashing.
const aiResumeSchema = z.object({
  personal_details: z
    .object({
      resume_job_title: z.string().catch(''),
      summary: z.string().catch('')
    })
    .partial()
    .catch({}),
  jobs: z.array(z.any()).catch([]),
  educations: z.array(z.any()).catch([]),
  skills: z.array(skillItem).catch([]),
  tools: z.array(toolItem).catch([]),
  languages: z.array(languageItem).catch([])
});
```

## Step 3 — validate the parsed output

Find this block:
```ts
  try {
    const responseText = await generateJsonContent(prompt);

    const content = JSON.parse(responseText) as TResumeEditFormValues;

    // Validate and ensure all required sections exist
    return {
      personal_details: {
        resume_job_title:
          content.personal_details?.resume_job_title || input.jd_job_title,
        fname: profile.firstname,
        lname: profile.lastname,
        email: profile.email,
        phone: profile.contactno,
        country: profile.country,
        city: profile.city,
        summary: content.personal_details?.summary || ''
      },
      jobs: content.jobs || [],
      educations: content.educations || [],
      skills: content.skills || [],
      tools: content.tools || [],
      languages: content.languages || []
    };
  } catch (error) {
    console.error('Error generating resume content:', error);
    throw error;
  }
```
Replace with:
```ts
  try {
    const responseText = await generateJsonContent(prompt);

    // Validate + normalize the model's JSON with zod so a malformed field
    // (e.g. a non-array skills value) can never crash the DB insert.
    const parsedResult = aiResumeSchema.safeParse(JSON.parse(responseText));
    const content = parsedResult.success
      ? parsedResult.data
      : aiResumeSchema.parse({});

    return {
      personal_details: {
        resume_job_title:
          content.personal_details?.resume_job_title || input.jd_job_title,
        fname: profile.firstname,
        lname: profile.lastname,
        email: profile.email,
        phone: profile.contactno,
        country: profile.country,
        city: profile.city,
        summary: content.personal_details?.summary || ''
      },
      jobs: content.jobs,
      educations: content.educations,
      skills: content.skills,
      tools: content.tools,
      languages: content.languages
    };
  } catch (error) {
    console.error('Error generating resume content:', error);
    throw error;
  }
```
(`JSON.parse` can still throw on non-JSON — that stays caught by the try/catch, which throws a clear error the server logs.)

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `grep -c "aiResumeSchema" src/server/services/ai-resume.ts` → ≥ 3 (2 defs/uses of schema + items)
- [ ] `grep -c "content.skills || \[\]" src/server/services/ai-resume.ts` → 0
- [ ] `grep -c "safeParse" src/server/services/ai-resume.ts` → 1
- [ ] `git status` shows only `src/server/services/ai-resume.ts` changed

## STOP conditions
- The find blocks don't match verbatim (file drifted) → STOP and report.
- tsc errors that the returned object no longer satisfies `TResumeEditFormValues`
  → STOP and report the exact type error (do not add `as any`).

## Maintenance notes
- This validates content once, at the boundary. `jobs`/`educations` stay `z.any()[]`
  (they're not inserted from AI in create — the profile provides them — but keeping
  them arrays is still correct for callers).
- **Optional future hardening (the "structured output" idea):** for models that
  support it, add `response_format: { type: 'json_schema', json_schema: … }` to the
  OpenRouter call in `ai-model.ts` to make the model emit schema-conforming JSON.
  Not all OpenRouter models support it, so the zod validation above remains the
  reliable, model-agnostic safety net either way.
- The same zod pattern could wrap `ats-analysis.ts` and `parse-profile.ts` output;
  those already coerce arrays/strings defensively, so it's lower priority.
