# Plan 026: Move profile create/edit from a modal to dedicated pages

## Status
- **Priority**: P1 (requested; unblocks the larger profile form) — **Effort**: M — **Risk**: MEDIUM (UI + routing + new endpoint)
- **Depends on**: none (independent of 025) — **Category**: refactor / UX
- **Planned at**: integration branch `improve/product-upgrades` (post-025)

## Why this matters

The profile create/edit form (`CreateProfileForm`) is a 4-step wizard rendered
inside a modal (`create-profile-modal.tsx`). It's about to grow (contact links,
certifications, projects), and a cramped modal wizard is poor UX. Convert it to
dedicated routes — matching how resumes already work
(`/dashboard/resume/create`, `/dashboard/resume/edit/[id]`):

- `/dashboard/profile/create` — create a new profile
- `/dashboard/profile/edit/[id]` — edit an existing one

The profile list navigates to these routes instead of opening a modal.

## Conventions to match (read these first)
- jstack procedures: `src/server/routers/profile-router.ts` — `privateProcedure`,
  input via `.input(z.object({...}))`, handler `async ({ c, ctx, input }) => { const { user } = ctx; … return c.json(...) }`, owner-scoping via `eq(profiles.userId, user.id)`.
- Client hooks: `src/features/profile/api/index.ts` — `useQuery`/`useMutation` around `client.profile.*`.
- Page pattern: `src/app/dashboard/resume/create/page.tsx` (thin server page rendering a client component + `metadata`).

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN:
- EDIT `src/server/routers/profile-router.ts` (add `getProfile`)
- EDIT `src/features/profile/api/index.ts` (add `useProfile`)
- EDIT `src/features/profile/components/create-profile-form.tsx` (closeModal → router navigation)
- EDIT `src/features/profile/components/profile-list.tsx` (modal → navigation)
- CREATE `src/app/dashboard/profile/create/page.tsx`
- CREATE `src/app/dashboard/profile/edit/[id]/page.tsx`
- CREATE `src/features/profile/components/edit-profile-content.tsx`
- DELETE `src/features/profile/components/create-profile-modal.tsx`
OUT: the resume feature, the DB schema, `scrollable-dialog.tsx` (leave it even though
it becomes unused — removing risks other refs; note for later cleanup). Do NOT change
the wizard steps/fields themselves — this plan only changes how the form is hosted.

## Git workflow
`git checkout -b advisor-026 improve/product-upgrades`, then `pnpm install`
(if `ERR_PNPM_IGNORED_BUILDS`, re-run with `--dangerously-allow-all-builds`; delete any
untracked auto-generated `pnpm-workspace.yaml`, never commit it).
Commit on `advisor-026`: `feat(profile): dedicated create/edit pages instead of a modal`. Do NOT push.

## Step 1 — add a `getProfile(id)` query (owner-scoped)

In `src/server/routers/profile-router.ts`, insert this procedure immediately AFTER
the `getProfiles` procedure (after its closing `}),` around line 92) and before
`createProfile`:

```ts
  getProfile: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const profile = (await db.query.profiles.findFirst({
        where: and(eq(profiles.id, input.id), eq(profiles.userId, user.id)),
        with: { jobs: true, educations: true }
      })) as ProfileWithRelations | undefined;

      // Returns null when not found or not owned by the caller (no IDOR).
      return c.json(profile ?? null);
    }),
```
`z`, `and`, `eq`, `db`, `profiles`, and `ProfileWithRelations` are already imported/
defined in this file (see `getProfiles`). Do not add new imports for these.

## Step 2 — add the `useProfile` hook

In `src/features/profile/api/index.ts`, add after `useProfiles`:

```ts
export const useProfile = (id: string) => {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const response = await client.profile.getProfile.$get({ id });
      return await response.json();
    },
    enabled: !!id
  });
};
```

## Step 3 — `CreateProfileForm`: navigate instead of closing a modal

In `src/features/profile/components/create-profile-form.tsx`:

3a. Add the router import after the existing `react-hook-form` / `sonner` imports
(top of file, with the other imports):
```ts
import { useRouter } from 'next/navigation';
```

3b. Remove `closeModal` from the props interface. Change:
```ts
interface CreateProfileFormProps {
  profile?: ProfileWithRelations;
  closeModal: () => void;
}
```
to:
```ts
interface CreateProfileFormProps {
  profile?: ProfileWithRelations;
}
```

3c. Remove `closeModal` from the destructured params. Change:
```ts
export default function CreateProfileForm({
  profile,
  closeModal
}: CreateProfileFormProps) {
```
to:
```ts
export default function CreateProfileForm({
  profile
}: CreateProfileFormProps) {
```

3d. Add the router right after that function's first hook lines. Find:
```ts
  const { mutateAsync: createProfile, isPending: isCreating } =
    useCreateProfile();
  const { mutateAsync: updateProfile, isPending: isUpdating } =
    useUpdateProfile();
```
and add a line immediately after it:
```ts
  const router = useRouter();
```

3e. Replace the modal-close on success. Find:
```ts
      closeModal();
    } catch (error) {
```
and replace with:
```ts
      router.push('/dashboard/profile');
      router.refresh();
    } catch (error) {
```

## Step 4 — the create page

Create `src/app/dashboard/profile/create/page.tsx`:
```tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CreateProfileForm from '@/features/profile/components/create-profile-form';

export const metadata: Metadata = {
  title: 'Create Profile | Next Resume Builder',
  description:
    'Create a new profile with your experience, education and details.'
};

export default function CreateProfilePage() {
  return (
    <div className='mx-auto max-w-3xl px-4 py-6'>
      <Link
        href='/dashboard/profile'
        className='mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='h-4 w-4' /> Back to profiles
      </Link>
      <h1 className='mb-6 text-2xl font-semibold'>Create New Profile</h1>
      <CreateProfileForm />
    </div>
  );
}
```

## Step 5 — the edit page + its client content

Create `src/features/profile/components/edit-profile-content.tsx`:
```tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ProfileWithRelations } from '@/server/routers/profile-router';
import { useProfile } from '../api';
import CreateProfileForm from './create-profile-form';

export default function EditProfileContent({ id }: { id: string }) {
  const { data: profile, isLoading } = useProfile(id);

  if (isLoading) {
    return <Skeleton className='h-[500px] w-full' />;
  }

  if (!profile) {
    return (
      <p className='text-sm text-muted-foreground'>
        Profile not found or you don&apos;t have access to it.
      </p>
    );
  }

  // Double-cast through `unknown`: the wire JSON serializes createdAt/updatedAt as
  // strings, not Date, so a single cast fails TS2352. This is the codebase's
  // convention for serialized profiles (see the old profile-list.tsx / resume feature).
  return <CreateProfileForm profile={profile as unknown as ProfileWithRelations} />;
}
```

Create `src/app/dashboard/profile/edit/[id]/page.tsx`:
```tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EditProfileContent from '@/features/profile/components/edit-profile-content';

export const metadata: Metadata = {
  title: 'Edit Profile | Next Resume Builder'
};

export default async function EditProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className='mx-auto max-w-3xl px-4 py-6'>
      <Link
        href='/dashboard/profile'
        className='mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='h-4 w-4' /> Back to profiles
      </Link>
      <h1 className='mb-6 text-2xl font-semibold'>Edit Profile</h1>
      <EditProfileContent id={id} />
    </div>
  );
}
```

## Step 6 — profile list navigates instead of opening a modal

Replace the ENTIRE contents of `src/features/profile/components/profile-list.tsx`
with:
```tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileWithRelations } from '@/server/routers/profile-router';
import { useRouter } from 'next/navigation';
import { useProfiles } from '../api';
import { ProfileDeleteButton } from './profile-delete-button';
import { ImportProfileDialog } from './import-profile-dialog';
import { PlusCircle } from 'lucide-react';

export default function ProfileList() {
  const router = useRouter();
  const { data: profiles, isLoading } = useProfiles();

  if (isLoading) {
    return <Skeleton className='h-[400px] w-full' />;
  }

  return (
    <>
      <div className='mb-4 flex justify-end'>
        <ImportProfileDialog />
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card
          onClick={() => router.push('/dashboard/profile/create')}
          className='flex cursor-pointer flex-col items-center justify-center border-2 border-dashed bg-gradient-to-br from-sidebar/60 to-sidebar p-8 hover:border-primary'
        >
          <div className='flex h-full flex-col items-center justify-center'>
            <PlusCircle className='mx-auto h-10 w-10' />
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              Create new profile
            </p>
          </div>
        </Card>

        {profiles?.map((profile) => (
          <Card
            key={profile.id}
            className='cursor-pointer bg-gradient-to-br from-sidebar/60 to-sidebar transition-all hover:border-primary'
            onClick={() => router.push(`/dashboard/profile/edit/${profile.id}`)}
          >
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle>
                    {profile.firstname} {profile.lastname}
                  </CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ProfileDeleteButton profileId={profile.id} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <div className='text-sm'>
                  <span className='font-medium'>Phone:</span>{' '}
                  {profile.contactno}
                </div>
                <div className='text-sm'>
                  <span className='font-medium'>Location:</span> {profile.city},{' '}
                  {profile.country}
                </div>
                <div className='text-sm'>
                  <span className='font-medium'>Experience:</span>{' '}
                  {profile?.jobs?.length} positions
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
```

## Step 7 — delete the modal component

Delete `src/features/profile/components/create-profile-modal.tsx` (use `git rm`).
Verify nothing else imports it: `grep -rn "create-profile-modal\|CreateProfileModal" src` → 0 matches.

## Verify → Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `test -f src/app/dashboard/profile/create/page.tsx` and `test -f src/app/dashboard/profile/edit/[id]/page.tsx` and `test -f src/features/profile/components/edit-profile-content.tsx`
- [ ] `test ! -f src/features/profile/components/create-profile-modal.tsx`
- [ ] `grep -rn "CreateProfileModal\|create-profile-modal" src` → 0 matches
- [ ] `grep -c "closeModal" src/features/profile/components/create-profile-form.tsx` → 0
- [ ] `grep -c "getProfile:" src/server/routers/profile-router.ts` → 1
- [ ] `grep -c "export const useProfile =" src/features/profile/api/index.ts` → 1
- [ ] `git status` shows only the in-scope files (4 edited, 3 created, 1 deleted)

## STOP conditions
- Any "find" block in Step 3 doesn't match verbatim (file drifted) → STOP, report which.
- tsc errors that `client.profile.getProfile.$get({ id })` isn't callable or the input
  typing is wrong → the jstack input wiring differs from assumption; STOP and report the
  exact error (do NOT add `as any`).
- `ProfileWithRelations` is not in scope in `profile-router.ts` → STOP and report (it is
  used by `getProfiles`, so it should be; if not, report where it's defined).

## Test plan (manual — this is UI/routing; tsc can't prove it works)
1. With the app running: Profiles list → click "Create new profile" → lands on
   `/dashboard/profile/create` (a full page, not a modal). Complete the wizard → on
   submit it navigates back to the profiles list and the new profile appears.
2. Click an existing profile card → lands on `/dashboard/profile/edit/[id]` with the
   form pre-filled → edit + submit → navigates back, changes persisted.
3. Clicking the delete (trash) button on a card deletes it and does NOT navigate.
4. Direct-load `/dashboard/profile/edit/<real-id>` (refresh) → loads pre-filled.
   Direct-load with a bogus id → shows "Profile not found".

## Maintenance notes
- The upcoming field-addition plans (links / certifications / projects) add steps to
  `CreateProfileForm`, which now lives on a roomy page — no modal-height constraints.
- `scrollable-dialog.tsx` (`Modal`) is now unused; safe to delete in a later cleanup
  once confirmed no other importers.
- The edit page fetches client-side via `useProfile` (matches the list's client data
  flow). If SSR/SEO of profiles is ever wanted, switch to a server fetch like the
  resume edit page.
