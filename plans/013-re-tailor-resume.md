# Plan 013: Re-tailor a resume for a new JD

## Status
- **Priority**: P2 — **Effort**: S — **Risk**: LOW
- **Depends on**: 007 (create flow), 009 (editor header) — **Category**: feature
- **Planned at**: integration branch `improve/product-upgrades` (post-010)

## Why this matters
The core repeat-use loop — "take this profile and tailor a fresh resume to a
different job" — has no shortcut; you must restart the create flow and re-pick the
profile. This adds a **Re-tailor** button in the editor that jumps straight to the
JD step with the resume's profile preselected, via a `?profileId=` param the create
flow now honors.

## IMPORTANT — base on integration branch
`git checkout -b advisor-013 improve/product-upgrades`, then `pnpm install`. Commit on `advisor-013`.

## Commands
`pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — EDIT: `src/app/dashboard/resume/create/page.tsx`,
`src/app/dashboard/resume/create/create-resume-content.tsx`,
`src/features/resume/components/resume-edit-content.tsx`.
OUT: everything else.

## Step 1 — `create/page.tsx`: read the `profileId` search param
Replace:
```tsx
export default function CreateResumePage() {
  return <CreateResumeContent />;
}
```
with:
```tsx
export default async function CreateResumePage({
  searchParams
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const { profileId } = await searchParams;
  return <CreateResumeContent initialProfileId={profileId} />;
}
```

## Step 2 — `create-resume-content.tsx`: honor `initialProfileId`
Change the component signature:
```tsx
export default function CreateResumeContent() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
```
to:
```tsx
export default function CreateResumeContent({
  initialProfileId
}: {
  initialProfileId?: string;
}) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialProfileId ?? null
  );
```

The `useMultistepForm(...)` hook MUST be called **unconditionally** (React
rules-of-hooks — a conditional hook call is an ESLint error and fails `pnpm lint`).
So place the early return **AFTER** the existing
`const { steps, currentStepIndex, step, isFirstStep, isLastStep, back, next } = useMultistepForm([...]);`
block (right after its closing `]);`) and BEFORE the `return (` statement:
```tsx
  if (initialProfileId) {
    return (
      <PageContainer scrollable>
        <div className='flex flex-1 flex-col space-y-4'>
          <div className='mb-8'>
            <h1 className='mb-2 text-3xl font-bold'>Re-tailor Resume</h1>
            <p className='text-muted-foreground'>
              Enter a new job description to tailor this profile.
            </p>
          </div>
          <ResumeCreateForm profileId={initialProfileId} />
        </div>
      </PageContainer>
    );
  }
```
(Leave the rest of the multistep flow unchanged for the no-param case.)

## Step 3 — `resume-edit-content.tsx`: add the Re-tailor button
Add these imports (near the top, with the other imports):
```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
```
Then find the editor header (added by plans 008/009):
```tsx
              <div className='flex justify-end gap-2 p-2'>
                <ResumeActions resumeId={resume.id} />
                <AtsReportDialog resumeId={resume.id} />
              </div>
```
Replace with:
```tsx
              <div className='flex justify-end gap-2 p-2'>
                <Button asChild variant='outline' size='sm'>
                  <Link href={`/dashboard/resume/create?profileId=${resume.profileId}`}>
                    Re-tailor
                  </Link>
                </Button>
                <ResumeActions resumeId={resume.id} />
                <AtsReportDialog resumeId={resume.id} />
              </div>
```
(`resume.profileId` is a string on the `Resume` type.)

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `grep -n "initialProfileId" src/app/dashboard/resume/create/create-resume-content.tsx` → ≥2
- [ ] `grep -n "profileId=\${resume.profileId}" src/features/resume/components/resume-edit-content.tsx` → 1
- [ ] `git status` shows only the 3 in-scope files

## STOP conditions
- The header block or the `useMultistepForm` line doesn't match (skipped checkout / drift).
- `resume.profileId` is not a string on the `Resume` type → report.

## Maintenance notes
- Re-tailor reuses the existing `createResume` flow (which now enforces quota, per
  plan 007) — a re-tailor consumes one generation like any create.
- If profile deletion (plan 011) removed the profile, the `?profileId=` will 404 at
  generate time (profile-not-found) — acceptable.
