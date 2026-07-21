'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileWithRelations } from '@/server/routers/profile-router';
import { useState, useCallback } from 'react';
import { useProfiles } from '../api';
import CreateProfileModal from './create-profile-modal';
import { ProfileDeleteButton } from './profile-delete-button';
import { ImportProfileDialog } from './import-profile-dialog';
import { PlusCircle } from 'lucide-react';

export default function ProfileList() {
  const [selectedProfile, setSelectedProfile] =
    useState<ProfileWithRelations | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleModalChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedProfile(null);
    }
  }, []);

  const handleCreateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProfile(null);
    setIsOpen(true);
  }, []);

  const handleProfileClick = useCallback((profile: ProfileWithRelations) => {
    setSelectedProfile(profile);
    setIsOpen(true);
  }, []);

  const { data: profiles, isLoading } = useProfiles();

  if (isLoading) {
    return <Skeleton className='h-[400px] w-full' />;
  }

  return (
    <>
      <CreateProfileModal
        onChange={handleModalChange}
        isOpen={isOpen}
        profile={selectedProfile as ProfileWithRelations}
      />

      <div className='mb-4 flex justify-end'>
        <ImportProfileDialog />
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card
          onClick={handleCreateClick}
          className='flex cursor-pointer flex-col items-center justify-center border-2 border-dashed bg-gradient-to-br from-sidebar/60 to-sidebar p-8 hover:border-primary'
        >
          <div className='flex h-full flex-col items-center justify-center'>
            <PlusCircle className='mx-auto h-10 w-10' />
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              Create new profile
            </p>
          </div>
        </Card>

        {profiles?.map((profile) => (
          <Card
            key={profile.id}
            className='cursor-pointer bg-gradient-to-br from-sidebar/60 to-sidebar transition-all hover:border-primary'
            onClick={() =>
              handleProfileClick(profile as unknown as ProfileWithRelations)
            }
          >
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle>
                    {profile.firstname} {profile.lastname}
                  </CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                </div>
                <ProfileDeleteButton profileId={profile.id} />
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <div className='text-sm'>
                  <span className='font-medium'>Phone:</span>{' '}
                  {profile.contactno}
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
    </>
  );
}
