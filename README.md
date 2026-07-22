<div align="center">
  <h1>CVTailor: Free AI Resume Builder</h1>
  <p>Build an ATS-friendly resume in minutes. Import a PDF, let AI write and tailor each section to the job, preview the PDF live, and export a print-ready file. Open source and built with Next.js 15.</p>

  <p>
    <a href="https://dub.sh/cvtailor"><img src="https://img.shields.io/badge/Live_Demo-000?logo=vercel&logoColor=white" alt="CVTailor live demo"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Kiranism/next-resume-ai" alt="MIT license"></a>
    <a href="https://github.com/Kiranism/next-resume-ai/stargazers"><img src="https://img.shields.io/github/stars/Kiranism/next-resume-ai?style=flat" alt="GitHub stars"></a>
    <img src="https://img.shields.io/badge/Next.js-15-000?logo=next.js&logoColor=white" alt="Next.js 15">
  </p>

  <a href="https://dub.sh/cvtailor"><b>Live Demo</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Kiranism/next-resume-ai/issues">Report a Bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Kiranism/next-resume-ai/issues">Request a Feature</a>
</div>

## Demo

https://github.com/user-attachments/assets/7c9440fd-2083-4916-8ccb-f002c47d0234

## What is CVTailor?

CVTailor is a free, open-source AI resume builder built with Next.js 15 and React 19. It turns your work history into an ATS-friendly resume. Import an existing resume PDF or start from a saved profile, let AI draft and refine each section, preview the PDF live as you edit, and export a print-ready file in one click. Five professional templates are included, with a parser-safe ATS layout as the default.

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Resume templates](#resume-templates)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- **AI writing** for summaries, experience bullets, skills, and more
- **Resume import** from a PDF or pasted text, parsed into an editable profile
- **Job-tailored content:** paste a job description, company, and role, and the AI matches your resume to the posting
- **ATS-friendly templates**, with a single-column, parser-safe layout as the default
- **Live PDF preview** in a split-pane editor that updates as you type
- **Profiles** so you can reuse your details across multiple resumes
- **Auto-save** while you edit
- **One-click PDF export**
- **Dark and light mode**

## How it works

1. **Sign in** to your account (Clerk authentication).
2. **Add your details** by creating a profile, or import a resume PDF to fill it automatically.
3. **Pick a template.** ATS Friendly is selected by default; switch anytime.
4. **Generate with AI.** Draft and refine each section, and tailor the content to a specific job description.
5. **Preview live.** Edit in the split-pane editor and watch the PDF update in real time.
6. **Export to PDF** and download a print-ready file.

## Resume templates

CVTailor ships with five templates. The ATS Friendly template is the default because it reads cleanly in applicant tracking systems.

| Template | Layout | Best for |
| --- | --- | --- |
| **ATS Friendly** (default) | Single-column, parser-safe | Online applications and ATS keyword scanning |
| **Creative Professional** | Modern design with color accents | Design, marketing, and product roles |
| **Professional Split** | Classic two-column | Traditional industries and long histories |
| **Modern Clean** | Single-column with clean typography | General-purpose resumes |
| **Minimalist** | Minimal layout with subtle accents | Content-first, no-frills resumes |

## Tech stack

- **Framework:** [Next.js 15](https://nextjs.org/) with React 19 (App Router)
- **API:** [jstack](https://jstack.app/) on [Hono](https://hono.dev/)
- **Authentication:** [Clerk](https://clerk.com/)
- **AI:** [OpenRouter](https://openrouter.ai/) (OpenAI-compatible), model configurable, default `openai/gpt-4o-mini`
- **PDF generation:** [@react-pdf/renderer](https://react-pdf.org/)
- **Database:** [Drizzle ORM](https://orm.drizzle.team/) with [Neon](https://neon.tech/) Postgres
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) (Base UI)
- **Forms and validation:** [React Hook Form](https://react-hook-form.com/) and [Zod](https://zod.dev)
- **Data fetching:** [TanStack Query](https://tanstack.com/query)

## Getting started

### Prerequisites

- Node.js 20 or newer and [pnpm](https://pnpm.io/)
- A [Neon](https://neon.tech/) (Postgres) database
- A [Clerk](https://clerk.com/) application for auth
- An [OpenRouter](https://openrouter.ai/) API key for the AI features

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Kiranism/next-resume-ai.git
cd next-resume-ai

# 2. Install dependencies
pnpm install
```

### Environment variables

Create a `.env` file in the project root:

```bash
# Database (Neon Postgres)
DATABASE_URL=postgres://user:password@host/db

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI (OpenRouter)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini   # optional; this is the default

# App
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Run it

```bash
# Push the database schema to Neon
pnpm db:push

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## FAQ

### Is CVTailor free?

Yes. CVTailor is free and open source under the MIT license. Use the hosted demo, or self-host your own copy. The AI features run on your own OpenRouter API key, which is pay-as-you-go.

### Are the resumes ATS-friendly?

Yes. The default template is a single-column, parser-safe layout designed for applicant tracking systems. It uses standard fonts and a clean text structure so ATS software can read your details and match keywords.

### Can I import my existing resume?

Yes. Upload a PDF and CVTailor extracts the text into a profile you can review and edit. You can also paste resume text directly.

### Can I tailor my resume to a specific job?

Yes. Add a job description, company, and role, and the AI rewrites your content to match that posting.

### Which AI model does CVTailor use?

CVTailor calls models through OpenRouter, so you can use any supported model. The default is `openai/gpt-4o-mini`, set with the `OPENROUTER_MODEL` environment variable.

### Can I self-host CVTailor?

Yes. Clone the repository, set the environment variables above, run `pnpm db:push`, and deploy to any Node host such as Vercel.

### What can I export?

You export your resume as a PDF, generated in the browser with `@react-pdf/renderer`.

## Contributing

Contributions are welcome. Open an [issue](https://github.com/Kiranism/next-resume-ai/issues) to report a bug or suggest a feature, or send a pull request. Please run `pnpm lint` and `pnpm typecheck` before submitting.

## License

Released under the [MIT License](LICENSE).

Cheers!
