# Plan 003: Harden the auth middleware (remove bearer bypass, fix swallowed 401)

## Status
- **Priority**: P1 — **Effort**: S — **Risk**: LOW
- **Depends on**: none — **Category**: security
- **Planned at**: commit `f464c9c`, 2026-07-21

## Why this matters

`src/server/jstack.ts` has two authentication defects:
1. It treats `Authorization: Bearer <account_id>` as valid auth — an account ID
   is a non-secret nanoid that the app returns to clients, so anyone who learns
   any account ID can fully impersonate that account. This is a half-built
   feature (`//todo: bearer token`), not a used path — the app authenticates via
   the Clerk session cookie.
2. The whole middleware is wrapped in a `try/catch` that **logs and swallows**
   the 401 (the re-throw is commented out), so genuine auth failures never
   return 401. It also logs the bearer token and the full Clerk user object.

Fix: identity comes only from the verified Clerk session; unauthorized requests
throw 401 and it propagates (jstack's `onError` in `src/server/index.ts` turns
it into the response). Remove the token/PII logging.

## Current state — full `src/server/jstack.ts`

```tsx
import { jstack } from 'jstack';
import { HTTPException } from 'hono/http-exception';
import { currentUser } from '@clerk/nextjs/server';
import { db } from './db';

interface Env {
  Bindings: { DATABASE_URL: string };
}

export const j = jstack.init<Env>();

// Auth middleware for protected routes
const authMiddleware = j.middleware(async ({ c, next }) => {
  try {
    const authHeader = c.req.header('Authorization');
    //todo: bearer token need to handle in schema and table.
    if (authHeader) {
      const apiKey = authHeader.split(' ')[1]; // bearer <API_KEY>
      console.log('header', apiKey);
      const user = await db.query.accounts.findFirst({
        where: (accounts, { eq }) => eq(accounts.id, apiKey)
      });

      if (user) return next({ user });
    }

    const auth = await currentUser();

    console.log('auth', auth);

    if (!auth) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const user = await db.query.accounts.findFirst({
      where: (accounts, { eq }) => eq(accounts.externalId, auth.id)
    });

    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }

    return next({ user });
  } catch (error) {
    console.log('error', error);
    // throw new HTTPException(401, { message: 'Unauthorized' });
  }
});

export const publicProcedure = j.procedure;
export const privateProcedure = publicProcedure.use(authMiddleware);
```

## Commands
- Install: `pnpm install` → exit 0
- Typecheck: `pnpm exec tsc --noEmit` → exit 0
- Lint: `pnpm lint` → exit 0

## Scope
IN SCOPE: `src/server/jstack.ts` (only this file).
OUT OF SCOPE: everything else. Do NOT change any router, `src/server/index.ts`,
or the DB schema.

## Git workflow
Commit in the worktree. Conventional Commits, e.g.
`fix(auth): remove account-id bearer bypass and stop swallowing 401`.
Do NOT push.

## Step 1 — Replace the entire contents of `src/server/jstack.ts` with:

```tsx
import { jstack } from 'jstack';
import { HTTPException } from 'hono/http-exception';
import { currentUser } from '@clerk/nextjs/server';
import { db } from './db';

interface Env {
  Bindings: { DATABASE_URL: string };
}

export const j = jstack.init<Env>();

// Auth middleware for protected routes.
// Identity comes ONLY from the verified Clerk session. A previous
// `Authorization: Bearer <account_id>` path was removed: account IDs are
// non-secret nanoids returned to clients, so accepting one as a credential
// allowed full account impersonation. A real API-key feature must use hashed
// keys in a dedicated table (tracked in the backlog), not the account id.
const authMiddleware = j.middleware(async ({ c, next }) => {
  const auth = await currentUser();

  if (!auth) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const user = await db.query.accounts.findFirst({
    where: (accounts, { eq }) => eq(accounts.externalId, auth.id)
  });

  if (!user) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  return next({ user });
});

export const publicProcedure = j.procedure;
export const privateProcedure = publicProcedure.use(authMiddleware);
```

**Verify**:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `grep -n "Authorization" src/server/jstack.ts` → no matches
- `grep -n "console.log" src/server/jstack.ts` → no matches
- `grep -n "HTTPException(401" src/server/jstack.ts` → 2 matches (the two throws)

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -rn "Authorization" src/server/jstack.ts` → no matches
- [ ] `grep -rn "console.log" src/server/jstack.ts` → no matches
- [ ] `git status` shows only `src/server/jstack.ts` modified

## STOP conditions
- The current `jstack.ts` doesn't match the excerpt above (drift).
- Typecheck fails in a way that would require editing another file.
- Removing the bearer path causes a typecheck error elsewhere (it shouldn't —
  `privateProcedure`/`publicProcedure` exports are unchanged). If it does, STOP
  and report which file.

## Maintenance notes
- The app client authenticates via the Clerk session cookie (`src/lib/client.ts`
  sends no Authorization header), so removing the bearer path affects no live
  caller. If a programmatic API is added later, implement hashed API keys in a
  new table and a separate procedure — never authenticate by primary-key id.
- Unauthorized requests now return the jstack `onError` 500/401 path; a reviewer
  should confirm the error response shape is acceptable for the client.
