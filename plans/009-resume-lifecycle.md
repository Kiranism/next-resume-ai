# Plan 009: Resume lifecycle — delete + duplicate [D4]

## Status
- **Priority**: P1 — **Effort**: M — **Risk**: LOW-MED (adds a destructive action; ownership-scoped)
- **Depends on**: 004 (ownership), 008 (editor header) — integrated
- **Category**: direction / feature
- **Planned at**: integration branch `improve/product-upgrades` (post-008)

## Why this matters

There is **no way to delete or duplicate a resume** anywhere in the app
(CRUD-minus-delete). Users accumulate resumes with no management. This plan adds
owner-scoped `deleteResume` and `duplicateResume` endpoints and surfaces
Duplicate + Delete (with a confirm) in the editor header next to the ATS button.
("Re-tailor for a new JD" is intentionally deferred — it's `createResume` with the
same `profileId` and a new JD, i.e. a create-flow convenience, not a new route.)

## IMPORTANT — base your work on the integration branch first
Run in the worktree before editing:
```
git checkout -b advisor-009 improve/product-upgrades
```
Then `pnpm install`. Commit on `advisor-009`. Excerpts below match AFTER checkout.

## Commands
- `pnpm install` → 0 (build-gate workaround allowed, uncommitted)
- `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN SCOPE (edit): `src/server/routers/resume-router.ts`,
`src/features/resume/api/index.ts`,
`src/features/resume/components/resume-edit-content.tsx`.
IN SCOPE (create): `src/features/resume/components/resume-actions.tsx`.
OUT OF SCOPE: profile deletion (FK-cascade complexity — separate plan), schema,
other routers, the list page.

## Git workflow
Commit on `advisor-009`, e.g. `feat(resume): delete and duplicate a resume`. Do NOT push.

## Step 1 — `src/server/routers/resume-router.ts`: append two procedures

The router currently ends like this (the `uploadPreviewImage` procedure, then the
closing `});`):

```tsx
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    })
});
```

Replace **only** that closing `    })\n});` with the following (turn it into a
comma, then add the two new procedures before the final `});`):

```tsx
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    }),

  // Delete a resume (owner only)
  deleteResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const [deleted] = await db
        .delete(resumes)
        .where(and(eq(resumes.id, input.id), eq(resumes.userId, user.id)))
        .returning();

      if (!deleted) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ id: deleted.id });
    }),

  // Duplicate a resume (owner only)
  duplicateResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const source = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, user.id))
      });

      if (!source) {
        return c.json({ error: 'Not found' }, 404);
      }

      const [copy] = await db
        .insert(resumes)
        .values({
          id: nanoid(),
          userId: source.userId,
          profileId: source.profileId,
          jdJobTitle: source.jdJobTitle,
          employer: source.employer,
          jdPostDetails: source.jdPostDetails,
          personalDetails: source.personalDetails,
          jobs: source.jobs,
          education: source.education,
          skills: source.skills,
          tools: source.tools,
          languages: source.languages,
          previewImageUrl: source.previewImageUrl,
          updatedAt: new Date()
        })
        .returning();

      return c.json({ id: copy.id });
    })
});
```

(`z`, `and`, `eq`, `nanoid`, `resumes`, `db` are all already imported.)

**Verify**: `pnpm exec tsc --noEmit` → 0.

## Step 2 — `src/features/resume/api/index.ts`: append two hooks

At the END of the file add:

```tsx
export const useDeleteResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.resume.deleteResume.$post({ id });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });
};

export const useDuplicateResume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.resume.duplicateResume.$post({ id });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });
};
```

(`useMutation`, `useQueryClient`, `client` are already imported in this file.)

## Step 3 — create `src/features/resume/components/resume-actions.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Copy, Loader2, Trash2 } from 'lucide-react';
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
import { useDeleteResume, useDuplicateResume } from '../api';

export function ResumeActions({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const { mutateAsync: deleteResume, isPending: isDeleting } =
    useDeleteResume();
  const { mutateAsync: duplicateResume, isPending: isDuplicating } =
    useDuplicateResume();

  const handleDuplicate = async () => {
    try {
      const result = await duplicateResume(resumeId);
      if (result && 'id' in result && result.id) {
        toast.success('Resume duplicated');
        router.push(`/dashboard/resume/edit/${result.id}`);
      } else {
        toast.error('Could not duplicate resume');
      }
    } catch {
      toast.error('Could not duplicate resume');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResume(resumeId);
      toast.success('Resume deleted');
      router.push('/dashboard/resume');
    } catch {
      toast.error('Could not delete resume');
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={handleDuplicate}
        disabled={isDuplicating}
      >
        {isDuplicating ? (
          <Loader2 className='mr-1 h-4 w-4 animate-spin' />
        ) : (
          <Copy className='mr-1 h-4 w-4' />
        )}
        Duplicate
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant='destructive' size='sm' disabled={isDeleting}>
            <Trash2 className='mr-1 h-4 w-4' /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The resume will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

## Step 4 — mount it in `resume-edit-content.tsx`

Add the import after the `AtsReportDialog` import line:

```tsx
import { ResumeActions } from '@/features/resume/components/resume-actions';
```

Then find this header (added by plan 008):

```tsx
              <div className='flex justify-end p-2'>
                <AtsReportDialog resumeId={resume.id} />
              </div>
```

Replace it with:

```tsx
              <div className='flex justify-end gap-2 p-2'>
                <ResumeActions resumeId={resume.id} />
                <AtsReportDialog resumeId={resume.id} />
              </div>
```

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `grep -c "deleteResume\|duplicateResume" src/server/routers/resume-router.ts` → ≥ 2
- [ ] `grep -n "useDeleteResume" src/features/resume/api/index.ts` → 1 match
- [ ] `src/features/resume/components/resume-actions.tsx` exists
- [ ] `grep -c "ResumeActions" src/features/resume/components/resume-edit-content.tsx` → 2 (import + usage)
- [ ] `git status` shows only the 4 in-scope files (1 new, 3 modified)

## STOP conditions
- The router tail or the plan-008 header block doesn't match (skipped checkout / drift).
- `@/components/ui/alert-dialog` doesn't export the `AlertDialog*` names used → STOP and report actual exports.
- The duplicate `.insert(...).values({...})` fails to typecheck against the resumes insert type → STOP and report the exact error.

## Maintenance notes
- `deleteResume` hard-deletes; there is no soft-delete/undo. If undo is wanted
  later, add a `deletedAt` column instead of deleting.
- `duplicateResume` copies the row as-is (no new AI call, so it does not consume
  the generation quota). If duplicates should count against `accounts.quotaLimit`,
  add the same count check used in `createResume`.
- Follow-ups: profile deletion (needs cascading delete of its jobs/educations and
  a decision on its resumes), and a "Re-tailor" button (create flow with the
  profile preselected).
