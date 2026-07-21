# Plan 012: ATS-safe single-column template

## Status
- **Priority**: P2 — **Effort**: M — **Risk**: LOW (additive; new file + one registry entry)
- **Depends on**: none — **Category**: feature
- **Planned at**: integration branch `improve/product-upgrades` (post-010)

## Why this matters
The existing templates use multi-column layouts and a black sidebar — structures
that ATS parsers frequently mangle, undercutting the app's "ATS-friendly" claim.
This adds a strictly **single-column, parser-safe** template (plain text, clear
headings, no columns/graphics/tables) so users can pick a layout ATS software
reliably reads. The template picker (`getAllTemplates()`) auto-includes it, so no
picker UI change is needed.

## IMPORTANT — base on integration branch
`git checkout -b advisor-012 improve/product-upgrades`, then `pnpm install`. Commit on `advisor-012`.

## Commands
`pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — CREATE: `src/features/resume/templates/templateFive.tsx`.
IN — EDIT: `src/features/resume/templates/registry.ts`.
OUT: the other 4 templates, pdf-renderer, everything else.

## Step 1 — create `src/features/resume/templates/templateFive.tsx`
```tsx
import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

const tw = createTw({ theme: { extend: {} } });

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

export default function ResumeTemplateFive({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];

  const contactLine = [
    pd?.email,
    pd?.phone,
    [pd?.city, pd?.country].filter(Boolean).join(', ')
  ]
    .filter(Boolean)
    .join('  |  ');

  return (
    <Document>
      <Page size='A4' style={tw('p-10 text-black')}>
        <View style={tw('mb-4')}>
          <Text style={tw('text-2xl font-bold')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-sm')}>{pd.resume_job_title}</Text>
          ) : null}
          {contactLine ? (
            <Text style={tw('text-xs mt-1')}>{contactLine}</Text>
          ) : null}
        </View>

        {summary ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              SUMMARY
            </Text>
            <Text style={tw('text-xs leading-relaxed')}>{summary}</Text>
          </View>
        ) : null}

        {skills.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              SKILLS
            </Text>
            <Text style={tw('text-xs')}>
              {skills
                .map((s) => s.skill_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}

        {jobs.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              EXPERIENCE
            </Text>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <Text style={tw('text-xs font-bold')}>
                  {job?.jobTitle ?? ''}
                  {job?.employer ? `, ${job.employer}` : ''}
                </Text>
                {job?.startDate || job?.endDate || job?.city ? (
                  <Text style={tw('text-xs')}>
                    {[
                      job?.city,
                      [job?.startDate, job?.endDate].filter(Boolean).join(' - ')
                    ]
                      .filter(Boolean)
                      .join('  |  ')}
                  </Text>
                ) : null}
                {job?.description ? (
                  <Text style={tw('text-xs mt-1')}>{job.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {educations.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              EDUCATION
            </Text>
            {educations.map((edu, i) => (
              <View key={i} style={tw('mb-2')}>
                <Text style={tw('text-xs font-bold')}>
                  {edu?.degree ?? ''}
                  {edu?.field ? ` in ${edu.field}` : ''}
                  {edu?.school ? `, ${edu.school}` : ''}
                </Text>
                {edu?.startDate || edu?.endDate ? (
                  <Text style={tw('text-xs')}>
                    {[edu?.startDate, edu?.endDate].filter(Boolean).join(' - ')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {tools.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              TOOLS
            </Text>
            <Text style={tw('text-xs')}>
              {tools
                .map((t) => t.tool_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}

        {languages.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              LANGUAGES
            </Text>
            <Text style={tw('text-xs')}>
              {languages
                .map((l) => l.lang_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
```

## Step 2 — register it in `src/features/resume/templates/registry.ts`
Add the import with the other template imports:
```tsx
import TemplateFive from './templateFive';
```
Then find the `template-four` entry in `templateRegistry` and add a `template-five`
entry after it. The registry currently ends:
```tsx
  'template-four': {
    id: 'template-four',
    name: 'Creative Professional',
    thumbnail: '/templates/default.png',
    description: 'Modern design with creative layout and color accents',
    component: TemplateFour
  }
};
```
Replace with:
```tsx
  'template-four': {
    id: 'template-four',
    name: 'Creative Professional',
    thumbnail: '/templates/default.png',
    description: 'Modern design with creative layout and color accents',
    component: TemplateFour
  },
  'template-five': {
    id: 'template-five',
    name: 'ATS Friendly',
    thumbnail: '/templates/default.png',
    description:
      'Single-column, parser-safe layout optimized for ATS keyword scanning',
    component: TemplateFive
  }
};
```

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `src/features/resume/templates/templateFive.tsx` exists
- [ ] `grep -c "template-five" src/features/resume/templates/registry.ts` → 2 (id + key)
- [ ] `grep -c "0 &&\|length &&" src/features/resume/templates/templateFive.tsx` → 0 (uses `? :` guards, not `&&`, so no stray `0` renders)
- [ ] `git status` shows only the 2 in-scope files

## STOP conditions
- The `template-four` registry block doesn't match (skipped checkout / drift).
- `templateFive.tsx` fails tsc against `TResumeEditFormValues` (a field name is
  wrong) → report the exact type error.

## Maintenance notes
- Uses `? … : null` guards throughout (never `{arr.length && …}`) so it does not
  reproduce the empty-array `0`-render bug present in templates One–Four.
- Thumbnail reuses `/templates/default.png`; add a real preview image later.
- This is the template to recommend to users who will submit through an ATS.
