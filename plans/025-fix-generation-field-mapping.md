# Plan 025: Make resume generation reliably populate skills / tools / languages

## Status
- **Priority**: P1 (reported bug — generated resumes come back with empty skills/languages) — **Effort**: S — **Risk**: LOW
- **Depends on**: 007 (createResume), 023 (ATS guidance), 024 (zod validation) — **Category**: bug / AI quality
- **Planned at**: integration branch `improve/product-upgrades` (post-024)

## Why this matters

When a user generates a resume, the skills / tools / languages sections come back
empty. Two root causes in `src/server/services/ai-resume.ts`:

1. The output contract handed to the model is built by `getSchemaStructure()`,
   which reflects Zod internals. The array sections (`skills`, `tools`,
   `languages`) are all `.optional()`, so the reflection unwraps `ZodOptional` to
   the raw `ZodArray` object and `JSON.stringify` then dumps Zod's internal `_def`
   structure instead of a clean `{ "skill_name": "string", "proficiency_level":
   "string" }` example. The model never sees the exact field names it must emit, so
   it guesses — and wrong keys map to nothing (and plan 024's validator then blanks
   them).
2. The instructions ask the model to "extract key skills and tools" — **languages
   is never requested at all**, so it's always empty.

Fix: replace the reflected schema with an **explicit, hand-authored JSON contract**
that names every field, and explicitly instruct the model to fill skills, tools,
**and** languages. The zod validator from plan 024 stays as the safety net.

Note (intentional, do NOT change): the resume's work experience and education come
from the candidate profile verbatim (`createResume` inserts `profile.jobs` /
`profile.educations`), not from the model — this is the "trustworthy generation"
choice so the AI never fabricates job history. The model only tailors the summary,
skills, tools, and languages. So the contract must tell the model NOT to return
jobs/education.

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — EDIT: `src/server/services/ai-resume.ts` (only).
OUT: everything else. Do NOT change `createResume`, the DB schema, the form schema,
or the zod validator added in plan 024.

## Git workflow
`git checkout -b advisor-025 improve/product-upgrades`, then `pnpm install`
(if `ERR_PNPM_IGNORED_BUILDS`, re-run with `--dangerously-allow-all-builds`; delete
any auto-generated stray `pnpm-workspace.yaml`, never commit it).
Commit on `advisor-025`: `fix(ai): explicit output contract so generation fills skills/tools/languages`. Do NOT push.

## Step 1 — remove the reflected-schema helper and its now-dead imports

Delete the `getSchemaStructure` function in its entirety (the block that starts with
`function getSchemaStructure(schema: ZodObject<any>) {` and ends at its closing
`}` before the `// Lenient item schemas` comment):
```ts
function getSchemaStructure(schema: ZodObject<any>) {
  const shape = schema.shape;
  return JSON.stringify(
    shape,
    (key, value) => {
      if (value?._def?.typeName === 'ZodObject') {
        return getSchemaStructure(value);
      }
      if (value?._def?.typeName === 'ZodArray') {
        return [getSchemaStructure(value._def.type)];
      }
      if (value?._def?.typeName === 'ZodString') {
        return 'string';
      }
      if (value?._def?.typeName === 'ZodOptional') {
        return value._def.innerType._def.typeName === 'ZodString'
          ? 'string'
          : value._def.innerType;
      }
      return value;
    },
    2
  );
}

```

Then remove the two imports that are now unused. Change:
```ts
import { resumeEditFormSchema } from '@/features/resume/utils/form-schema';
import { z, ZodObject } from 'zod';
```
to:
```ts
import { z } from 'zod';
```
(Leave the other imports — `resumeFormSchema`, `TResumeEditFormValues`, `Profile`
— exactly as they are; they are pre-existing and out of scope.)

## Step 2 — remove the reflected-schema variable

In `generateResumeContent`, delete this line:
```ts
  const schemaStructure = getSchemaStructure(resumeEditFormSchema);
```

## Step 3 — replace the Instructions block with an explicit contract

Find this block:
```ts
    Instructions:
    1. Create a compelling professional summary (3-5 sentences) that:
       - Highlights the candidate's years of experience
       - Emphasizes relevant skills for the target position
       - Showcases key achievements from work history
       - Aligns with the job description requirements
    2. Extract key skills and tools from both the job description and work history
    3. Format all dates as YYYY-MM-DD
    4. Structure the response as a JSON object matching exactly this schema:
    ${schemaStructure}

    The professional summary should be included in personal_details.summary and must be at least 3 characters long.
    Focus on making the summary impactful and relevant to the target position.
```
Replace with:
```ts
    Instructions:
    1. Write a compelling professional summary (3-5 sentences) in
       personal_details.summary that highlights years of experience, emphasizes the
       skills most relevant to the target position, showcases key achievements from
       the work history, and aligns with the job description. Set
       personal_details.resume_job_title to the target job title.
    2. Populate ALL of the sections below from the job description and the work
       history — never leave them empty:
       - skills: 8-14 of the most relevant hard and soft skills for the target role.
         Use the job description's exact terminology where it matches.
       - tools: 5-10 concrete tools, technologies, frameworks, or platforms relevant
         to the role.
       - languages: spoken/human languages the candidate likely knows (e.g. English).
         If none can be reasonably inferred, use an empty array — never invent.
    3. Do NOT return work experience or education — those come from the candidate
       profile, not from you.
    4. Return ONLY a JSON object with EXACTLY these field names and this shape:
    {
      "personal_details": {
        "resume_job_title": "string",
        "summary": "string"
      },
      "skills": [
        { "skill_name": "string", "proficiency_level": "Beginner | Intermediate | Advanced | Expert" }
      ],
      "tools": [
        { "tool_name": "string", "proficiency_level": "Beginner | Intermediate | Advanced | Expert" }
      ],
      "languages": [
        { "lang_name": "string", "proficiency_level": "Basic | Conversational | Fluent | Native" }
      ]
    }
```

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `grep -c "getSchemaStructure" src/server/services/ai-resume.ts` → 0
- [ ] `grep -c "schemaStructure" src/server/services/ai-resume.ts` → 0
- [ ] `grep -c "ZodObject" src/server/services/ai-resume.ts` → 0
- [ ] `grep -c "resumeEditFormSchema" src/server/services/ai-resume.ts` → 0
- [ ] `grep -c "skill_name" src/server/services/ai-resume.ts` → ≥ 2 (contract + validator)
- [ ] `grep -c "lang_name" src/server/services/ai-resume.ts` → ≥ 2
- [ ] `git status` shows only `src/server/services/ai-resume.ts` changed

## STOP conditions
- Any find block does not match verbatim (file drifted) → STOP and report which.
- Removing `ZodObject` / `resumeEditFormSchema` causes a tsc "cannot find name" error
  (something else uses them) → STOP and report; do not re-add without checking.

## Test plan
- No unit tests exist for this service. Manual: with `OPENROUTER_API_KEY` set, create a
  resume against a real JD; confirm the editor's Skills, Tools, and Languages sections
  are populated with sensibly-tailored items and correct proficiency labels.

## Maintenance notes
- The output contract is now an explicit literal in the prompt — when later plans add
  new resume sections (certifications, projects), extend this contract with the new
  field names and add a matching instruction bullet.
- Keeps plan 024's zod validator as the safety net; the two work together (contract
  makes the model emit the right shape; validator guarantees it even if the model slips).
