'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useProfiles } from '../api';
import { ProfileDeleteButton } from './profile-delete-button';
import { ImportProfileDialog } from './import-profile-dialog';
import { PlusCircle } from 'lucide-react';

export default function ProfileList() {
  const router = useRouter();
  const { data: profiles, isLoading } = useProfiles();

  if (isLoading) {
    return <Skeleton className='h-[400px] w-full' />;
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {/* Import an existing résumé */}
      <ImportProfileDialog />

      {/* Build a profile by hand */}
      <Card
        onClick={() => router.push('/dashboard/profile/create')}
        className='from-sidebar/60 to-sidebar hover:border-primary flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed bg-gradient-to-br p-8 text-center'
      >
        <PlusCircle className='h-9 w-9' />
        <span className='text-sm font-medium'>Create from scratch</span>
        <span className='text-muted-foreground text-xs'>
          Fill in your details by hand
        </span>
      </Card>

      {profiles?.map((profile) => (
        <Card
          key={profile.id}
          className='from-sidebar/60 to-sidebar hover:border-primary cursor-pointer bg-gradient-to-br transition-all'
          onClick={() => router.push(`/dashboard/profile/edit/${profile.id}`)}
        >
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle>
                  {profile.firstname} {profile.lastname}
                </CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <ProfileDeleteButton profileId={profile.id} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='text-sm'>
                <span className='font-medium'>Phone:</span> {profile.contactno}
              </div>
              <div className='text-sm'>
                <span className='font-medium'>Location:</span> {profile.city},{' '}
                {profile.country}
              </div>
              <div className='text-sm'>
                <span className='font-medium'>Experience:</span>{' '}
                {profile?.jobs?.length} positions
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
