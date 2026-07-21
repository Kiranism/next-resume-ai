'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ProfileWithRelations } from '@/server/routers/profile-router';
import { useProfile } from '../api';
import CreateProfileForm from './create-profile-form';

export default function EditProfileContent({ id }: { id: string }) {
  const { data: profile, isLoading } = useProfile(id);

  if (isLoading) {
    return <Skeleton className='h-[500px] w-full' />;
  }

  if (!profile) {
    return (
      <p className='text-sm text-muted-foreground'>
        Profile not found or you don&apos;t have access to it.
      </p>
    );
  }

  return (
    <CreateProfileForm profile={profile as unknown as ProfileWithRelations} />
  );
}
