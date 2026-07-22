import { SignIn } from '@clerk/nextjs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | CVTailor',
  description: 'Sign in to CVTailor to build and manage your AI resumes.'
};

export default async function Page() {
  let stars = 3000; // Default value

  try {
    const response = await fetch(
      'https://api.github.com/repos/kiranism/next-shadcn-dashboard-starter',
      {
        next: { revalidate: 3600 }
      }
    );

    if (response.ok) {
      const data = await response.json();
      stars = data.stargazers_count || stars; // Update stars if API response is valid
    }
  } catch (error) {
    console.error('Error fetching GitHub stars:', error);
  }
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <SignIn signInUrl='/sign-in' forceRedirectUrl='/welcome' />
    </div>
  );
}
