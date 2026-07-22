import { Metadata } from 'next';
import { Suspense } from 'react';
import ProfileList from '@/features/profile/components/profile-list';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'My Profiles | CVTailor',
  description:
    'Manage your professional profiles. Create and customize different profiles for various job types and industries.',
  openGraph: {
    title: 'My Profiles | CVTailor',
    description:
      'Manage your professional profiles. Create and customize different profiles for various job types and industries.'
  },
  twitter: {
    title: 'My Profiles | CVTailor',
    description:
      'Manage your professional profiles. Create and customize different profiles for various job types and industries.'
  }
};

export default function ProfilesPage() {
  return (
    <PageContainer>
      <div className='flex-1 space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-3xl font-bold tracking-tight'>Profiles</h2>
        </div>
        <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
          <ProfileList />
        </Suspense>
      </div>
    </PageContainer>
  );
}
