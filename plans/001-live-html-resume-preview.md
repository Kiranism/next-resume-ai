# Plan 001: Instant live HTML resume preview (PDF generated only on export)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat f464c9c..HEAD -- src/features/resume/components/resume-edit-content.tsx src/features/resume/components/pdf-renderer.tsx src/features/resume/templates`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (explicitly requested by the maintainer)
- **Effort**: L (multi-day — creates 6 files, edits 1)
- **Risk**: MED — changes the on-screen preview mechanism; download/save paths must keep working
- **Depends on**: none
- **Category**: perf / correctness / feature
- **Planned at**: commit `f464c9c`, 2026-07-21

## Why this matters

Today, typing a single character in the resume editor regenerates the **entire
PDF** and re-parses it with pdf.js, causing the preview pane to blank out and
flash ("splash") on every keystroke. The maintainer's goal, verbatim: *"the
input or change the user is making should be immediately visible in the pdf
preview."*

A `@react-pdf/renderer` preview is a rasterized PDF canvas — its text cannot
change without regenerating the whole document, so it can never be truly live.
The fix is to make the **on-screen editing preview a live HTML/DOM rendering**
of the resume data (React updates the DOM instantly on every keystroke, with no
PDF work and no flash), while the real `@react-pdf` PDF is generated **only when
the user clicks Download** (and for the save-thumbnail snapshot). This is the
standard architecture for instant resume builders.

After this lands: editing feels live (character-by-character, zero flash), the
downloaded PDF is byte-for-byte the same as before (same `@react-pdf`
templates), and the per-keystroke CPU cost drops from "regenerate a full PDF" to
"update some DOM."

## Current state

The app has four resume designs as `@react-pdf/renderer` components; the editor
renders a live PDF via `PdfRenderer`, which is what flashes.

Relevant files (each with its role):

- `src/features/resume/components/resume-edit-content.tsx` — the split-pane
  editor. Left pane = form, right pane = live preview. **This is the only file
  this plan modifies.** It currently renders `<PdfRenderer>` on every keystroke.
- `src/features/resume/components/pdf-renderer.tsx` — the raster PDF preview
  (uses `pdf().toBlob()` + `react-pdf`/pdf.js). Cause of the flash. Left in place
  but no longer used by the editor after this plan.
- `src/features/resume/templates/registry.ts` — maps `templateId` →
  `@react-pdf` template component. Keys: `template-one`, `template-two`,
  `template-three`, `template-four`. **Keep using this for PDF export.**
- `src/features/resume/templates/templateOne.tsx` … `templateFour.tsx` — the
  four `@react-pdf` designs. **Do not modify.** You will create HTML twins of
  them.
- `src/features/resume/components/edit-resume-form.tsx` — the "Sync & Save"
  flow. Its `handleResumeSnapShot()` calls `html2canvas` over the DOM node with
  `id="resume-pdf-preview"`. Your new preview must keep that id so save still
  produces a thumbnail. **Do not modify** (it keeps working unchanged).

### Excerpt — `resume-edit-content.tsx` (the parts you will change)

Lines 45–66 (data + the value that must drive the live preview):

```tsx
  const initalData: TResumeEditFormValues = {
    resume_id: resume?.id || '',
    personal_details:
      resume?.personalDetails as TResumeEditFormValues['personal_details'],
    jobs: resume?.jobs as TResumeEditFormValues['jobs'],
    educations: resume?.education as TResumeEditFormValues['educations'],
    skills: resume?.skills as TResumeEditFormValues['skills'],
    tools: resume?.tools as TResumeEditFormValues['tools'],
    languages: resume?.languages as TResumeEditFormValues['languages']
  };

  console.log('resume data', resume);          // <-- remove (hot path, logs PII)
  console.log('intialdata', initalData);       // <-- remove

  const form = useForm<TResumeEditFormValues>({
    resolver: zodResolver(resumeEditFormSchema),
    defaultValues: initalData,
    mode: 'onChange',
    shouldFocusError: false
  });

  const formData = form.watch();
```

Lines 74–106 (the two spots that render the flashing PDF):

```tsx
  const renderContent = () => {
    if (mode === 'edit') {
      return <EditResumeForm form={form} />;
    }
    if (mode === 'template') { /* ...unchanged... */ }
    if (mode === 'preview') {
      return (
        <div className='relative flex h-full justify-center bg-accent pt-4'>
          <div className='origin-top scale-75'>
            <PdfRenderer formData={formData} templateId={selectedTemplate} />
          </div>
        </div>
      );
    }
  };

  // Extract PDF preview component
  const PdfPreview = () => (            // <-- inline component; remounts every render (the bug)
    <div className='relative flex h-full justify-center bg-accent pt-2'>
      <div className='scale-90'>
        <PdfRenderer formData={formData} templateId={selectedTemplate} />
      </div>
    </div>
  );
```

Lines 133–139 (the desktop right pane that uses `PdfPreview`):

```tsx
          <ResizablePanel defaultSize={55} minSize={45}>
            <div className='h-full w-full'>
              <ScrollArea className='h-[calc(100vh)]'>
                <PdfPreview />
              </ScrollArea>
            </div>
          </ResizablePanel>
```

### Repo conventions to match

- Components are function components with **named exports** (except the four PDF
  templates, which use `export default`). New presentational template twins use
  `export default` to mirror the existing templates; the two new components
  (`LiveResumePreview`, `ResumeDownloadButton`) use **named** exports.
- Styling is **Tailwind classes** (the project already uses Tailwind app-wide).
  `react-pdf-tailwind`'s `createTw` accepts almost the same class strings, so
  translation is nearly 1:1 (see the translation rules in Step 1).
- Import alias: `@/` → `src/` (e.g. `import { Button } from '@/components/ui/button'`).
- Files with JSX are `.tsx`. Client components that use hooks/`useState` start
  with `'use client';`. Pure presentational children (the HTML templates) do
  **not** need the directive — they inherit client context from their parent.

## Commands you will need

| Purpose   | Command                              | Expected on success        |
|-----------|--------------------------------------|----------------------------|
| Install   | `pnpm install`                       | exit 0 (node_modules built)|
| Typecheck | `pnpm exec tsc --noEmit`             | exit 0, no errors          |
| Lint      | `pnpm lint`                          | exit 0, no **new** errors  |
| Dev (manual) | `pnpm dev`                        | app on http://localhost:3000 |

Notes:
- `node_modules` is not installed in a fresh checkout — run `pnpm install` first.
- There is **no** `typecheck` script in `package.json`; use `pnpm exec tsc --noEmit`.
- `pnpm build` and `pnpm dev` require env vars (`DATABASE_URL`, Clerk keys, etc.
  — see `env.example.txt`). If you do not have them, you cannot run the app;
  rely on typecheck + lint + the grep done-criteria, and record in your report
  that the manual keystroke check was not run.

## Scope

**In scope** (create these):

- `src/features/resume/templates/html/html-template-one.tsx` (create)
- `src/features/resume/templates/html/html-template-two.tsx` (create)
- `src/features/resume/templates/html/html-template-three.tsx` (create)
- `src/features/resume/templates/html/html-template-four.tsx` (create)
- `src/features/resume/templates/html/html-registry.ts` (create)
- `src/features/resume/components/live-resume-preview.tsx` (create)
- `src/features/resume/components/resume-download-button.tsx` (create)

**In scope** (modify this one file):

- `src/features/resume/components/resume-edit-content.tsx`

**Out of scope** (do NOT touch, even though they look related):

- `src/features/resume/templates/templateOne.tsx` … `templateFour.tsx` — the
  `@react-pdf` designs; the download still uses them, so leaving them unchanged
  guarantees the exported PDF is identical. (They have a pre-existing empty-array
  `0`-render bug — do **not** fix it here; it is tracked separately.)
- `src/features/resume/components/pdf-renderer.tsx` — leave as-is; it is simply
  no longer imported by the editor.
- `src/features/resume/components/edit-resume-form.tsx` — the save/snapshot flow
  keeps working because your preview keeps `id="resume-pdf-preview"`.
- `src/features/resume/templates/registry.ts` — read it, don't change it.
- Any form field component, the DB, or any router.

## Git workflow

- Branch: `advisor/001-live-html-resume-preview`.
- Commit style follows the repo (Conventional Commits — recent history shows
  `feat:`, `fix:`). Example commit: `feat: live html resume preview (no pdf flash)`.
- Commit per logical step (templates, then registry+preview+download, then the
  edit-content wiring) so the history is bisectable.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the four HTML template twins

Create `src/features/resume/templates/html/` and add the four files below.
These are DOM translations of the `@react-pdf` templates, following these rules
(so future translations stay consistent):

**Translation rules (`@react-pdf` → HTML):**
1. `<View style={tw('X')}>` → `<div className='X'>`; `<Text style={tw('X')}>` → `<p className='X'>` (or `<span>` when it must sit inline in a row).
2. `@react-pdf` `<View>` defaults to `flex-direction: column`. A DOM `<div>`
   defaults to `display:block`. Wherever a container used flex utilities
   (`gap-*`, `flex-1`, `items-*`, `justify-*`, `flex-[0.7]`) **without** an
   explicit direction, add `flex flex-col`. `gap-*` only works on a flex/grid
   container in the DOM, so any `gap-*` div must also be `flex`.
3. Custom theme colors from each template's `createTw` (`text-muted`,
   `text-primary`, `text-accent`, `bg-primary`, `bg-surface`, `border-accent`,
   etc.) must become **explicit hex arbitrary values** (e.g. `text-[#64748b]`) —
   because the app's own Tailwind config defines `muted`/`primary` as different
   (shadcn) colors and would change the look. The exact hex per template is in
   each file's `createTw` block and is reproduced in the code below.
4. Fix the empty-list guards while translating: iterate over `arr ?? []` and
   gate whole sections with `arr.length > 0` (never `{arr.length && …}` — in
   React a leading `0` renders a literal "0").

Create `src/features/resume/templates/html/html-template-one.tsx`
(colors: `muted` = `#7f7f7f`):

```tsx
import { HtmlTemplateProps } from './html-registry';

export default function HtmlTemplateOne({ formData }: HtmlTemplateProps) {
  const pd = formData?.personal_details;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const educations = formData?.educations ?? [];
  const jobs = formData?.jobs ?? [];

  return (
    <div className='flex flex-row flex-wrap'>
      <div className='h-5 w-[30%] bg-black' />
      <div className='h-5 w-[70%]' />

      {/* Black section */}
      <div className='flex w-[30%] min-w-[30%] flex-col gap-2 self-stretch bg-black p-5 pt-0 text-white'>
        <p className='text-2xl font-bold'>
          {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
        </p>
        <p className='text-sm'>{pd?.email ?? 'Email'}</p>
        <p className='text-sm'>{pd?.phone ?? 'Phone Number'}</p>
        <p className='text-sm'>
          {pd?.city ?? 'City'}, {pd?.country ?? 'Country'}
        </p>

        <p className='text-[#7f7f7f]'>Skills</p>
        {skills.map((s, i) => (
          <div key={i} className='flex flex-row flex-wrap items-center gap-2'>
            <span>&bull;</span>
            <span className='text-sm'>{s.skill_name}</span>
          </div>
        ))}

        <p className='text-[#7f7f7f]'>Tools</p>
        {tools.map((t, i) => (
          <div key={i} className='flex flex-row flex-wrap items-center gap-2'>
            <span>&bull;</span>
            <span className='text-sm'>{t.tool_name}</span>
          </div>
        ))}

        <p className='text-[#7f7f7f]'>Languages</p>
        {languages.map((l, i) => (
          <div key={i} className='flex flex-row flex-wrap items-center gap-2'>
            <span>&bull;</span>
            <span className='text-sm'>{l.lang_name}</span>
          </div>
        ))}
      </div>

      {/* White section */}
      <div className='flex w-[70%] min-w-[70%] flex-col gap-4 bg-white p-5 pt-0'>
        <div className='flex flex-col'>
          <p className='text-2xl font-bold text-[#7f7f7f]'>Summary</p>
          <p className='text-sm'>{pd?.summary ?? 'Summary'}</p>
        </div>

        <div className='flex flex-col'>
          <p className='text-2xl font-bold text-[#7f7f7f]'>Education</p>
          <div className='flex flex-col gap-6'>
            {educations.map((edu, i) => (
              <div key={i}>
                <p className='text-lg font-bold'>
                  {edu?.degree ?? 'Degree'} in {edu?.field ?? 'Field'} |{' '}
                  {edu?.school ?? 'School'}
                </p>
                <p className='text-lg font-bold'>
                  {edu?.startDate ?? 'Start Date'} - {edu?.endDate ?? 'End Date'}
                </p>
                <p className='text-sm'>{edu?.description ?? ''}</p>
              </div>
            ))}
          </div>
        </div>

        <div className='flex flex-col'>
          <p className='text-2xl font-bold text-[#7f7f7f]'>Employment History</p>
          <div className='flex flex-col gap-6'>
            {jobs.map((job, i) => (
              <div key={i}>
                <p className='text-lg font-bold'>
                  {job?.jobTitle ?? 'Job Title'} | {job?.employer ?? 'Employer'}
                </p>
                <p className='text-lg font-bold'>
                  {job?.startDate ?? 'Start Date'} - {job?.endDate ?? 'End Date'}
                </p>
                <p className='text-sm'>{job?.description ?? ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Create `src/features/resume/templates/html/html-template-two.tsx`
(colors: `primary` = `#2563eb`, `muted` = `#64748b`, `accent` = `#3b82f6`):

```tsx
import { HtmlTemplateProps } from './html-registry';

function Bullets({ items }: { items: string[] }) {
  return (
    <div className='flex flex-col'>
      {items.map((name, i) => (
        <div key={i} className='flex flex-row flex-wrap items-center gap-1'>
          <span className='text-[#3b82f6]'>&bull;</span>
          <span className='text-sm'>{name}</span>
        </div>
      ))}
    </div>
  );
}

export default function HtmlTemplateTwo({ formData }: HtmlTemplateProps) {
  const pd = formData?.personal_details;
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];

  return (
    <div className='p-6'>
      <div className='mb-6 h-4 w-full bg-[#2563eb]' />

      <div className='mb-6 mt-6 text-center'>
        <p className='text-3xl font-bold text-[#2563eb]'>
          {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
        </p>
        <div className='mt-2 flex flex-row justify-center gap-4'>
          <span className='text-sm text-[#64748b]'>{pd?.email ?? 'Email'}</span>
          <span className='text-sm text-[#64748b]'>{pd?.phone ?? 'Phone'}</span>
          <span className='text-sm text-[#64748b]'>
            {pd?.city ?? 'City'}, {pd?.country ?? 'Country'}
          </span>
        </div>
      </div>

      <div className='mb-6'>
        <p className='mb-2 text-lg font-bold text-[#2563eb]'>
          Professional Summary
        </p>
        <p className='text-sm'>{pd?.summary ?? 'Summary'}</p>
      </div>

      <div className='flex flex-row'>
        <div className='w-2/3 pr-4'>
          <div className='mb-6'>
            <p className='mb-2 text-lg font-bold text-[#2563eb]'>
              Work Experience
            </p>
            <div className='flex flex-col gap-4'>
              {jobs.map((job, i) => (
                <div key={i}>
                  <p className='font-bold'>{job?.jobTitle ?? 'Job Title'}</p>
                  <p className='text-sm text-[#64748b]'>
                    {job?.employer ?? 'Employer'} | {job?.startDate ?? 'Start'} -{' '}
                    {job?.endDate ?? 'End'}
                  </p>
                  <p className='mt-1 text-sm'>{job?.description ?? ''}</p>
                </div>
              ))}
            </div>
          </div>

          <div className='mb-6'>
            <p className='mb-2 text-lg font-bold text-[#2563eb]'>Education</p>
            <div className='flex flex-col gap-4'>
              {educations.map((edu, i) => (
                <div key={i}>
                  <p className='font-bold'>
                    {edu?.degree ?? 'Degree'} in {edu?.field ?? 'Field'}
                  </p>
                  <p className='text-sm text-[#64748b]'>
                    {edu?.school ?? 'School'} | {edu?.startDate ?? 'Start'} -{' '}
                    {edu?.endDate ?? 'End'}
                  </p>
                  <p className='mt-1 text-sm'>{edu?.description ?? ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='w-1/3 border-l border-[#e5e7eb] pl-4'>
          <div className='mb-6'>
            <p className='mb-2 text-lg font-bold text-[#2563eb]'>Skills</p>
            <Bullets items={skills.map((s) => s.skill_name)} />
          </div>
          <div className='mb-6'>
            <p className='mb-2 text-lg font-bold text-[#2563eb]'>Tools</p>
            <Bullets items={tools.map((t) => t.tool_name)} />
          </div>
          <div className='mb-6'>
            <p className='mb-2 text-lg font-bold text-[#2563eb]'>Languages</p>
            <Bullets items={languages.map((l) => l.lang_name)} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

Create `src/features/resume/templates/html/html-template-three.tsx`
(colors: `primary` = `#334155`, `secondary` = `#94a3b8`, `accent` = `#0ea5e9`,
`muted` = `#64748b`, `background` = `#f8fafc`):

```tsx
import { HtmlTemplateProps } from './html-registry';

function Bullets({ items }: { items: string[] }) {
  return (
    <div>
      {items.map((name, i) => (
        <div key={i} className='flex flex-row flex-wrap items-center gap-1'>
          <span className='text-[#0ea5e9]'>&#9473;</span>
          <span className='text-sm'>{name}</span>
        </div>
      ))}
    </div>
  );
}

export default function HtmlTemplateThree({ formData }: HtmlTemplateProps) {
  const pd = formData?.personal_details;
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];

  return (
    <div className='bg-[#f8fafc] p-8'>
      <div className='mb-6 border-b border-[#94a3b8] pb-4'>
        <p className='mb-2 text-4xl font-bold text-[#334155]'>
          {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
        </p>
        <div className='flex flex-row gap-4'>
          {pd?.email && <span className='text-sm text-[#64748b]'>{pd.email}</span>}
          {pd?.phone && <span className='text-sm text-[#64748b]'>{pd.phone}</span>}
          {(pd?.city || pd?.country) && (
            <span className='text-sm text-[#64748b]'>
              {pd?.city}
              {pd?.city && pd?.country ? ', ' : ''}
              {pd?.country}
            </span>
          )}
        </div>
      </div>

      <div className='flex flex-row gap-8'>
        <div className='flex flex-[0.7] flex-col gap-6'>
          {pd?.summary && (
            <div>
              <p className='mb-2 text-lg font-bold text-[#0ea5e9]'>
                Professional Summary
              </p>
              <p className='text-sm leading-relaxed'>{pd.summary}</p>
            </div>
          )}

          {jobs.length > 0 && (
            <div>
              <p className='mb-2 text-lg font-bold text-[#0ea5e9]'>
                Work Experience
              </p>
              <div className='flex flex-col gap-4'>
                {jobs.map((job, i) => (
                  <div key={i}>
                    <p className='font-bold text-[#334155]'>
                      {job?.jobTitle ?? ''} {job?.employer ? `| ${job.employer}` : ''}
                    </p>
                    {(job?.startDate || job?.endDate) && (
                      <p className='mb-1 text-sm text-[#64748b]'>
                        {job?.startDate ?? ''} - {job?.endDate ?? ''}
                      </p>
                    )}
                    {job?.description && <p className='text-sm'>{job.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {educations.length > 0 && (
            <div>
              <p className='mb-2 text-lg font-bold text-[#0ea5e9]'>Education</p>
              <div className='flex flex-col gap-4'>
                {educations.map((edu, i) => (
                  <div key={i}>
                    <p className='font-bold text-[#334155]'>
                      {edu?.degree ?? ''} {edu?.field ? `in ${edu.field}` : ''}
                    </p>
                    <p className='mb-1 text-sm text-[#64748b]'>
                      {edu?.school ?? ''}
                      {edu?.startDate || edu?.endDate ? ' | ' : ''}
                      {edu?.startDate ?? ''} - {edu?.endDate ?? ''}
                    </p>
                    {edu?.description && <p className='text-sm'>{edu.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className='flex flex-[0.3] flex-col gap-6'>
          {skills.length > 0 && (
            <div>
              <p className='mb-2 text-lg font-bold text-[#0ea5e9]'>Skills</p>
              <Bullets items={skills.map((s) => s.skill_name)} />
            </div>
          )}
          {tools.length > 0 && (
            <div>
              <p className='mb-2 text-lg font-bold text-[#0ea5e9]'>Tools</p>
              <Bullets items={tools.map((t) => t.tool_name)} />
            </div>
          )}
          {languages.length > 0 && (
            <div>
              <p className='mb-2 text-lg font-bold text-[#0ea5e9]'>Languages</p>
              <Bullets items={languages.map((l) => l.lang_name)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

Create `src/features/resume/templates/html/html-template-four.tsx`
(colors: `primary` = `#1a1a1a`, `accent` = `#666666`, `muted` = `#808080`):

```tsx
import { ReactNode } from 'react';
import { HtmlTemplateProps } from './html-registry';

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className='mb-3 border-b border-[#666666]'>
      <p className='mb-1 text-lg font-bold text-[#1a1a1a]'>{children}</p>
    </div>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <div className='flex flex-row items-start gap-2'>
      <span className='text-[#666666]'>&bull;</span>
      <span className='flex-1 text-sm'>{text}</span>
    </div>
  );
}

export default function HtmlTemplateFour({ formData }: HtmlTemplateProps) {
  const pd = formData?.personal_details;
  const skills = formData?.skills ?? [];
  const jobs = formData?.jobs ?? [];
  const tools = formData?.tools ?? [];
  const educations = formData?.educations ?? [];

  return (
    <div className='p-10'>
      <div className='mb-6 text-center'>
        <p className='mb-2 text-3xl font-bold'>
          {pd?.fname ?? ''} {pd?.lname ?? ''}
        </p>
        <div className='flex flex-row justify-center gap-4'>
          {pd?.phone && <span className='text-sm'>{pd.phone}</span>}
          {pd?.email && <span className='text-sm'>{pd.email}</span>}
          {(pd?.city || pd?.country) && (
            <span className='text-sm'>
              {pd?.city}
              {pd?.city && pd?.country ? ', ' : ''}
              {pd?.country}
            </span>
          )}
        </div>
      </div>

      {skills.length > 0 && (
        <div className='mb-6'>
          <SectionTitle>Technical Skills</SectionTitle>
          <div className='flex flex-row flex-wrap gap-1'>
            {skills.map((skill, i) => (
              <span key={i} className='text-sm'>
                {skill?.skill_name}
                {i < skills.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className='mb-6'>
          <SectionTitle>Work Experience</SectionTitle>
          {jobs.map((job, i) => (
            <div key={i} className='mb-4'>
              <div className='mb-1 flex flex-row justify-between'>
                <span className='text-sm font-bold'>{job?.employer ?? ''}</span>
                <span className='text-sm text-[#666666]'>
                  {job?.startDate ?? ''} - {job?.endDate ?? ''}
                </span>
              </div>
              <p className='mb-1 text-sm font-bold'>{job?.jobTitle ?? ''}</p>
              {job?.description && <BulletPoint text={job.description} />}
            </div>
          ))}
        </div>
      )}

      {tools.length > 0 && (
        <div className='mb-6'>
          <SectionTitle>Projects</SectionTitle>
          {tools.map((tool, i) => (
            <div key={i} className='mb-3'>
              <p className='mb-1 text-sm font-bold'>{tool?.tool_name ?? ''}</p>
              <BulletPoint text={tool?.proficiency_level ?? ''} />
            </div>
          ))}
        </div>
      )}

      {educations.length > 0 && (
        <div className='mb-6'>
          <SectionTitle>Education</SectionTitle>
          {educations.map((edu, i) => (
            <div key={i} className='mb-3'>
              <div className='mb-1 flex flex-row justify-between'>
                <span className='text-sm font-bold'>
                  {edu?.degree ?? ''} {edu?.field ? `in ${edu.field}` : ''}
                </span>
                {(edu?.startDate || edu?.endDate) && (
                  <span className='text-sm text-[#666666]'>
                    {edu?.startDate ?? ''} - {edu?.endDate ?? ''}
                  </span>
                )}
              </div>
              {edu?.school && <p className='text-sm'>{edu.school}</p>}
              {edu?.description && <BulletPoint text={edu.description} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0 (the files reference
`HtmlTemplateProps`, which you create in Step 2, so this may report a
missing-module error until Step 2 is done — that's expected; re-run after Step 2).

### Step 2: Create the HTML template registry

Create `src/features/resume/templates/html/html-registry.ts`:

```ts
import { ComponentType } from 'react';
import { TResumeEditFormValues } from '../../utils/form-schema';
import HtmlTemplateOne from './html-template-one';
import HtmlTemplateTwo from './html-template-two';
import HtmlTemplateThree from './html-template-three';
import HtmlTemplateFour from './html-template-four';

export type HtmlTemplateProps = {
  formData: TResumeEditFormValues;
};

const htmlTemplateRegistry: Record<string, ComponentType<HtmlTemplateProps>> = {
  'template-one': HtmlTemplateOne,
  'template-two': HtmlTemplateTwo,
  'template-three': HtmlTemplateThree,
  'template-four': HtmlTemplateFour
};

// Falls back to template-one so an unknown/empty id never renders blank.
export const getHtmlTemplate = (
  templateId: string
): ComponentType<HtmlTemplateProps> =>
  htmlTemplateRegistry[templateId] ?? HtmlTemplateOne;
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0 (all four template files + registry
now typecheck together).

### Step 3: Create the live preview component

Create `src/features/resume/components/live-resume-preview.tsx`. This is the
A4-sized white "sheet" that renders the selected HTML template. It carries
`id="resume-pdf-preview"` on the **unscaled** sheet so the existing save-snapshot
(`html2canvas`) still works.

```tsx
'use client';

import { getHtmlTemplate } from '@/features/resume/templates/html/html-registry';
import { TResumeEditFormValues } from '@/features/resume/utils/form-schema';

type LiveResumePreviewProps = {
  formData: TResumeEditFormValues;
  templateId: string;
};

// A4 at 96dpi ≈ 794 x 1123 px. Single continuous sheet — real page breaks
// live only in the downloaded @react-pdf PDF (see Maintenance notes).
export function LiveResumePreview({
  formData,
  templateId
}: LiveResumePreviewProps) {
  const Template = getHtmlTemplate(templateId);

  return (
    <div className='origin-top scale-90'>
      <div
        id='resume-pdf-preview'
        className='w-[794px] min-h-[1123px] bg-white text-black shadow-md'
        style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
      >
        <Template formData={formData} />
      </div>
    </div>
  );
}
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0.

### Step 4: Create the on-demand PDF download button

Create `src/features/resume/components/resume-download-button.tsx`. It generates
the real `@react-pdf` PDF **only when clicked** (never while typing), and revokes
the blob URL after — so there is zero per-keystroke PDF work and no memory leak.

```tsx
'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { getTemplate } from '@/features/resume/templates/registry';
import { TResumeEditFormValues } from '@/features/resume/utils/form-schema';

type ResumeDownloadButtonProps = {
  formData: TResumeEditFormValues;
  templateId: string;
};

export function ResumeDownloadButton({
  formData,
  templateId
}: ResumeDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    const template = getTemplate(templateId);
    const Template = template?.component;
    if (!Template) return;

    setIsGenerating(true);
    let url: string | null = null;
    try {
      const blob = await pdf(<Template formData={formData} />).toBlob();
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `next-resume-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      if (url) URL.revokeObjectURL(url);
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isGenerating}>
      {isGenerating ? 'Generating…' : 'Download PDF'}
    </Button>
  );
}
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0.

### Step 5: Wire the editor to use the live preview

Edit **only** `src/features/resume/components/resume-edit-content.tsx`:

1. **Remove** the `PdfRenderer` import (line 11) and **add** the two new imports:

   ```tsx
   import { LiveResumePreview } from '@/features/resume/components/live-resume-preview';
   import { ResumeDownloadButton } from '@/features/resume/components/resume-download-button';
   ```

2. **Delete** the two `console.log` lines (currently lines 56–57):
   `console.log('resume data', resume);` and `console.log('intialdata', initalData);`.

3. In `renderContent`, replace the `mode === 'preview'` branch body so it renders
   the live preview instead of `PdfRenderer`:

   ```tsx
   if (mode === 'preview') {
     return (
       <div className='relative flex h-full justify-center bg-accent pt-4'>
         <LiveResumePreview formData={formData} templateId={selectedTemplate} />
       </div>
     );
   }
   ```

4. **Delete** the entire inline `PdfPreview` component definition (currently lines
   99–106, the `const PdfPreview = () => ( … );` block). Defining a component
   inside render is what remounts the preview every keystroke.

5. In the desktop right pane (currently lines 133–139), replace `<PdfPreview />`
   with a stable download header + the live preview:

   ```tsx
   <ResizablePanel defaultSize={55} minSize={45}>
     <div className='h-full w-full'>
       <div className='flex justify-end p-2'>
         <ResumeDownloadButton
           formData={formData}
           templateId={selectedTemplate}
         />
       </div>
       <ScrollArea className='h-[calc(100vh-56px)]'>
         <div className='relative flex justify-center bg-accent pt-2'>
           <LiveResumePreview
             formData={formData}
             templateId={selectedTemplate}
           />
         </div>
       </ScrollArea>
     </div>
   </ResizablePanel>
   ```

Leave everything else in the file (mode toggle, template selection, mobile
layout, the `useEffect`, `initalData`, the form setup) unchanged.

**Verify**:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0, no new errors
- `grep -n "PdfRenderer" src/features/resume/components/resume-edit-content.tsx` → **no matches**
- `grep -n "console.log" src/features/resume/components/resume-edit-content.tsx` → **no matches**

### Step 6: Manual verification (only if you have a runnable env)

If you have the env vars from `env.example.txt` and a working `DATABASE_URL`:

1. `pnpm dev`, sign in, open an existing resume's edit page.
2. Click into the "First name" (or any) field and type several characters.
3. **Expect**: each character appears in the right-pane preview **immediately**,
   with **no blank/flash** and no page reset. This is the acceptance test.
4. Switch templates (template select) — the live preview changes design.
5. Click **Download PDF** — a `.pdf` downloads and looks like the old preview.
6. Click **Sync & Save** — no error toast; the resume list thumbnail updates.

If you cannot run the app, state so in your report and rely on the automated
gates above.

## Test plan

This repo has **no test runner** (no Vitest/Jest, no `test` script). Do **not**
stand one up as part of this plan — that is a separate, already-identified piece
of work (a verification-baseline plan). For this plan, verification is:

- `pnpm exec tsc --noEmit` (types) + `pnpm lint` (lint) both green.
- The grep done-criteria below.
- The Step 6 manual keystroke check when an env is available.

If you want a lightweight safety net without a runner, you may add a plain Node
assertion script under `scripts/` that imports nothing framework-specific — but
this is optional and must not modify `package.json` scripts or add dependencies.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0 with no new errors
- [ ] These files exist: `src/features/resume/templates/html/html-template-one.tsx`,
      `-two.tsx`, `-three.tsx`, `-four.tsx`, `html-registry.ts`,
      `src/features/resume/components/live-resume-preview.tsx`,
      `src/features/resume/components/resume-download-button.tsx`
- [ ] `grep -rn "PdfRenderer" src/features/resume/components/resume-edit-content.tsx` returns no matches
- [ ] `grep -rn "console.log" src/features/resume/components/resume-edit-content.tsx` returns no matches
- [ ] `git status` shows only the 7 new files + the single modified
      `resume-edit-content.tsx` (no other source files touched)
- [ ] `plans/README.md` status row for plan 001 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts don't match the live code (the file drifted since
  commit `f464c9c`).
- The live preview does **not** update on keystroke in Step 6 → `formData` isn't
  flowing into `LiveResumePreview`; do not paper over it — report.
- Typecheck errors point at `@react-pdf` types inside the `html/` files → you
  imported `View`/`Text`/`Document` from `@react-pdf/renderer` by mistake; the
  HTML templates must use **plain DOM elements only**.
- Removing `PdfRenderer` breaks **Download** or the **Sync & Save** thumbnail →
  confirm `LiveResumePreview`'s sheet still has `id="resume-pdf-preview"`; if it
  does and save still fails, stop and report (do not edit `edit-resume-form.tsx`).
- A template's layout comes out clearly wrong (columns collapsed, everything
  stacked) and you can't fix it from the translation rules in Step 1 → stop and
  report which template.

## Maintenance notes

For whoever owns this after it lands:

- **Two sources of truth per design.** Each resume design now exists twice: the
  `@react-pdf` template (`templateOne.tsx` …, used for the downloaded PDF) and
  its HTML twin (`html/html-template-one.tsx` …, used for the live preview). A
  visual change must be made in **both** to keep preview ≈ PDF. A good follow-up
  is to derive both from one spec (this maps to the separately-identified
  "templates duplicate rendering logic" tech-debt finding).
- **Pagination.** The live HTML preview is a single continuous A4-width sheet; it
  does not show page breaks. Real pagination lives only in the downloaded
  `@react-pdf` PDF. If page-accurate preview is needed later, add CSS paged-media
  or a fixed-height/overflow page indicator.
- **Snapshot source changed.** `handleResumeSnapShot()` now captures the HTML
  preview (real DOM) via `html2canvas` instead of a pdf.js canvas — this is
  generally more reliable, but re-check that list thumbnails look correct.
- **Guards.** The HTML templates use correct boolean list guards, so they do not
  reproduce the `{arr.length && …}` → literal-"0" bug that still exists in the
  `@react-pdf` templates. Don't copy the old guard style back in.
- **Reviewer should scrutinize**: that no `@react-pdf` import leaked into the
  `html/` files; that `resume-edit-content.tsx` is the only modified source file;
  that the download still uses the untouched `@react-pdf` templates (identical
  exported PDF).
