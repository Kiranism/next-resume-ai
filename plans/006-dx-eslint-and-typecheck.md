# Plan 006: Fix the broken ESLint config + add a `typecheck` script

## Status
- **Priority**: P1 — **Effort**: S — **Risk**: LOW
- **Depends on**: none — **Category**: dx / tooling
- **Planned at**: commit `f464c9c`, 2026-07-21

## Why this matters

`pnpm lint` is broken repo-wide: `package.json` declares `eslint` at **two
conflicting majors** — `8.48.0` in `dependencies` and `^9.18.0` in
`devDependencies` (same for `eslint-config-next`) — so `next lint` fails with
`Failed to load config "next/core-web-vitals" to extend from`. This means the
lint gate cannot pass for any change, and there is also **no `typecheck` script**
(the only type safety is a full `next build`). This plan standardizes ESLint on
the v8 line that the repo's legacy `.eslintrc.json` + `next lint` expect, dedups
the dependency/devDependency split, marks the ESLint config as `root` (so
resolution never cascades outside the project), and adds a `typecheck` script.

## Commands
- Install: `pnpm install` → exit 0
- Typecheck: `pnpm exec tsc --noEmit` → exit 0
- New script: `pnpm typecheck` → exit 0
- Lint: `pnpm lint` → **exit 0** (this is the whole point — it must pass now)

## Scope
IN SCOPE: `package.json`, `.eslintrc.json`.
OUT OF SCOPE: every source file; the lockfile `pnpm-lock.yaml` will change as a
side effect of `pnpm install` — that is expected and allowed.

## Git workflow
Commit in the worktree. Conventional Commits, e.g.
`chore(dx): fix eslint version conflict and add typecheck script`. Do NOT push.

## Current state

`package.json` — the conflicting entries:

```jsonc
// in "dependencies":
    "eslint": "8.48.0",
    "eslint-config-next": "15.1.0",
// ...
// in "devDependencies":
    "eslint": "^9.18.0",
    "eslint-config-next": "^15.1.4",
```

`package.json` — the `scripts` block currently has no `typecheck`:

```jsonc
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "eslint src --fix && pnpm format",
    "lint:strict": "eslint --max-warnings=0 src",
    "format": "prettier --write .",
    "format:check": "prettier -c -w .",
    "prepare": "husky"
  },
```

`.eslintrc.json` (full):

```json
{
  "extends": "next/core-web-vitals",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "args": "none" }],
    "import/no-unresolved": "error",
    "import/named": "off",
    "no-console": "warn"
  }
}
```

## Step 1 — `package.json`

1a. In `"dependencies"`, DELETE these two lines entirely (ESLint tooling belongs
only in devDependencies):

```json
    "eslint": "8.48.0",
    "eslint-config-next": "15.1.0",
```

1b. In `"devDependencies"`, change the eslint version from `^9.18.0` to `^8.57.1`
(the last v8 line, which `next lint` + the legacy `.eslintrc.json` support).
Replace:

```json
    "eslint": "^9.18.0",
```

with:

```json
    "eslint": "^8.57.1",
```

(Leave `"eslint-config-next": "^15.1.4"` in devDependencies as-is.)

1c. In `"scripts"`, add a `typecheck` script. Change:

```json
    "lint": "next lint",
```

to:

```json
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
```

## Step 2 — `.eslintrc.json`

Add `"root": true` so ESLint never cascades to a config outside this project.
Replace:

```json
{
  "extends": "next/core-web-vitals",
```

with:

```json
{
  "root": true,
  "extends": "next/core-web-vitals",
```

## Step 3 — reinstall and verify

Run `pnpm install` (updates the lockfile to the single ESLint 8 version).

**Verify** (ALL must hold):
- `pnpm install` → exit 0
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm typecheck` → exit 0 (the new script)
- `pnpm lint` → **exit 0** (may print warnings — that's fine; it must not error)

## Done criteria (ALL)
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `grep -c '"eslint"' package.json` → 1 (only one eslint entry remains)
- [ ] `grep -n '"typecheck"' package.json` → 1 match
- [ ] `grep -n '"root": true' .eslintrc.json` → 1 match
- [ ] `git status` shows only `package.json`, `.eslintrc.json`, and
      `pnpm-lock.yaml` changed

## STOP conditions
- After Step 3, `pnpm lint` still does NOT exit 0 → STOP and report the exact
  error output. Do not start editing source files or `.eslintrc.json` rules to
  force it green; the fix is a dependency/config change only.
- `pnpm install` fails for a reason other than the known pnpm-11 build-approval
  gate (for that gate, `pnpm approve-builds` or `pnpm install --dangerously-allow-all-builds`
  is an acceptable one-time, uncommitted workaround) → STOP and report.
- Changing eslint to v8 causes `pnpm install` to fail resolving
  `eslint-config-next@^15.1.4`'s peer deps → STOP and report the peer conflict.

## Maintenance notes
- The repo uses the **legacy** `.eslintrc.json` format; that's why we pin ESLint
  8. Migrating to ESLint 9 later means adopting flat config (`eslint.config.js`)
  or setting `ESLINT_USE_FLAT_CONFIG=false` — a separate, larger change.
- With `typecheck` now a script, wire it into CI and `lint-staged` in a follow-up
  so type errors are caught before merge.
