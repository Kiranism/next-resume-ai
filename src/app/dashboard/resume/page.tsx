import { Metadata } from 'next';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileFilter } from '@/features/resume/components/profile-filter';
import { getTemplate } from '@/features/resume/templates/registry';
import { searchParamsCache, serialize } from '@/lib/searchparams';
import { db } from '@/server/db';
import { resumes, accounts } from '@/server/db/schema';
import { formatDistanceToNow } from 'date-fns';
import { eq, and } from 'drizzle-orm';
import { Building2, PlusIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';
import { currentUser } from '@clerk/nextjs/server';

export const metadata: Metadata = {
  title: 'My Resumes | CVTailor',
  description:
    'Create, manage, and customize your resumes. Use AI-powered tools to tailor your resume for specific job descriptions.',
  openGraph: {
    title: 'My Resumes | CVTailor',
    description:
      'Create, manage, and customize your resumes. Use AI-powered tools to tailor your resume for specific job descriptions.'
  },
  twitter: {
    title: 'My Resumes | CVTailor',
    description:
      'Create, manage, and customize your resumes. Use AI-powered tools to tailor your resume for specific job descriptions.'
  }
};

export default async function ResumePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  searchParamsCache.parse(params);
  const key = serialize({ ...params });
  const { profileId } = params;

  const auth = await currentUser();
  if (!auth) {
    throw new Error('Unauthorized');
  }

  // Get the account record first
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.externalId, auth.id)
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Simpler query that directly filters by userId and optionally by profileId
  const resumesList = await db.query.resumes.findMany({
    where: and(
      eq(resumes.userId, account.id),
      profileId ? eq(resumes.profileId, String(profileId)) : undefined
    ),
    orderBy: (resumes, { desc }) => [desc(resumes.createdAt)]
  });

  return (
    <PageContainer scrollable>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>My Resumes</h1>
            <p className='text-muted-foreground'>Manage your resumes</p>
          </div>
        </div>

        <ProfileFilter />

        <Suspense key={key}>
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
            {/* Create New Resume Card */}
            <Link href='/dashboard/resume/create' className='block'>
              <Card className='group hover:border-primary h-[300px] cursor-pointer p-0 transition-all hover:shadow-md'>
                <CardContent className='flex h-full flex-col items-center justify-center p-6'>
                  <div className='bg-muted/10 group-hover:bg-primary/5 mb-4 rounded-full p-4'>
                    <PlusIcon className='text-muted-foreground group-hover:text-primary h-8 w-8' />
                  </div>
                  <h3 className='text-center text-lg font-semibold'>
                    Create a new resume
                  </h3>
                  <p className='text-muted-foreground mt-2 text-center text-sm'>
                    Start building from scratch
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Import Resume Card */}
            {/* <Link href='/dashboard/resume/import'>
            <Card className='h-full transition-all cursor-pointer hover:border-primary hover:shadow-md group'>
              <CardContent className='flex flex-col items-center justify-center h-[300px] p-6'>
                <div className='p-4 mb-4 rounded-full bg-muted/10 group-hover:bg-primary/5'>
                  <svg
                    className='w-8 h-8 text-muted-foreground group-hover:text-primary'
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className='text-lg font-semibold'>Import an existing resume</h3>
                <p className='mt-2 text-sm text-center text-muted-foreground'>
                  LinkedIn, JSON Resume, etc.
                </p>
              </CardContent>
            </Card>
          </Link> */}

            {/* Existing Resumes */}
            {resumesList.map((resume) => (
              <Link
                key={resume.id}
                href={`/dashboard/resume/edit/${resume.id}`}
                className='group block'
              >
                <Card className='hover:border-primary relative h-[300px] overflow-hidden p-0 transition-all hover:shadow-md'>
                  <Image
                    src={getTemplate(resume.templateId ?? '').thumbnail}
                    alt={resume.jdJobTitle}
                    fill
                    sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                    className='object-cover object-top transition-transform duration-500 group-hover:scale-105'
                  />

                  {/* Fades so the overlays stay legible over any preview */}
                  <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent' />
                  <div className='pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent' />

                  {/* Company / employer — scannable at a glance */}
                  {resume.employer && (
                    <div className='absolute inset-x-0 top-0 flex p-3'>
                      <Badge
                        variant='secondary'
                        className='max-w-[calc(100%-1.5rem)] gap-1 shadow-sm'
                      >
                        <Building2 className='size-3 shrink-0' />
                        <span className='truncate'>{resume.employer}</span>
                      </Badge>
                    </div>
                  )}

                  {/* Title + meta */}
                  <div className='absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white'>
                    <h3 className='line-clamp-2 text-base leading-tight font-semibold'>
                      {resume.jdJobTitle}
                    </h3>
                    <p className='text-xs text-white/70'>
                      Updated{' '}
                      {formatDistanceToNow(new Date(resume.createdAt), {
                        addSuffix: true
                      })}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Suspense>
      </div>
    </PageContainer>
  );
}
