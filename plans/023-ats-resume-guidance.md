# Plan 023: ATS resume guidance module wired into the AI prompts

## Status
- **Priority**: P1 (requested) — **Effort**: S — **Risk**: LOW (prompt content only)
- **Depends on**: 008 (ATS analysis), 019 (OpenRouter) — **Category**: feature / AI quality
- **Planned at**: integration branch `improve/product-upgrades` (post-022)

## Why this matters

The maintainer wants the app's AI to produce genuinely ATS-friendly resumes, using
the best-practices from the MIT-licensed `paramchoudhary/resumeskills` agent skills.
Those skills are prompt-instruction markdown, not runtime data — so the correct
implementation is to distill their **content** into one guidance module and inject
it into the two AI prompts:
- **generation** (`ai-resume.ts`) — so generated resumes weave in JD keywords the ATS
  way and write quantified X-Y-Z achievement bullets;
- **scoring** (`ats-analysis.ts`) — so the ATS score uses real keyword-type buckets and
  required-vs-preferred weighting.

Formatting rules (no tables/columns/graphics) are the template's job and are already
satisfied by the ATS-safe template (templateFive), so they're not in the prompts.

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — CREATE: `src/server/services/resume-guidance.ts`.
IN — EDIT: `src/server/services/ai-resume.ts`, `src/server/services/ats-analysis.ts`
(each: one import + one prompt injection).
OUT: routers, schema, other files.

## Git workflow
`git checkout -b advisor-023 improve/product-upgrades`, then `pnpm install`.
Commit on `advisor-023`: `feat(ai): ATS resume-writing + scoring guidance in prompts`. Do NOT push.

## Step 1 — create `src/server/services/resume-guidance.ts`

```ts
// Resume-writing + ATS guidance distilled from the MIT-licensed
// paramchoudhary/resumeskills agent skills (resume-ats-optimizer,
// resume-bullet-writer, job-description-analyzer). Injected into the AI prompts so
// generated resumes are ATS-optimized and scoring uses real ATS criteria.

export const ATS_WRITING_GUIDELINES = `ATS & writing rules (follow strictly):
- Keywords: identify the job description's hard skills (tools, languages, certifications, methodologies), soft skills, and industry/domain terms. Weave the most important ones naturally into the summary, the skills and tools lists, and the experience bullets. Repeat each critical keyword 2-4 times across the resume — never keyword-stuff. Use the exact terms from the job description, not paraphrases.
- Summary: 3-5 sentences, front-loaded with the 5-8 most important keywords for the target role; highlight years of experience, top relevant skills, and 1-2 quantified achievements.
- Experience bullets: use the X-Y-Z formula — "Accomplished [X] as measured by [Y] by doing [Z]". Every bullet starts with a strong action verb (e.g. Led, Directed, Spearheaded, Built, Launched, Streamlined, Optimized, Reduced, Increased, Scaled, Resolved) and includes at least one quantified metric (%, $, count, or time) plus the scope (team size, users, budget). Never write duties ("Responsible for…", "Helped with…") — write achievements with impact. Keep bullets to 1-2 lines and naturally written.`;

export const ATS_SCORING_GUIDELINES = `Scoring method (apply consistently):
- Extract the job description's keywords into three buckets: hard skills (tools, languages, certifications, methodologies), soft skills, and industry/domain terms.
- Distinguish REQUIRED keywords ("must have", "required", "X years", listed under Requirements, or mentioned 3+ times) from PREFERRED ("nice to have", "bonus", "a plus", mentioned once).
- score = weighted keyword coverage on a 0-100 scale where REQUIRED keywords carry ~70% weight and PREFERRED ~30%. Bands: 90-100 overqualified, 75-89 excellent fit, 60-74 good fit, 50-59 stretch, below 50 under-qualified.
- matchedKeywords / missingKeywords: list REQUIRED keywords first.
- suggestions: concrete edits that insert missing REQUIRED keywords into the summary, the skills list, or a specific experience bullet.`;
```

## Step 2 — `ai-resume.ts`: import + inject into the generation prompt

Add the import near the top (with the other imports):
```ts
import { ATS_WRITING_GUIDELINES } from './resume-guidance';
```

Then find this block in the prompt template:
```ts
    Instructions:
    1. Create a compelling professional summary (3-5 sentences) that:
```
and replace it with (inject the guidelines just before Instructions):
```ts
    ${ATS_WRITING_GUIDELINES}

    Instructions:
    1. Create a compelling professional summary (3-5 sentences) that:
```

**Verify**: `pnpm exec tsc --noEmit` → 0.

## Step 3 — `ats-analysis.ts`: import + inject into the scoring prompt

Add the import at the top (after the existing import):
```ts
import { ATS_SCORING_GUIDELINES } from './resume-guidance';
```

Then find this line in the prompt:
```ts
Return a JSON object with EXACTLY these fields and nothing else:
```
and replace it with:
```ts
${ATS_SCORING_GUIDELINES}

Return a JSON object with EXACTLY these fields and nothing else:
```

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `src/server/services/resume-guidance.ts` exists and exports `ATS_WRITING_GUIDELINES` and `ATS_SCORING_GUIDELINES`
- [ ] `grep -c "ATS_WRITING_GUIDELINES" src/server/services/ai-resume.ts` → 2 (import + use)
- [ ] `grep -c "ATS_SCORING_GUIDELINES" src/server/services/ats-analysis.ts` → 2 (import + use)
- [ ] `git status` shows only the 3 in-scope files (1 new, 2 modified)

## STOP conditions
- The anchor lines (`Instructions:` in `ai-resume.ts`, `Return a JSON object with EXACTLY these fields and nothing else:` in `ats-analysis.ts`) don't match verbatim → STOP and report (files drifted).

## Maintenance notes
- Single source of truth for ATS guidance is `resume-guidance.ts`; edit it to tune
  behavior for both generate and score at once.
- Content-only change (prompts). Verified by types/lint; the maintainer confirms
  output quality by generating a resume against a real JD and checking the ATS score.
- Attribution to the MIT-licensed source is in the module's header comment.
