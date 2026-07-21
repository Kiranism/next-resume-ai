import { jstack } from 'jstack';
import { HTTPException } from 'hono/http-exception';
import { currentUser } from '@clerk/nextjs/server';
import { nanoid } from 'nanoid';
import { db } from './db';
import { accounts } from './db/schema';

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

  let user = await db.query.accounts.findFirst({
    where: (accounts, { eq }) => eq(accounts.externalId, auth.id)
  });

  // Self-heal: a verified Clerk user without a DB account yet (never routed
  // through /welcome, or the DB was reset) gets one created here instead of a
  // 401. Idempotent via the unique externalId.
  if (!user) {
    await db
      .insert(accounts)
      .values({
        id: nanoid(),
        externalId: auth.id,
        email: auth.emailAddresses[0]?.emailAddress ?? ''
      })
      .onConflictDoNothing({ target: accounts.externalId });

    user = await db.query.accounts.findFirst({
      where: (accounts, { eq }) => eq(accounts.externalId, auth.id)
    });
  }

  if (!user) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  return next({ user });
});

export const publicProcedure = j.procedure;
export const privateProcedure = publicProcedure.use(authMiddleware);
