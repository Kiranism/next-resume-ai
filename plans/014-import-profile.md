# Plan 014: Import → profile (paste text → AI parse) [D2]

## Status
- **Priority**: P1 — **Effort**: L — **Risk**: MED (new AI flow; inserts data)
- **Depends on**: 005 (stateless AI), 011 (profile-router/list already extended) — **Category**: direction / feature
- **Planned at**: integration branch `improve/product-upgrades` (post-011)

## Why this matters
Profiles are manual-entry only — users must retype their whole history. This adds
**paste-text import**: paste a resume/CV → an LLM parses it into a profile
(name/contact/jobs/education) → a profile is created you can then review and edit.
This is the paste-text half of the maintainer's import ask; **PDF/DOCX upload is a
deliberate follow-up** (needs client-side extraction or Gemini multimodal — see
Maintenance notes). Reuses the stateless `generateJsonContent` from plan 005.

## IMPORTANT — base on integration branch (AFTER plan 011 is integrated)
`git checkout -b advisor-014 improve/product-upgrades`, then `pnpm install`.
This plan assumes plan 011 has landed (profile-router has `deleteProfile`,
profile-list has a delete button). Commit on `advisor-014`.

## Commands
`pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — CREATE: `src/server/services/parse-profile.ts`,
`src/features/profile/components/import-profile-dialog.tsx`.
IN — EDIT: `src/server/routers/profile-router.ts`,
`src/features/profile/api/index.ts`,
`src/features/profile/components/profile-list.tsx`.
OUT: schema, resume routers, everything else.

## Step 1 — create `src/server/services/parse-profile.ts`
```tsx
import { generateJsonContent } from './google-ai-model';

export type ParsedProfile = {
  firstname: string;
  lastname: string;
  email: string;
  contactno: string;
  country: string;
  city: string;
  jobs: {
    jobTitle: string;
    employer: string;
    description: string;
    startDate: string;
    endDate: string;
    city: string;
  }[];
  educations: {
    school: string;
    degree: string;
    field: string;
    description: string;
    startDate: string;
    endDate: string;
    city: string;
  }[];
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export async function parseResumeToProfile(text: string): Promise<ParsedProfile> {
  const prompt = `Extract structured resume/CV data from the text below and return ONLY a JSON object.

RESUME TEXT:
${text}

Return JSON with EXACTLY this shape. Use an empty string "" for anything not found. Format all dates as YYYY-MM-DD (use "" if unknown):
{
  "firstname": "", "lastname": "", "email": "", "contactno": "", "country": "", "city": "",
  "jobs": [{ "jobTitle": "", "employer": "", "description": "", "startDate": "", "endDate": "", "city": "" }],
  "educations": [{ "school": "", "degree": "", "field": "", "description": "", "startDate": "", "endDate": "", "city": "" }]
}`;

  const raw = await generateJsonContent(prompt);
  const p = JSON.parse(raw) as Record<string, unknown>;

  const jobsIn = Array.isArray(p.jobs) ? (p.jobs as Record<string, unknown>[]) : [];
  const eduIn = Array.isArray(p.educations)
    ? (p.educations as Record<string, unknown>[])
    : [];

  return {
    firstname: str(p.firstname),
    lastname: str(p.lastname),
    email: str(p.email),
    contactno: str(p.contactno),
    country: str(p.country),
    city: str(p.city),
    jobs: jobsIn.map((j) => ({
      jobTitle: str(j.jobTitle),
      employer: str(j.employer),
      description: str(j.description),
      startDate: str(j.startDate),
      endDate: str(j.endDate),
      city: str(j.city)
    })),
    educations: eduIn.map((e) => ({
      school: str(e.school),
      degree: str(e.degree),
      field: str(e.field),
      description: str(e.description),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      city: str(e.city)
    }))
  };
}
```

## Step 2 — `profile-router.ts`: add the `importProfile` procedure + import the service
Add the service import with the other imports at the top:
```tsx
import { parseResumeToProfile } from '../services/parse-profile';
```
Then find the router opening and its first procedure:
```tsx
export const profileRouter = j.router({
  getProfiles: privateProcedure.query(async ({ c, ctx }) => {
```
Insert `importProfile` as the first procedure, right after the opening `{`:
```tsx
export const profileRouter = j.router({
  importProfile: privateProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const parsed = await parseResumeToProfile(input.text);

      return await db.transaction(async (tx) => {
        const [createdProfile] = await tx
          .insert(profiles)
          .values({
            id: nanoid(),
            userId: user.id,
            firstname: parsed.firstname || 'First name',
            lastname: parsed.lastname || 'Last name',
            email: parsed.email || 'unknown@example.com',
            contactno: parsed.contactno || '',
            country: parsed.country || '',
            city: parsed.city || ''
          })
          .returning();

        const validJobs = parsed.jobs.filter((j) => j.jobTitle || j.employer);
        if (validJobs.length > 0) {
          await tx.insert(jobs).values(
            validJobs.map((j) => ({
              profileId: createdProfile.id,
              jobTitle: j.jobTitle,
              employer: j.employer,
              description: j.description || null,
              startDate: j.startDate,
              endDate: j.endDate,
              city: j.city
            }))
          );
        }

        const validEdu = parsed.educations.filter((e) => e.school || e.degree);
        if (validEdu.length > 0) {
          await tx.insert(educations).values(
            validEdu.map((e) => ({
              profileId: createdProfile.id,
              school: e.school,
              degree: e.degree,
              field: e.field,
              description: e.description || null,
              startDate: e.startDate,
              endDate: e.endDate,
              city: e.city
            }))
          );
        }

        const complete = await tx.query.profiles.findFirst({
          where: (profiles, { eq }) => eq(profiles.id, createdProfile.id),
          with: { jobs: true, educations: true }
        });

        return c.json(complete);
      });
    }),

  getProfiles: privateProcedure.query(async ({ c, ctx }) => {
```
(`z`, `db`, `nanoid`, `profiles`, `jobs`, `educations` are already imported in this file.)

**Verify**: `pnpm exec tsc --noEmit` → 0.

## Step 3 — `src/features/profile/api/index.ts`: append the hook
```tsx
export const useImportProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const response = await client.profile.importProfile.$post({ text });
      return await response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    }
  });
};
```

## Step 4 — create `src/features/profile/components/import-profile-dialog.tsx`
```tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useImportProfile } from '../api';

export function ImportProfileDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { mutateAsync: importProfile, isPending } = useImportProfile();

  const handleImport = async () => {
    if (!text.trim()) return;
    try {
      const result = await importProfile(text);
      if (result && !('error' in result)) {
        toast.success('Profile imported — review and edit it below');
        setText('');
        setOpen(false);
      } else {
        toast.error('Could not import profile');
      }
    } catch {
      toast.error('Could not import profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>Import from text</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Import a profile from text</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground'>
          Paste your existing resume or CV text. We&apos;ll parse it into a profile
          you can review and edit.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Paste your resume text here…'
          className='min-h-[220px]'
        />
        <DialogFooter>
          <Button onClick={handleImport} disabled={isPending || !text.trim()}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isPending ? 'Parsing…' : 'Parse & Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Step 5 — `profile-list.tsx`: add the Import button above the grid
Add the import (with the other imports):
```tsx
import { ImportProfileDialog } from './import-profile-dialog';
```
Find this line:
```tsx
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
```
Insert an import bar immediately BEFORE it:
```tsx
      <div className='mb-4 flex justify-end'>
        <ImportProfileDialog />
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
```

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `src/server/services/parse-profile.ts` and `src/features/profile/components/import-profile-dialog.tsx` exist
- [ ] `grep -n "importProfile" src/server/routers/profile-router.ts` → ≥1
- [ ] `grep -n "useImportProfile" src/features/profile/api/index.ts` → 1
- [ ] `grep -c "ImportProfileDialog" src/features/profile/components/profile-list.tsx` → 2
- [ ] `git status` shows only the 5 in-scope files

## STOP conditions
- The `profileRouter`-opening anchor or the profile-list grid line doesn't match
  (skipped checkout / plan 011 not integrated / drift).
- `@/components/ui/dialog` / `@/components/ui/textarea` don't export the names used
  → report actual exports.
- The `.insert(profiles).values({...})` fails to typecheck → report the exact error.

## Maintenance notes
- Import creates a profile server-side with lenient coercion (bypasses the strict
  client `profileSchema`), so imperfect AI output still yields an editable profile
  rather than a validation error. The user reviews/fixes via the existing edit modal.
- **PDF/DOCX upload (next iteration):** extract text client-side with the already-
  installed `pdfjs-dist` (used by react-pdf), or send the file to Gemini via
  `generateContent` inlineData (multimodal), then feed the text to `importProfile`.
- Import does not count against `accounts.quotaLimit` (that gates resume generation,
  not profile creation) — revisit if abuse appears.
