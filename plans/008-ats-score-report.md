# Plan 008: ATS score + keyword-gap report [D1]

## Status
- **Priority**: P1 — **Effort**: L — **Risk**: MED (new AI feature, 3 new files + 3 edits)
- **Depends on**: 005 (stateless AI helper `generateJsonContent`) — integrated
- **Category**: direction / feature
- **Planned at**: integration branch `improve/product-upgrades` (post-007)

## Why this matters

The product's whole pitch is "ATS-friendly," but it gives the user **no ATS
feedback** — no score, no keyword analysis. This plan adds an on-demand **ATS
Match Report**: given a saved resume and its stored job description, an LLM
returns a 0–100 match score, matched vs. missing keywords, a rationale, and
concrete suggestions — surfaced in a dialog in the editor. It reuses the
stateless generation helper from plan 005, so it inherits the no-cross-user-bleed
property. The report is framed honestly as an **estimate of keyword alignment**,
not a guarantee about any specific ATS.

## IMPORTANT — base your work on the integration branch first

The fresh worktree starts at an old base. Before editing, run:

```
git checkout -b advisor-008 improve/product-upgrades
```

Then `pnpm install`. Commit on `advisor-008`. The "Current state" excerpts below
match AFTER this checkout.

## Commands
- `pnpm install` → 0 (build-gate workaround allowed, uncommitted)
- `pnpm exec tsc --noEmit` → 0
- `pnpm lint` → 0
- `pnpm typecheck` → 0

## Scope
IN SCOPE (create):
- `src/server/services/ats-analysis.ts`
- `src/server/routers/ats-router.ts`
IN SCOPE (edit):
- `src/server/index.ts` (register the router)
- `src/features/resume/api/index.ts` (add a hook)
- `src/features/resume/components/ats-report-dialog.tsx` (create)
- `src/features/resume/components/resume-edit-content.tsx` (mount the dialog — one import + one JSX insertion)

OUT OF SCOPE: schema, other routers, the templates, pdf-renderer.

## Git workflow
Commit on `advisor-008`, e.g. `feat(ats): on-demand ATS match report`. Do NOT push.

## Step 1 — `src/server/services/ats-analysis.ts` (create)

```tsx
import { generateJsonContent } from './google-ai-model';

export type AtsReport = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  rationale: string;
  suggestions: string[];
};

export async function analyzeResumeAts(input: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
}): Promise<AtsReport> {
  const prompt = `You are an ATS (Applicant Tracking System) keyword analyzer.
Compare the RESUME against the JOB DESCRIPTION and return ONLY a JSON object.

JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription}

RESUME (JSON):
${input.resumeText}

Return a JSON object with EXACTLY these fields and nothing else:
{
  "score": <integer 0-100: how well the resume matches the JD for ATS keyword screening>,
  "matchedKeywords": [<important JD skills/keywords that ARE present in the resume>],
  "missingKeywords": [<important JD skills/keywords that are MISSING from the resume>],
  "rationale": "<2-4 sentence explanation of the score>",
  "suggestions": [<3-5 concrete, specific edits that would raise the score>]
}
Be strict and realistic. This is an ESTIMATE of ATS keyword alignment, not a guarantee.`;

  const raw = await generateJsonContent(prompt);
  const parsed = JSON.parse(raw) as Partial<AtsReport>;

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    matchedKeywords: toStringArray(parsed.matchedKeywords),
    missingKeywords: toStringArray(parsed.missingKeywords),
    rationale: String(parsed.rationale ?? ''),
    suggestions: toStringArray(parsed.suggestions)
  };
}
```

## Step 2 — `src/server/routers/ats-router.ts` (create)

```tsx
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes } from '../db/schema';
import { analyzeResumeAts } from '../services/ats-analysis';

export const atsRouter = j.router({
  getReport: privateProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: and(
          eq(resumes.id, input.resumeId),
          eq(resumes.userId, user.id)
        )
      });

      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      const resumeText = JSON.stringify({
        personalDetails: resume.personalDetails,
        jobs: resume.jobs,
        education: resume.education,
        skills: resume.skills,
        tools: resume.tools,
        languages: resume.languages
      });

      const report = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resumeText
      });

      return c.json(report);
    })
});
```

## Step 3 — register the router in `src/server/index.ts`

Add the import after the other router imports:

```tsx
import { atsRouter } from './routers/ats-router';
```

And add `ats: atsRouter` to the `mergeRouters` object. Change:

```tsx
const appRouter = j.mergeRouters(api, {
  user: userRouter,
  job: jobRouter,
  auth: authRouter,
  profile: profileRouter,
  resume: resumeRouter
});
```

to:

```tsx
const appRouter = j.mergeRouters(api, {
  user: userRouter,
  job: jobRouter,
  auth: authRouter,
  profile: profileRouter,
  resume: resumeRouter,
  ats: atsRouter
});
```

**Verify**: `pnpm exec tsc --noEmit` → 0 (the client type now knows `ats`).

## Step 4 — add the hook to `src/features/resume/api/index.ts`

At the end of the file (after `useUploadPreviewImage`), add:

```tsx
export const useAtsReport = (resumeId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['ats-report', resumeId],
    queryFn: async () => {
      const response = await client.ats.getReport.$get({ resumeId });
      return await response.json();
    },
    enabled: enabled && !!resumeId,
    staleTime: 60_000
  });
};
```

(`useQuery` and `client` are already imported at the top of this file.)

## Step 5 — `src/features/resume/components/ats-report-dialog.tsx` (create)

```tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useAtsReport } from '../api';

export function AtsReportDialog({ resumeId }: { resumeId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useAtsReport(resumeId, open);
  const report = data && !('error' in data) ? data : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          ATS Score
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>ATS Match Report</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className='flex items-center gap-2 py-8 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' /> Analyzing against the job
            description…
          </div>
        )}

        {isError && (
          <p className='py-8 text-sm text-destructive'>
            Could not analyze this resume. Please try again.
          </p>
        )}

        {report && (
          <div className='space-y-4'>
            <div className='flex items-baseline gap-2'>
              <span className='text-4xl font-bold'>{report.score}</span>
              <span className='text-muted-foreground'>/ 100 ATS match (estimate)</span>
            </div>

            {report.rationale && <p className='text-sm'>{report.rationale}</p>}

            {report.matchedKeywords.length > 0 && (
              <div>
                <p className='mb-1 text-sm font-semibold'>Matched keywords</p>
                <div className='flex flex-wrap gap-1'>
                  {report.matchedKeywords.map((k, i) => (
                    <Badge key={i} variant='secondary'>
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {report.missingKeywords.length > 0 && (
              <div>
                <p className='mb-1 text-sm font-semibold'>Missing keywords</p>
                <div className='flex flex-wrap gap-1'>
                  {report.missingKeywords.map((k, i) => (
                    <Badge key={i} variant='destructive'>
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {report.suggestions.length > 0 && (
              <div>
                <p className='mb-1 text-sm font-semibold'>Suggestions</p>
                <ul className='list-disc space-y-1 pl-5 text-sm'>
                  {report.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className='text-xs text-muted-foreground'>
              This is an AI estimate of keyword alignment, not a guarantee of how
              any specific ATS will parse your resume.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

If `@/components/ui/dialog` does not export exactly
`Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger`, STOP and
report the actual exports (do not guess).

## Step 6 — mount the dialog in `resume-edit-content.tsx`

Add the import near the other feature imports (after the `PdfRenderer` import line):

```tsx
import { AtsReportDialog } from '@/features/resume/components/ats-report-dialog';
```

Then, in the desktop split view, add a header row above the preview `ScrollArea`.
Find this block (it exists after plan 002):

```tsx
          <ResizablePanel defaultSize={55} minSize={45}>
            <div className='h-full w-full'>
              <ScrollArea className='h-[calc(100vh)]'>
                <div className='relative flex h-full justify-center bg-accent pt-2'>
                  <div className='origin-top scale-90'>
                    <PdfRenderer
                      formData={formData}
                      templateId={selectedTemplate}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
```

Replace it with:

```tsx
          <ResizablePanel defaultSize={55} minSize={45}>
            <div className='h-full w-full'>
              <div className='flex justify-end p-2'>
                <AtsReportDialog resumeId={resume.id} />
              </div>
              <ScrollArea className='h-[calc(100vh-56px)]'>
                <div className='relative flex h-full justify-center bg-accent pt-2'>
                  <div className='origin-top scale-90'>
                    <PdfRenderer
                      formData={formData}
                      templateId={selectedTemplate}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
```

(`resume` is the component's prop and `resume.id` is a string.)

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] Files exist: `src/server/services/ats-analysis.ts`, `src/server/routers/ats-router.ts`, `src/features/resume/components/ats-report-dialog.tsx`
- [ ] `grep -n "ats: atsRouter" src/server/index.ts` → 1 match
- [ ] `grep -n "useAtsReport" src/features/resume/api/index.ts` → 1 match
- [ ] `grep -n "AtsReportDialog" src/features/resume/components/resume-edit-content.tsx` → 2 matches (import + usage)
- [ ] `git status` shows only the 6 in-scope files (3 new, 3 modified)

## STOP conditions
- The `resume-edit-content.tsx` block to replace doesn't match (you skipped the
  `advisor-008` checkout, or drift).
- `client.ats.getReport.$get` does not typecheck after Step 3 → the router isn't
  registered correctly; re-check Step 3 before proceeding.
- `@/components/ui/dialog` or `@/components/ui/badge` don't export the names used
  → STOP and report the actual exports.
- The jstack query return type makes `('error' in data)` a type error → STOP and
  report; do not cast with `any`.

## Maintenance notes
- The report is computed on demand and cached 60s per resume (react-query). It is
  NOT stored — if you later want to persist the last score, add a column and write
  it in the router.
- The analysis reuses `generateJsonContent` (stateless), so it counts toward
  Gemini usage; consider whether ATS analysis should also count against
  `accounts.quotaLimit` (currently only generation does).
- Scoring is an LLM estimate; keep the "estimate, not a guarantee" disclaimer in
  the UI. A future improvement is deterministic keyword extraction to complement
  the LLM score.
