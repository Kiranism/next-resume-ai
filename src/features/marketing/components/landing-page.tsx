import Link from 'next/link';
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconEye,
  IconFileUpload,
  IconLayoutGrid,
  IconMessageChatbot,
  IconSparkles,
  IconTargetArrow
} from '@tabler/icons-react';

import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LandingPageProps {
  isAuthed?: boolean;
}

const FEATURES = [
  {
    icon: IconSparkles,
    title: 'JD-tailored generation',
    body: 'Paste a job description and the AI rewrites your profile for that role. Quantified bullets, matched keywords, no invented experience.'
  },
  {
    icon: IconTargetArrow,
    title: 'ATS match score',
    body: 'See a 0–100 score, the keywords you already have, the ones you’re missing, and the edits that close the gap.'
  },
  {
    icon: IconEye,
    title: 'Live PDF preview',
    body: 'Every edit re-renders the résumé instantly beside the form. No flicker, no exporting to check your work.'
  },
  {
    icon: IconLayoutGrid,
    title: 'ATS-friendly templates',
    body: 'Pick from clean, recruiter-ready layouts, switch in a click, and export a PDF that applicant tracking systems read perfectly.'
  },
  {
    icon: IconFileUpload,
    title: 'Import in seconds',
    body: 'Drop in an existing résumé PDF (or paste the text) and we parse it straight into a reusable profile.'
  },
  {
    icon: IconMessageChatbot,
    title: 'Edit by chat',
    body: 'Say “make my summary punchier” or “add skills for this role”, and watch your résumé change as you type.'
  }
];

const STEPS = [
  {
    n: '01',
    title: 'Build your profile',
    body: 'Add your experience once, or import an existing résumé PDF and we’ll fill it in for you.'
  },
  {
    n: '02',
    title: 'Paste the job',
    body: 'Drop in the job description you’re targeting. That’s the signal the AI tailors everything to.'
  },
  {
    n: '03',
    title: 'Generate & refine',
    body: 'Get an ATS-optimized draft, tune it with a live preview + ATS score, and export a clean PDF.'
  }
];

const TEMPLATES = [
  'ATS Friendly',
  'Executive Blue',
  'Elegant Serif',
  'Creative Professional'
];

const CHAT: { role: 'user' | 'assistant'; text: string; applied?: boolean }[] =
  [
    {
      role: 'user',
      text: 'Make my summary more ATS-friendly for a senior frontend role.'
    },
    {
      role: 'assistant',
      text: 'Rewrote it around React, TypeScript and performance, front-loaded with the role’s keywords.',
      applied: true
    },
    { role: 'user', text: 'Add a few skills for this job.' },
    {
      role: 'assistant',
      text: 'Added Next.js, Tailwind CSS and Web Performance to your skills.',
      applied: true
    }
  ];

export function LandingPage({ isAuthed = false }: LandingPageProps) {
  const ctaHref = isAuthed ? '/dashboard/resume' : '/sign-in';
  const ctaLabel = isAuthed ? 'Open dashboard' : 'Build my résumé';

  return (
    <div className='bg-background text-foreground h-screen overflow-y-auto'>
      {/* ---- Nav ---- */}
      <header className='border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur'>
        <nav className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <Link
            href='/'
            className='flex items-center'
            aria-label='CVTailor home'
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo-on-light.png'
              alt='CVTailor'
              width={160}
              height={27}
              className='h-7 w-auto dark:hidden'
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo-on-dark.png'
              alt='CVTailor'
              width={160}
              height={27}
              className='hidden h-7 w-auto dark:block'
            />
          </Link>
          <div className='text-muted-foreground hidden items-center gap-8 text-sm md:flex'>
            <a href='#features' className='hover:text-foreground transition'>
              Features
            </a>
            <a href='#how' className='hover:text-foreground transition'>
              How it works
            </a>
            <a href='#templates' className='hover:text-foreground transition'>
              Templates
            </a>
          </div>
          <div className='flex items-center gap-2'>
            {!isAuthed && (
              <Link
                href='/sign-in'
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'hidden sm:inline-flex'
                )}
              >
                Sign in
              </Link>
            )}
            <Link href={ctaHref} className={buttonVariants()}>
              {ctaLabel}
              <IconArrowRight className='size-4' />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ---- Hero ---- */}
        <section className='relative overflow-hidden'>
          <div
            aria-hidden
            className='pointer-events-none absolute inset-0 -z-10 opacity-[0.06]'
            style={{
              backgroundImage:
                'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
              backgroundSize: '44px 44px'
            }}
          />
          <div className='mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-16 text-center md:pt-28'>
            <Badge variant='secondary' className='mb-6 gap-1.5'>
              <IconSparkles className='size-3.5' />
              AI-powered · ATS-optimized
            </Badge>
            <h1 className='text-4xl leading-tight font-extrabold tracking-tight text-balance md:text-6xl'>
              Résumés tailored to{' '}
              <span className='text-primary'>every job</span> you apply to.
            </h1>
            <p className='text-muted-foreground mt-6 max-w-2xl text-base text-balance md:text-lg'>
              Paste a job description and the AI drafts an ATS-optimized résumé
              from your profile. Refine it by chatting with a built-in
              assistant. Live preview, an ATS match score, a PDF you can send.
            </p>
            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
                {ctaLabel}
                <IconArrowRight className='size-4' />
              </Link>
              <a
                href='#how'
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                See how it works
              </a>
            </div>
            <div className='text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs'>
              {[
                'No design skills needed',
                'ATS-safe templates',
                'Free to start'
              ].map((item) => (
                <span key={item} className='flex items-center gap-1.5'>
                  <IconCheck className='text-primary size-3.5' />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Features ---- */}
        <section id='features' className='mx-auto max-w-6xl px-4 py-20'>
          <SectionHeading
            eyebrow='Features'
            title='Everything you need to get past the bots'
            subtitle='Built around how applicant tracking systems actually read a résumé.'
          />
          <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className='border-border bg-card hover:border-primary/60 group border p-6 transition-colors'
              >
                <span className='bg-primary/10 text-primary mb-4 grid size-11 place-items-center'>
                  <Icon className='size-6' />
                </span>
                <h3 className='font-semibold'>{title}</h3>
                <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section id='how' className='border-border/60 border-y'>
          <div className='mx-auto max-w-6xl px-4 py-20'>
            <SectionHeading
              eyebrow='How it works'
              title='From blank page to interview-ready in 3 steps'
            />
            <div className='mt-12 grid gap-6 md:grid-cols-3'>
              {STEPS.map(({ n, title, body }) => (
                <div key={n} className='relative'>
                  <div className='text-primary/30 text-5xl font-extrabold'>
                    {n}
                  </div>
                  <h3 className='mt-2 text-lg font-semibold'>{title}</h3>
                  <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Chat assistant ---- */}
        <section className='mx-auto max-w-6xl px-4 py-20'>
          <div className='grid items-center gap-10 lg:grid-cols-2'>
            <div>
              <span className='text-primary text-xs font-semibold tracking-widest uppercase'>
                AI chat assistant
              </span>
              <h2 className='mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl'>
                Build your résumé by chatting
              </h2>
              <p className='text-muted-foreground mt-4 text-balance'>
                No forms to wrestle with. Tell the assistant what you want in
                plain English and it edits your résumé live. It rewrites
                bullets, works in keywords, and saves as it goes.
              </p>
              <ul className='mt-6 flex flex-col gap-3 text-sm'>
                {[
                  'Rewrites summaries and bullets on request',
                  'Tailors your skills to the job you paste',
                  'Every change previews live and auto-saves'
                ].map((item) => (
                  <li key={item} className='flex items-center gap-2'>
                    <IconCheck className='text-primary size-4 shrink-0' />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref} className={cn(buttonVariants(), 'mt-8')}>
                Try the assistant
                <IconArrowRight className='size-4' />
              </Link>
            </div>

            {/* Mock chat */}
            <div className='border-border bg-card border p-4 shadow-lg'>
              <div className='border-border/60 mb-3 flex items-center gap-2 border-b pb-3'>
                <span className='bg-primary/10 text-primary grid size-7 place-items-center'>
                  <IconMessageChatbot className='size-4' />
                </span>
                <span className='text-sm font-semibold'>Résumé assistant</span>
              </div>
              <div className='flex flex-col gap-3'>
                {CHAT.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex',
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] px-3 py-2 text-sm',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {m.text}
                      {m.applied && (
                        <span className='mt-1.5 flex items-center gap-1 text-xs opacity-80'>
                          <IconCheck className='size-3' /> Applied &amp; saved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- Templates ---- */}
        <section id='templates' className='mx-auto max-w-6xl px-4 py-20'>
          <SectionHeading
            eyebrow='Templates'
            title='Pick from ATS-friendly templates'
            subtitle='Clean, recruiter-ready layouts that applicant tracking systems read flawlessly. Switch in a click.'
          />
          <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
            {TEMPLATES.map((name, i) => (
              <div
                key={name}
                className={cn(
                  'border-border bg-card flex flex-col border p-4',
                  i === TEMPLATES.length - 1 && 'border-primary/60'
                )}
              >
                {/* faux résumé preview */}
                <div className='bg-background mb-3 aspect-[3/4] w-full border p-3'>
                  <div className='bg-foreground/70 h-2 w-2/3' />
                  <div className='bg-muted-foreground/50 mt-1.5 h-1.5 w-1/2' />
                  <div className='mt-3 flex flex-col gap-1'>
                    {[...Array(6)].map((_, r) => (
                      <div
                        key={r}
                        className='bg-muted-foreground/25 h-1'
                        style={{ width: `${90 - r * 8}%` }}
                      />
                    ))}
                  </div>
                </div>
                <span className='text-sm font-medium'>{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className='mx-auto max-w-6xl px-4 pb-20'>
          <div className='border-primary/40 bg-card relative overflow-hidden border p-10 text-center md:p-16'>
            <IconBolt className='text-primary/20 absolute -top-4 -right-4 size-40' />
            <h2 className='text-2xl font-bold text-balance md:text-4xl'>
              Ready for a résumé that gets noticed?
            </h2>
            <p className='text-muted-foreground mx-auto mt-4 max-w-xl text-balance'>
              Turn your experience into an ATS-optimized, job-specific résumé.
              Your next application starts here.
            </p>
            <Link
              href={ctaHref}
              className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}
            >
              {ctaLabel}
              <IconArrowRight className='size-4' />
            </Link>
          </div>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer className='border-border/60 border-t'>
        <div className='text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row'>
          <div className='flex items-center'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo-on-light.png'
              alt='CVTailor'
              width={140}
              height={23}
              className='h-6 w-auto dark:hidden'
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/logo-on-dark.png'
              alt='CVTailor'
              width={140}
              height={23}
              className='hidden h-6 w-auto dark:block'
            />
          </div>
          <p>Build ATS-ready résumés with AI.</p>
          <div className='flex items-center gap-6'>
            <a href='#features' className='hover:text-foreground transition'>
              Features
            </a>
            <Link href='/sign-in' className='hover:text-foreground transition'>
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className='mx-auto max-w-2xl text-center'>
      <span className='text-primary text-xs font-semibold tracking-widest uppercase'>
        {eyebrow}
      </span>
      <h2 className='mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl'>
        {title}
      </h2>
      {subtitle && (
        <p className='text-muted-foreground mt-4 text-balance'>{subtitle}</p>
      )}
    </div>
  );
}
