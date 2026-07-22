import { Metadata } from 'next';
import CreateResumeContent from './create-resume-content';

export const metadata: Metadata = {
  title: 'Create New Resume | CVTailor',
  description:
    'Create a new AI-powered resume tailored to your target job description. Our smart resume builder helps you stand out.',
  openGraph: {
    title: 'Create New Resume | CVTailor',
    description:
      'Create a new AI-powered resume tailored to your target job description. Our smart resume builder helps you stand out.'
  },
  twitter: {
    title: 'Create New Resume | CVTailor',
    description:
      'Create a new AI-powered resume tailored to your target job description. Our smart resume builder helps you stand out.'
  }
};

export default async function CreateResumePage({
  searchParams
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const { profileId } = await searchParams;
  return <CreateResumeContent initialProfileId={profileId} />;
}
