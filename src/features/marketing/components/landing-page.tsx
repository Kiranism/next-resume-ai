import Link from 'next/link';
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconEye,
  IconFileText,
  IconFileUpload,
  IconLayoutGrid,
  IconMessageChatbot,
  IconSparkles,
  IconTargetArrow
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LandingPageProps {
  isAuthed?: boolean;
}

const FEATURES = [
  {
    icon: IconSparkles,
    title: 'JD-tailored generation',
    body: 'Paste a job description and the AI rewrites your profile into a résumé aimed at that exact role — quantified, keyword-weaved, and honest.'
  },
  {
    icon: IconTargetArrow,
    title: 'Real ATS score',
    body: 'Get a 0–100 match score with the keywords you have, the ones you’re missing, and concrete edits to close the gap.'
  },
  {
    icon: IconEye,
    title: 'Live PDF preview',
    body: 'Every edit re-renders the résumé instantly beside the form — no flicker, no export-and-check loop.'
  },
  {
    icon: IconLayoutGrid,
    title: '5 clean templates',
    body: 'Switch layouts in a click, including an ATS-safe single-column design that parsers read perfectly.'
  },
  {
    icon: IconFileUpload,
    title: 'Import in seconds',
    body: 'Drop in an existing résumé PDF (or paste the text) and we parse it straight into a reusable profile.'
  },
  {
    icon: IconMessageChatbot,
    title: 'Edit by chat',
    body: '“Make my summary punchier”, “add skills for this role” — talk to your résumé and watch it change live.'
  }
];

const STEPS = [
  {
    n: '01',
    title: 'Build your profile',
    body: 'Add your experience once — or import an existing résumé PDF and we’ll fill it in for you.'
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
  'Professional',
  'Modern',
  'Minimalist',
  'Creative',
  'ATS-Friendly'
];

export function LandingPage({ isAuthed = false }: LandingPageProps) {
  const ctaHref = isAuthed ? '/dashboard/resume' : '/sign-in';
  const ctaLabel = isAuthed ? 'Open dashboard' : 'Build my résumé';

  return (
    <div className='bg-background text-foreground min-h-screen'>
      {/* ---- Nav ---- */}
      <header className='border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur'>
        <nav className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <Link href='/' className='flex items-center gap-2 font-bold'>
            <span className='bg-primary text-primary-foreground grid size-7 place-items-center'>
              <IconFileText className='size-4' />
            </span>
            <span className='tracking-wide'>Resume.AI</span>
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
              <Button
                variant='ghost'
                render={<Link href='/sign-in' />}
                className='hidden sm:inline-flex'
              >
                Sign in
              </Button>
            )}
            <Button render={<Link href={ctaHref} />}>
              {ctaLabel}
              <IconArrowRight className='size-4' />
            </Button>
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
              Paste a job description and let the AI turn your profile into an
              ATS-optimized résumé — with a live preview, a real match score,
              and a clean PDF you can send in minutes.
            </p>
            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Button size='lg' render={<Link href={ctaHref} />}>
                {ctaLabel}
                <IconArrowRight className='size-4' />
              </Button>
              <Button size='lg' variant='outline' render={<a href='#how' />}>
                See how it works
              </Button>
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
            subtitle='Built around how real applicant tracking systems actually read a résumé.'
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

        {/* ---- Templates ---- */}
        <section id='templates' className='mx-auto max-w-6xl px-4 py-20'>
          <SectionHeading
            eyebrow='Templates'
            title='Five layouts, one click apart'
            subtitle='Including a single-column, ATS-safe design that parsers read flawlessly.'
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
                {i === TEMPLATES.length - 1 && (
                  <span className='text-primary text-xs'>ATS-safe</span>
                )}
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
              Turn your experience into an ATS-optimized, job-specific résumé —
              your next application starts here.
            </p>
            <Button size='lg' className='mt-8' render={<Link href={ctaHref} />}>
              {ctaLabel}
              <IconArrowRight className='size-4' />
            </Button>
          </div>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer className='border-border/60 border-t'>
        <div className='text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row'>
          <div className='flex items-center gap-2 font-semibold'>
            <span className='bg-primary text-primary-foreground grid size-6 place-items-center'>
              <IconFileText className='size-3.5' />
            </span>
            Resume.AI
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
