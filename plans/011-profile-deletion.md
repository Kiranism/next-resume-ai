# Plan 011: Profile deletion (with FK-cascade)

## Status
- **Priority**: P2 — **Effort**: S-M — **Risk**: MED (destructive; must delete dependents in order)
- **Depends on**: 004 (ownership) — **Category**: feature
- **Planned at**: integration branch `improve/product-upgrades` (post-010)

## Why this matters
There is no way to delete a profile. A profile has dependent `resumes`, `jobs`, and
`educations`; `resumes`/`jobs` have **no** FK cascade and `resumes` reference the
profile, so a naive delete FK-violates. This adds an owner-scoped `deleteProfile`
that removes dependents in a transaction, plus a delete button (with confirm) on
each profile card.

## IMPORTANT — base on integration branch
`git checkout -b advisor-011 improve/product-upgrades`, then `pnpm install`. Commit on `advisor-011`.

## Commands
`pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — EDIT: `src/server/routers/profile-router.ts`, `src/features/profile/api/index.ts`,
`src/features/profile/components/profile-list.tsx`.
IN — CREATE: `src/features/profile/components/profile-delete-button.tsx`.
OUT: resume-router, schema, other files.

## Step 1 — `profile-router.ts`
Change the schema import line:
```tsx
import { profiles } from '../db/schema';
```
to:
```tsx
import { profiles, resumes } from '../db/schema';
```
(`and`, `eq`, `jobs`, `educations`, `z`, `db` are already imported.)

Then find the end of the `updateProfile` procedure and the router close:
```tsx
        return c.json(completeProfile);
      });
    })
});
```
Replace with (add `deleteProfile` before the router close):
```tsx
        return c.json(completeProfile);
      });
    }),

  deleteProfile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { id } = input;

      const owned = await db.query.profiles.findFirst({
        where: eq(profiles.id, id)
      });
      if (!owned || owned.userId !== user.id) {
        return c.json({ error: 'Not found' }, 404);
      }

      // Delete dependents first (resumes + jobs have no FK cascade), then the
      // profile itself. Wrapped in a transaction so it is all-or-nothing.
      await db.transaction(async (tx) => {
        await tx.delete(resumes).where(eq(resumes.profileId, id));
        await tx.delete(jobs).where(eq(jobs.profileId, id));
        await tx.delete(educations).where(eq(educations.profileId, id));
        await tx
          .delete(profiles)
          .where(and(eq(profiles.id, id), eq(profiles.userId, user.id)));
      });

      return c.json({ id });
    })
});
```

## Step 2 — `src/features/profile/api/index.ts`: append
```tsx
export const useDeleteProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.profile.deleteProfile.$post({ id });
      return await response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    }
  });
};
```
(`useMutation`, `useQueryClient`, `client` are already imported.)

## Step 3 — create `src/features/profile/components/profile-delete-button.tsx`
```tsx
'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useDeleteProfile } from '../api';

export function ProfileDeleteButton({ profileId }: { profileId: string }) {
  const { mutateAsync: deleteProfile, isPending } = useDeleteProfile();

  const handleDelete = async () => {
    try {
      await deleteProfile(profileId);
      toast.success('Profile deleted');
    } catch {
      toast.error('Could not delete profile');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-muted-foreground hover:text-destructive'
          disabled={isPending}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the profile and every resume, job, and
            education entry created from it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## Step 4 — `profile-list.tsx`: add the button to each profile card
Add the import (with the others near the top):
```tsx
import { ProfileDeleteButton } from './profile-delete-button';
```
Find the card's `<CardHeader>` block:
```tsx
            <CardHeader>
              <CardTitle>
                {profile.firstname} {profile.lastname}
              </CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
```
Replace with:
```tsx
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle>
                    {profile.firstname} {profile.lastname}
                  </CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                </div>
                <ProfileDeleteButton profileId={profile.id} />
              </div>
            </CardHeader>
```

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `grep -n "deleteProfile" src/server/routers/profile-router.ts` → ≥1
- [ ] `grep -n "useDeleteProfile" src/features/profile/api/index.ts` → 1
- [ ] `src/features/profile/components/profile-delete-button.tsx` exists
- [ ] `grep -c "ProfileDeleteButton" src/features/profile/components/profile-list.tsx` → 2
- [ ] `git status` shows only the 4 in-scope files

## STOP conditions
- The `profile-router.ts` router-close block or the `profile-list.tsx` CardHeader
  block doesn't match (skipped checkout / drift).
- `@/components/ui/alert-dialog` exports differ from those used → report actual exports.

## Maintenance notes
- Hard delete of dependents; no undo. `educations` already cascades on profile
  delete, but we delete it explicitly too for clarity/safety.
- If soft-delete is wanted later, add `deletedAt` instead of `tx.delete`.
