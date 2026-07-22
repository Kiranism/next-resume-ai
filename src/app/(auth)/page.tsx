import { auth } from '@clerk/nextjs/server';
import { LandingPage } from '@/features/marketing/components/landing-page';

// Public marketing landing page. Authenticated users get a "dashboard" CTA;
// everyone else gets "sign in / get started".
export default async function Page() {
  const { userId } = await auth();
  return <LandingPage isAuthed={!!userId} />;
}
