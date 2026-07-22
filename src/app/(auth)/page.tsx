import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { LandingPage } from '@/features/marketing/components/landing-page';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' }
};

// SoftwareApplication structured data so search and answer engines can read
// what CVTailor is, that it runs in the browser, and that it is free.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: siteConfig.description,
  url: siteConfig.url,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  author: {
    '@type': 'Person',
    name: siteConfig.author.name,
    url: siteConfig.author.url
  }
};

// Public marketing landing page. Authenticated users get a "dashboard" CTA;
// everyone else gets "sign in / get started".
export default async function Page() {
  const { userId } = await auth();
  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage isAuthed={!!userId} />
    </>
  );
}
