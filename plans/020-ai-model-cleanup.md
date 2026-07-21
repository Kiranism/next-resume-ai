# Plan 020: Rename AI service + drop unused @google/generative-ai

## Status
- **Priority**: P3 — **Effort**: S — **Risk**: LOW
- **Depends on**: 019 (the OpenRouter switch) — **Category**: tech-debt
- **Planned at**: integration branch `improve/product-upgrades` (post-019)

## Why this matters

After plan 019, `src/server/services/google-ai-model.ts` no longer uses Google's
SDK — it calls OpenRouter — so the filename is misleading and the
`@google/generative-ai` dependency is dead (verified: zero imports of
`@google/generative-ai`/`GoogleGenerativeAI` in `src`). This renames the file to
`ai-model.ts`, updates its three importers, and removes the dead dependency.

## Commands
- `pnpm install` → 0 (build-gate workaround allowed, uncommitted)
- `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — RENAME: `src/server/services/google-ai-model.ts` → `src/server/services/ai-model.ts`
(use `git mv` to preserve history; content unchanged).
IN — EDIT (import path only): `src/server/services/ai-resume.ts`,
`src/server/services/parse-profile.ts`, `src/server/services/ats-analysis.ts`.
IN — EDIT: `package.json` (remove the `@google/generative-ai` dependency line).
OUT: everything else. Do NOT change the file's contents, any router, or logic.

## Git workflow
`git checkout -b advisor-020 improve/product-upgrades`, then `pnpm install`.
Commit on `advisor-020`: `chore(ai): rename google-ai-model -> ai-model, drop unused @google/generative-ai`. Do NOT push.

## Step 1 — rename the file
```
git mv src/server/services/google-ai-model.ts src/server/services/ai-model.ts
```
(Do not edit its contents.)

## Step 2 — update the three import paths
In EACH of these files, change the import specifier `'./google-ai-model'` to
`'./ai-model'`:
- `src/server/services/ai-resume.ts` — line ~5: `import { generateJsonContent } from './google-ai-model';` → `from './ai-model';`
- `src/server/services/parse-profile.ts` — line ~1: same change
- `src/server/services/ats-analysis.ts` — line ~1: same change

## Step 3 — remove the dead dependency from `package.json`
Delete this line from `"dependencies"`:
```json
    "@google/generative-ai": "^0.21.0",
```

## Step 4 — reinstall & verify
Run `pnpm install` (updates the lockfile). Then:
- `pnpm exec tsc --noEmit` → 0
- `pnpm lint` → 0
- `pnpm typecheck` → 0

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `test -f src/server/services/ai-model.ts && test ! -f src/server/services/google-ai-model.ts`
- [ ] `grep -rn "google-ai-model" src` → no matches
- [ ] `grep -c "@google/generative-ai" package.json` → 0
- [ ] `grep -rn "from './ai-model'" src/server/services` → 3 matches
- [ ] `git status` shows the rename + 3 import edits + package.json + pnpm-lock.yaml only

## STOP conditions
- `pnpm exec tsc --noEmit` reports a "cannot find module './google-ai-model'" — an
  importer was missed; find and fix it (only the 3 listed should reference it).
- Removing the dependency causes a tsc error (something still imports
  `@google/generative-ai`) — STOP and report which file (should be none per verification).

## Maintenance notes
- Pure rename + dead-dep removal; no behavior change. The AI service is now
  `src/server/services/ai-model.ts` (OpenRouter-backed).
