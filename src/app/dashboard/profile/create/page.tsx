import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CreateProfileForm from '@/features/profile/components/create-profile-form';

export const metadata: Metadata = {
  title: 'Create Profile | CVTailor',
  description:
    'Create a new profile with your experience, education and details.'
};

export default function CreateProfilePage() {
  return (
    <div className='mx-auto max-w-4xl px-4 py-6'>
      <Link
        href='/dashboard/profile'
        className='text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm'
      >
        <ArrowLeft className='h-4 w-4' /> Back to profiles
      </Link>
      <h1 className='mb-6 text-2xl font-semibold'>Create New Profile</h1>
      <CreateProfileForm />
    </div>
  );
}
