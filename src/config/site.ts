// Central site metadata. Shared by the root layout, robots.ts, sitemap.ts and
// the landing-page structured data so SEO fields stay in one place.
// Override the canonical URL per environment with NEXT_PUBLIC_SITE_URL.
export const siteConfig = {
  name: 'CVTailor',
  title: 'CVTailor: Free AI Resume Builder',
  description:
    'CVTailor is a free, open-source AI resume builder. Import a PDF, tailor your resume to the job with AI, and export an ATS-friendly PDF in minutes.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://next-resume-ai.vercel.app',
  ogImage: '/og-image.png',
  author: {
    name: 'Kiran',
    url: 'https://github.com/Kiranism'
  },
  keywords: [
    'AI resume builder',
    'free resume builder',
    'ATS-friendly resume',
    'resume maker',
    'CV builder',
    'tailor resume to job description',
    'resume generator',
    'PDF resume',
    'Next.js resume builder',
    'open source resume builder'
  ]
} as const;
