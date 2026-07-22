import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EditProfileContent from '@/features/profile/components/edit-profile-content';

export const metadata: Metadata = {
  title: 'Edit Profile | CVTailor'
};

export default async function EditProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className='mx-auto max-w-4xl px-4 py-6'>
      <Link
        href='/dashboard/profile'
        className='text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm'
      >
        <ArrowLeft className='h-4 w-4' /> Back to profiles
      </Link>
      <h1 className='mb-6 text-2xl font-semibold'>Edit Profile</h1>
      <EditProfileContent id={id} />
    </div>
  );
}
