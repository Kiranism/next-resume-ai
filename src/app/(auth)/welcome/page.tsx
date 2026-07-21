// Ensure the signed-in user has a DB account, then continue — done server-side
// so there is no client-side "syncing…" screen or polling pause.
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import { db } from '@/server/db';
import { accounts } from '@/server/db/schema';

export default async function WelcomePage() {
  const auth = await currentUser();
  if (!auth) {
    redirect('/sign-in');
  }

  const existing = await db.query.accounts.findFirst({
    where: (accounts, { eq }) => eq(accounts.externalId, auth.id)
  });

  if (!existing) {
    await db
      .insert(accounts)
      .values({
        id: nanoid(),
        externalId: auth.id,
        email: auth.emailAddresses[0]?.emailAddress ?? ''
      })
      // externalId is unique — ignore a race where a parallel request won.
      .onConflictDoNothing({ target: accounts.externalId });
  }

  redirect('/dashboard/profile');
}
