# Plan 007: Trustworthy resume generation (no orphan rows + quota enforcement)

## Status
- **Priority**: P1 — **Effort**: M — **Risk**: MED (reorders the create flow)
- **Depends on**: 004 (ownership), 005 (stateless AI) — both integrated on `improve/product-upgrades`
- **Category**: correctness / cost-safety
- **Planned at**: integration branch `improve/product-upgrades` (post-006)

## Why this matters

The `createResume` flow has two production risks:
1. It **inserts the resume row before the AI call**, so if generation fails, a
   half-empty orphan resume is left in the database.
2. It never reads `accounts.quotaLimit` (default 100), so a user can trigger
   **unbounded paid Gemini calls** — a cost/abuse vector.

This plan reorders the flow to generate first and insert once (no orphan rows),
and enforces a per-account quota using the existing `quotaLimit` column with the
user's resume count as the usage proxy (no schema change needed).

## IMPORTANT — base your work on the integration branch first

The fresh worktree starts at the old base commit. Before editing, run:

```
git checkout -b advisor-007 improve/product-upgrades
```

This gives you the current code (which already includes the ownership checks from
plan 004 and the stateless AI from plan 005). Then `pnpm install`. Commit your
work on the `advisor-007` branch.

## Commands
- `pnpm install` → 0 (known pnpm-11 build-gate: `pnpm approve-builds` / `pnpm install --dangerously-allow-all-builds` is an acceptable uncommitted workaround)
- `pnpm exec tsc --noEmit` → 0
- `pnpm lint` → 0
- `pnpm typecheck` → 0

## Scope
IN SCOPE: `src/server/routers/resume-router.ts` (only the `createResume`
procedure + the drizzle-orm import line).
OUT OF SCOPE: everything else — no schema change, no AI service change, no other
procedure.

## Git workflow
Commit on `advisor-007`. Conventional Commits, e.g.
`feat(resume): generate before insert + enforce generation quota`. Do NOT push.

## Current state (after `git checkout -b advisor-007 improve/product-upgrades`)

The drizzle-orm import at the top of `resume-router.ts`:

```tsx
import { eq, desc, inArray, and } from 'drizzle-orm';
```

The current `createResume` procedure:

```tsx
  createResume: privateProcedure
    .input(
      z.object({
        profileId: z.string(),
        ...resumeFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { profileId, ...resumeData } = input;

      // Get the account record first
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.externalId, user.externalId)
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Create new resume record with correct userId
      const newResume = {
        id: nanoid(),
        userId: account.id, // Use account.id instead of user.id
        profileId,
        jdJobTitle: resumeData.jd_job_title,
        employer: resumeData.employer,
        jdPostDetails: resumeData.jd_post_details
      };

      // Get profile data
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, profileId),
        with: {
          jobs: true,
          educations: true
        }
      });

      if (!profile || profile.userId !== account.id) {
        return c.json({ error: 'Profile not found' }, 404);
      }

      // Insert initial resume into database
      const [created] = await db.insert(resumes).values(newResume).returning();

      // Generate AI content with combined profile and resume data
      const aiGeneratedContent = await generateResumeContent(
        {
          ...resumeData,
          profileId: input.profileId
        },
        profile
      );

      // Update resume with AI generated content
      const [updated] = await db
        .update(resumes)
        .set({
          personalDetails: aiGeneratedContent.personal_details,
          jobs: profile.jobs,
          education: profile.educations,
          skills: aiGeneratedContent.skills,
          tools: aiGeneratedContent.tools,
          languages: aiGeneratedContent.languages,
          updatedAt: new Date()
        })
        .where(eq(resumes.id, created.id))
        .returning();

      const sendResumeData = { ...updated, profile: profile };

      return c.json({ id: updated.id, data: sendResumeData });
    }),
```

## Step 1 — add `count` to the drizzle-orm import

Replace:

```tsx
import { eq, desc, inArray, and } from 'drizzle-orm';
```

with:

```tsx
import { eq, desc, inArray, and, count } from 'drizzle-orm';
```

## Step 2 — replace the whole `createResume` procedure with:

```tsx
  createResume: privateProcedure
    .input(
      z.object({
        profileId: z.string(),
        ...resumeFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { profileId, ...resumeData } = input;

      // Get the account record first
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.externalId, user.externalId)
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Enforce per-account generation quota (accounts.quotaLimit; the user's
      // resume count is the usage proxy). Prevents unbounded paid AI calls.
      const [{ value: usedCount }] = await db
        .select({ value: count() })
        .from(resumes)
        .where(eq(resumes.userId, account.id));

      if (usedCount >= account.quotaLimit) {
        return c.json(
          { error: 'Generation quota reached. Delete a resume to make room.' },
          429
        );
      }

      // Get profile data
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, profileId),
        with: {
          jobs: true,
          educations: true
        }
      });

      if (!profile || profile.userId !== account.id) {
        return c.json({ error: 'Profile not found' }, 404);
      }

      // Generate AI content BEFORE inserting, so a generation failure never
      // leaves an orphan resume row in the database.
      const aiGeneratedContent = await generateResumeContent(
        {
          ...resumeData,
          profileId: input.profileId
        },
        profile
      );

      // Insert the fully-populated resume in a single write.
      const [created] = await db
        .insert(resumes)
        .values({
          id: nanoid(),
          userId: account.id,
          profileId,
          jdJobTitle: resumeData.jd_job_title,
          employer: resumeData.employer,
          jdPostDetails: resumeData.jd_post_details,
          personalDetails: aiGeneratedContent.personal_details,
          jobs: profile.jobs,
          education: profile.educations,
          skills: aiGeneratedContent.skills,
          tools: aiGeneratedContent.tools,
          languages: aiGeneratedContent.languages,
          updatedAt: new Date()
        })
        .returning();

      const sendResumeData = { ...created, profile: profile };

      return c.json({ id: created.id, data: sendResumeData });
    }),
```

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `grep -n "usedCount >= account.quotaLimit" src/server/routers/resume-router.ts` → 1 match
- [ ] `grep -c "db.insert(resumes)" src/server/routers/resume-router.ts` → 1 (single insert; the old insert-then-update is gone)
- [ ] `grep -c "db\s*\.update(resumes)" src/server/routers/resume-router.ts` — the `createResume` no longer calls `.update(resumes)`; the only remaining `.update(resumes)` is in `updateResume`/`uploadPreviewImage`
- [ ] `git status` shows only `src/server/routers/resume-router.ts` modified

## STOP conditions
- The "Current state" excerpt doesn't match (you forgot the `git checkout -b advisor-007 improve/product-upgrades` step, or the code drifted).
- `count()` from `drizzle-orm` does not typecheck (wrong version) → STOP and report; do not substitute a raw SQL count without reporting first.
- The single-insert `.values({...})` fails to typecheck against the `resumes` insert type (e.g. a jsonb column rejects `profile.jobs`) → STOP and report the exact type error.

## Maintenance notes
- Quota uses resume count as the usage proxy against `accounts.quotaLimit`. A
  truer model (a dedicated `usageCount` with monthly reset) needs a schema
  migration — deferred. Deleting a resume frees quota, which is intuitive.
- Generation now happens before any DB write; if generation is later moved to a
  background job, revisit the "insert on success" ordering.
- The AI call is intentionally NOT inside a DB transaction (never hold a
  transaction open across a slow external call). Correctness comes from ordering,
  not locking.
