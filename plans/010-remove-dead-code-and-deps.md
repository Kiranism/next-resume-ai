# Plan 010: Remove dead starter scaffolding + unused dependencies

## Status
- **Priority**: P2 — **Effort**: M — **Risk**: LOW-MED (many deletions; all verified unimported)
- **Depends on**: none — **Category**: tech-debt
- **Planned at**: integration branch `improve/product-upgrades` (post-009)

## Why this matters

The repo is built on a shadcn dashboard starter and still carries its demo code
(products/kanban/overview features, a mock API, an unregistered posts router) plus
~11 unused npm packages. This is grep/onboarding noise and needless supply-chain
surface. Every deletion target below was verified to have **no importer** outside
the code being deleted (on this branch).

## IMPORTANT — base on the integration branch
Run first: `git checkout -b advisor-010 improve/product-upgrades`, then
`pnpm install`. Commit on `advisor-010`.

## Commands
- `pnpm install` → 0 (build-gate workaround allowed, uncommitted)
- `pnpm exec tsc --noEmit` → 0
- `pnpm lint` → 0
- `pnpm typecheck` → 0

## Scope
IN SCOPE — DELETE these paths (`git rm -r` for dirs, `git rm` for files):
- `src/features/products/` (dir)
- `src/features/kanban/` (dir)
- `src/features/overview/` (dir)
- `src/constants/mock-api.ts`
- `src/server/routers/post-router.ts`
- `src/server/db/schema/posts.ts`
- `src/components/ui/chart.tsx`
- `src/hooks/use-breakpoints.tsx`
- `src/components/mode-toggle.tsx`  ← the THEME toggle duplicate. **DO NOT delete `src/features/resume/components/mode-toggle.tsx`** (that's the resume view switcher, still used).
- `src/components/providers/theme-provider.tsx`  ← duplicate; the live one is `src/components/layout/ThemeToggle/theme-provider.tsx`
- `types/next-auth.d.ts`
- `wrangler.toml`

IN SCOPE — EDIT:
- `src/server/db/schema/index.ts` (remove the `posts` import + export)
- `src/constants/data.ts` (reduce to just `navItems`)
- `package.json` (remove unused deps)

OUT OF SCOPE: any other source file. Do NOT touch
`src/features/resume/**`, `src/server/routers/{resume,profile,ats,user,job,auth}-router.ts`,
or `next.config.js`.

## Git workflow
Commit on `advisor-010`, e.g. `chore: remove dead starter scaffolding and unused deps`.
Do NOT push.

## Step 1 — delete the dead paths
Delete every path in the DELETE list above (use `git rm -r <dir>` / `git rm <file>`).
Double-check you deleted `src/components/mode-toggle.tsx` and NOT
`src/features/resume/components/mode-toggle.tsx`.

## Step 2 — `src/server/db/schema/index.ts`: drop `posts`

Current content:
```tsx
import { accounts } from './accounts';
import { posts } from './posts';
import { users } from './users';
import {
  profiles,
  jobs,
  educations,
  profilesRelations,
  jobsRelations,
  educationsRelations
} from './profiles';
import { resumes } from './resumes';

export {
  // Tables
  accounts,
  posts,
  users,
  profiles,
  jobs,
  educations,
  resumes,

  // Relations
  profilesRelations,
  jobsRelations,
  educationsRelations
};
```

Replace with (removed the `posts` import line and the `posts,` export line):
```tsx
import { accounts } from './accounts';
import { users } from './users';
import {
  profiles,
  jobs,
  educations,
  profilesRelations,
  jobsRelations,
  educationsRelations
} from './profiles';
import { resumes } from './resumes';

export {
  // Tables
  accounts,
  users,
  profiles,
  jobs,
  educations,
  resumes,

  // Relations
  profilesRelations,
  jobsRelations,
  educationsRelations
};
```

## Step 3 — `src/constants/data.ts`: keep only `navItems`

Replace the ENTIRE file with:
```tsx
import { NavItem } from 'types';

//Info: The following data is used for the sidebar navigation and Cmd K bar.
export const navItems: NavItem[] = [
  {
    title: 'Profiles',
    url: '/dashboard/profile',
    icon: 'user',
    label: 'Profile Management'
  },
  {
    title: 'Resume',
    url: '/dashboard/resume',
    icon: 'resume',
    label: 'Resume Management'
  }
];
```

## Step 4 — `package.json`: remove unused dependencies

From `"dependencies"`, DELETE these lines:
```json
    "better-auth": "^1.1.15",
    "crypto-js": "^4.2.0",
    "@types/crypto-js": "^4.2.2",
    "sort-by": "^1.2.0",
    "match-sorter": "^8.0.0",
    "react-responsive": "^10.0.0",
    "recharts": "^2.15.0",
    "wrangler": "^3.72.0",
```
(These may not be adjacent — remove each wherever it appears in `dependencies`.)

From `"devDependencies"`, DELETE these lines:
```json
    "@faker-js/faker": "^9.3.0",
    "@types/sort-by": "^1.2.3",
    "@cloudflare/workers-types": "^4.20240815.0",
```

**Do NOT remove** `buffer`, `crypto-browserify`, or `stream-browserify` — they may
be needed as build-time polyfills and this plan cannot run a full `next build` to
prove otherwise. Leave them.

## Step 5 — reinstall and verify
Run `pnpm install` (updates the lockfile). Then:
- `pnpm exec tsc --noEmit` → 0
- `pnpm lint` → 0
- `pnpm typecheck` → 0

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `test ! -d src/features/products && test ! -d src/features/kanban && test ! -d src/features/overview` (dirs gone)
- [ ] `test ! -f src/components/mode-toggle.tsx && test -f src/features/resume/components/mode-toggle.tsx` (deleted the dup, kept the feature one)
- [ ] `grep -c "posts" src/server/db/schema/index.ts` → 0
- [ ] `grep -c "recharts\|better-auth\|match-sorter\|react-responsive\|@faker-js" package.json` → 0
- [ ] `git status` shows deletions + edits to `schema/index.ts`, `data.ts`, `package.json`, `pnpm-lock.yaml` only

## STOP conditions
- `pnpm exec tsc --noEmit` fails after the deletions with a "cannot find module"
  pointing at a deleted file → something still imports it; STOP and report which
  file imports what (do NOT re-create the deleted file or edit an out-of-scope
  importer without reporting).
- Removing a dependency causes a tsc error (some src file imported it) → STOP and
  report which dep + file.
- `pnpm install` fails for a reason other than the known pnpm-11 build-gate → STOP.

## Maintenance notes
- The `posts` table still exists in the live database (migrations created it); this
  only removes it from the Drizzle schema so new migrations won't manage it. Dropping
  the table is a separate DB migration decision.
- `buffer`/`crypto-browserify`/`stream-browserify` were intentionally kept; if a
  later `next build` confirms they're unused, remove them then.
- `constants/data.ts` lost `Product`/`SaleUser`/`recentSalesData` (only the deleted
  demo code used them).
