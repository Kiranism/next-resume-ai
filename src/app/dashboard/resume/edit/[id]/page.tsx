import { ResumeEditContent } from '@/features/resume/components/resume-edit-content';
import { db } from '@/server/db';
import { resumes } from '@/server/db/schema/resumes';
import { accounts } from '@/server/db/schema/accounts';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import EditResumeLoading from './loading';
import { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';

export default async function EditResumePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const resumeId = (await params).id;

    if (!resumeId) {
      notFound();
    }

    const auth = await currentUser();
    if (!auth) {
      notFound();
    }

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.externalId, auth.id)
    });
    if (!account) {
      notFound();
    }

    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.id, resumeId), eq(resumes.userId, account.id))
    });

    if (!resume) {
      notFound();
    }

    return (
      <Suspense fallback={<EditResumeLoading />}>
        <ResumeEditContent resume={resume} />
      </Suspense>
    );
  } catch (error) {
    // Log the error but let it propagate to the error boundary
    console.error('Error in EditResumePage:', error);
    throw error;
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: 'Edit Resume | CVTailor',
    description:
      'Edit and customize your resume. Fine-tune content, layout, and styling to create the perfect resume for your job application.',
    openGraph: {
      title: 'Edit Resume | CVTailor',
      description:
        'Edit and customize your resume. Fine-tune content, layout, and styling to create the perfect resume for your job application.'
    },
    twitter: {
      title: 'Edit Resume | CVTailor',
      description:
        'Edit and customize your resume. Fine-tune content, layout, and styling to create the perfect resume for your job application.'
    }
  };
}
