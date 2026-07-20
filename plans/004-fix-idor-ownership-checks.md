# Plan 004: Enforce resource ownership (fix IDOR) on resume & profile access

## Status
- **Priority**: P1 — **Effort**: M — **Risk**: MED (changes access control; must not lock owners out)
- **Depends on**: 003 recommended first (trustworthy `ctx.user`) but code-independent — **Category**: security
- **Planned at**: commit `f464c9c`, 2026-07-21

## Why this matters

Every resume/profile read and write fetches by ID with **no ownership check**, so
any signed-in user can read, overwrite, or destroy any other user's resumes and
profiles (which hold PII) just by supplying an ID. The data model already
supports the fix: `resumes.userId` and `profiles.userId` both reference
`accounts.id`, and `ctx.user` in every private procedure **is** the account row.
`src/app/dashboard/resume/page.tsx:43-64` already demonstrates the correct
ownership-scoped query — this plan applies that same discipline everywhere it's
missing. Fix pattern: filter by `and(eq(<table>.id, id), eq(<table>.userId, user.id))`
and return 404 when nothing matches (404, not 403, so we don't reveal that a
resource exists but isn't yours).

## Commands
- Install: `pnpm install` → exit 0
- Typecheck: `pnpm exec tsc --noEmit` → exit 0
- Lint: `pnpm lint` → exit 0

## Scope
IN SCOPE:
- `src/server/routers/resume-router.ts`
- `src/server/routers/profile-router.ts`
- `src/app/dashboard/resume/edit/[id]/page.tsx`

OUT OF SCOPE: jstack.ts (plan 003), services, schema, any frontend component,
`src/app/dashboard/resume/page.tsx` (already correct — read it as the reference
pattern, don't change it).

## Git workflow
Commit in the worktree. Conventional Commits, e.g.
`fix(security): enforce resume/profile ownership (IDOR)`. Do NOT push.

## Step 1 — `src/server/routers/resume-router.ts`

Imports already include `eq, desc, inArray, and` from `drizzle-orm` — no import
changes needed. Make these five edits.

**1a. `createResume`** — remove two PII `console.log`s and add a profile-ownership
check. Replace this exact block:

```tsx
      const { user } = ctx;
      const { profileId, ...resumeData } = input;

      console.log('user from ctx', user);

      // Get the account record first
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.externalId, user.externalId)
      });

      console.log('acccount', account);

      if (!account) {
        throw new Error('Account not found');
      }
```

with:

```tsx
      const { user } = ctx;
      const { profileId, ...resumeData } = input;

      // Get the account record first
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.externalId, user.externalId)
      });

      if (!account) {
        throw new Error('Account not found');
      }
```

Then replace this exact block:

```tsx
      if (!profile) {
        return c.json({ error: 'Profile not found' }, 404);
      }
```

with (ownership check so you can't generate a resume against someone else's
profile — which also spends an AI call):

```tsx
      if (!profile || profile.userId !== account.id) {
        return c.json({ error: 'Profile not found' }, 404);
      }
```

**1b. `getResume`** — replace the whole procedure:

```tsx
  // Get a resume by ID
  getResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      console.log('input', input);
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: eq(resumes.id, input.id)
      });

      return c.json(resume);
    }),
```

with:

```tsx
  // Get a resume by ID (owner only)
  getResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, user.id))
      });

      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json(resume);
    }),
```

**1c. `updateResume`** — replace the whole procedure:

```tsx
  // Update a resume
  updateResume: privateProcedure
    .input(
      z.object({
        id: z.string(),
        ...resumeEditFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(resumes)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(resumes.id, id))
        .returning();

      return c.json(updated);
    }),
```

with:

```tsx
  // Update a resume (owner only)
  updateResume: privateProcedure
    .input(
      z.object({
        id: z.string(),
        ...resumeEditFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(resumes)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
        .returning();

      if (!updated) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json(updated);
    }),
```

**1d. `getProfileResumes`** — replace the whole procedure:

```tsx
  // Get all resumes for a profile
  getProfileResumes: privateProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const profileResumes = await db.query.resumes.findMany({
        where: eq(resumes.profileId, input.profileId)
      });

      return c.json(profileResumes);
    }),
```

with:

```tsx
  // Get all resumes for a profile (owner only)
  getProfileResumes: privateProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const profileResumes = await db.query.resumes.findMany({
        where: and(
          eq(resumes.profileId, input.profileId),
          eq(resumes.userId, user.id)
        )
      });

      return c.json(profileResumes);
    }),
```

**1e. `uploadPreviewImage`** — replace the `.mutation(...)` body. Replace:

```tsx
    .mutation(async ({ c, ctx, input }) => {
      const { resumeId, image } = input;

      try {
        const imageUrl = await uploadImageToStorage(image);
        const [updated] = await db
          .update(resumes)
          .set({
            previewImageUrl: imageUrl,
            updatedAt: new Date()
          })
          .where(eq(resumes.id, String(resumeId)))
          .returning();

        return c.json(updated);
      } catch (error) {
        console.error('Error in uploadPreviewImage:', error);
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    })
```

with:

```tsx
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { resumeId, image } = input;

      try {
        const existing = await db.query.resumes.findFirst({
          where: and(
            eq(resumes.id, String(resumeId)),
            eq(resumes.userId, user.id)
          )
        });

        if (!existing) {
          return c.json({ error: 'Not found' }, 404);
        }

        const imageUrl = await uploadImageToStorage(image);
        const [updated] = await db
          .update(resumes)
          .set({
            previewImageUrl: imageUrl,
            updatedAt: new Date()
          })
          .where(
            and(eq(resumes.id, String(resumeId)), eq(resumes.userId, user.id))
          )
          .returning();

        return c.json(updated);
      } catch (error) {
        console.error('Error in uploadPreviewImage:', error);
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    })
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0;
`grep -n "console.log" src/server/routers/resume-router.ts` → no matches.

## Step 2 — `src/server/routers/profile-router.ts` (`updateProfile`)

Add an ownership pre-check and scope the profile update. Replace the start of the
`updateProfile` mutation. Replace:

```tsx
    .mutation(async ({ c, ctx, input }) => {
      const { id, ...inputData } = input;
      const { user } = ctx;

      return await db.transaction(async (tx) => {
        // Update the base profile
        const [updatedProfile] = await tx
          .update(profiles)
          .set({
            firstname: inputData.firstname,
            lastname: inputData.lastname,
            email: inputData.email,
            contactno: inputData.contactno,
            country: inputData.country,
            city: inputData.city,
            updatedAt: new Date()
          })
          .where(eq(profiles.id, id))
          .returning();
```

with:

```tsx
    .mutation(async ({ c, ctx, input }) => {
      const { id, ...inputData } = input;
      const { user } = ctx;

      // Ownership check: you may only update your own profile.
      const owned = await db.query.profiles.findFirst({
        where: eq(profiles.id, id)
      });
      if (!owned || owned.userId !== user.id) {
        return c.json({ error: 'Not found' }, 404);
      }

      return await db.transaction(async (tx) => {
        // Update the base profile
        const [updatedProfile] = await tx
          .update(profiles)
          .set({
            firstname: inputData.firstname,
            lastname: inputData.lastname,
            email: inputData.email,
            contactno: inputData.contactno,
            country: inputData.country,
            city: inputData.city,
            updatedAt: new Date()
          })
          .where(and(eq(profiles.id, id), eq(profiles.userId, user.id)))
          .returning();
```

Then update the imports at the top of `profile-router.ts`. It currently imports
`import { eq } from 'drizzle-orm';` — change that line to:

```tsx
import { and, eq } from 'drizzle-orm';
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0.

## Step 3 — `src/app/dashboard/resume/edit/[id]/page.tsx` (RSC ownership)

This page fetches a resume by ID with **no auth at all**. Add the same
account-scoped lookup used by `src/app/dashboard/resume/page.tsx`.

Change the imports. Replace:

```tsx
import { ResumeEditContent } from '@/features/resume/components/resume-edit-content';
import { db } from '@/server/db';
import { resumes } from '@/server/db/schema/resumes';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import EditResumeLoading from './loading';
import { Metadata } from 'next';
```

with:

```tsx
import { ResumeEditContent } from '@/features/resume/components/resume-edit-content';
import { db } from '@/server/db';
import { resumes } from '@/server/db/schema/resumes';
import { accounts } from '@/server/db/schema/accounts';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import EditResumeLoading from './loading';
import { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
```

Then replace this block:

```tsx
    const resumeId = (await params).id;

    if (!resumeId) {
      notFound();
    }

    const resume = await db.query.resumes.findFirst({
      where: eq(resumes.id, resumeId)
    });

    if (!resume) {
      notFound();
    }
```

with:

```tsx
    const resumeId = (await params).id;

    if (!resumeId) {
      notFound();
    }

    const auth = await currentUser();
    if (!auth) {
      notFound();
    }

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.externalId, auth.id)
    });
    if (!account) {
      notFound();
    }

    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.id, resumeId), eq(resumes.userId, account.id))
    });

    if (!resume) {
      notFound();
    }
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0; `pnpm lint` → exit 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -rn "console.log" src/server/routers/resume-router.ts` → no matches
- [ ] `grep -c "eq(resumes.userId, user.id)" src/server/routers/resume-router.ts` → at least 4
- [ ] `grep -n "owned.userId" src/server/routers/profile-router.ts` → 1 match
- [ ] `grep -n "eq(resumes.userId, account.id)" src/app/dashboard/resume/edit/[id]/page.tsx` → 1 match
- [ ] `git status` shows only the three in-scope files modified

## STOP conditions
- Any listed "replace" block does not match the live code exactly (drift).
- Typecheck reveals `user.id` / `account.id` type mismatches with `resumes.userId`
  — STOP and report (the ownership key would be wrong).
- A fix appears to require touching a file outside the three in scope.

## Maintenance notes
- The ownership key everywhere is `<table>.userId === ctx.user.id` because
  `ctx.user` is the `accounts` row and both `resumes.userId` and `profiles.userId`
  reference `accounts.id`. If auth context ever changes to expose the Clerk user
  instead of the account row, every check here must be revisited.
- 404 (not 403) is deliberate — it avoids confirming a resource exists.
- `getProfiles`/`getAllResumes` in resume-router already scope by `user.id` and
  are intentionally left unchanged.
- Follow-up: there is still no `deleteResume`/`deleteProfile` route; when added,
  it must carry the same ownership filter.
