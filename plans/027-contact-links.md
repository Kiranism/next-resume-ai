# Plan 027: Contact links (LinkedIn / GitHub / Portfolio) on profile → resume → templates

## Status
- **Priority**: P1 (requested) — **Effort**: M — **Risk**: MEDIUM (cross-cutting; touches 5 templates)
- **Depends on**: 025 (generation contract), 026 (profile pages) — **Category**: feature
- **Planned at**: integration branch `improve/product-upgrades` (post-026)
- **⚠️ Requires a DB migration**: after integration the maintainer runs `pnpm db:push`
  (adds 3 nullable columns to `profiles`). The executor does NOT touch the DB.

## Why this matters
The contact block has no links — every modern resume needs LinkedIn, and dev/design
roles need GitHub/portfolio. These are factual contact fields, so they live on the
**profile** (entered once), flow into each generated resume's `personal_details`
(no resume-table migration — it's a jsonb object), stay editable in the resume
editor, and render in every template's contact line.

## Data flow (how the pieces connect — do not deviate)
profile columns → profile form/schema/router/import → `generateResumeContent` copies
them into `personal_details` (like email/city) → resume `personal_details` schema +
editor field → all 5 templates read `pd.linkedin/github/website`. `createResume`
already stores `aiGeneratedContent.personal_details` verbatim, so NO resume-router
change is needed.

## Commands
- `pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope (IN — 14 files)
DB: `src/server/db/schema/profiles.ts`
Profile: `src/features/profile/utils/form-schema.ts`, `src/features/profile/components/create-profile-form.tsx`, `src/server/routers/profile-router.ts`, `src/server/services/parse-profile.ts`, `src/features/profile/components/profile-list.tsx` (cleanup only)
Resume: `src/features/resume/utils/form-schema.ts`, `src/features/resume/components/personal-details.tsx`, `src/server/services/ai-resume.ts`
Templates: `src/features/resume/templates/templateOne.tsx` … `templateFive.tsx`
OUT: `resume-router.ts` (no change needed), DB migration files (maintainer runs `db:push`), everything else.

## Git workflow
`git checkout -b advisor-027 improve/product-upgrades`, then `pnpm install`
(if `ERR_PNPM_IGNORED_BUILDS`, re-run `--dangerously-allow-all-builds`; delete any
untracked auto-generated `pnpm-workspace.yaml`, never commit it).
Commit on `advisor-027`: `feat(profile): contact links (LinkedIn/GitHub/portfolio) end to end`. Do NOT push.

---
## Step 1 — DB columns (`src/server/db/schema/profiles.ts`)
Find (the profiles table's city column — note `.notNull()`, unique to profiles):
```ts
  city: text('city').notNull(),
```
Replace with:
```ts
  city: text('city').notNull(),
  linkedin: text('linkedin'),
  github: text('github'),
  website: text('website'),
```

## Step 2 — profile zod schema (`src/features/profile/utils/form-schema.ts`)
Find:
```ts
  city: z.string().min(1, { message: 'Please select a city' }),
  jobs: z.array(jobSchema),
  educations: z.array(educationSchema)
```
Replace with:
```ts
  city: z.string().min(1, { message: 'Please select a city' }),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
  jobs: z.array(jobSchema),
  educations: z.array(educationSchema)
```

## Step 3 — profile form (`src/features/profile/components/create-profile-form.tsx`)
3a. Defaults, no-profile branch. Find:
```ts
      country: '',
      city: '',
      jobs: [],
      educations: []
```
Replace with:
```ts
      country: '',
      city: '',
      linkedin: '',
      github: '',
      website: '',
      jobs: [],
      educations: []
```
3b. Defaults, with-profile branch. Find:
```ts
    city: profile.city,
    jobs: profile.jobs.map((job) => ({
```
Replace with:
```ts
    city: profile.city,
    linkedin: profile.linkedin || '',
    github: profile.github || '',
    website: profile.website || '',
    jobs: profile.jobs.map((job) => ({
```
3c. Step 1 UI — add the three inputs after the City field. Find:
```tsx
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter city' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case 2:
```
Replace with:
```tsx
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter city' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='linkedin'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='linkedin.com/in/you'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='github'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='github.com/you'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='website'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio / Website (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='yoursite.com'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case 2:
```

## Step 4 — profile router (`src/server/routers/profile-router.ts`)
4a. `createProfile` insert. Find:
```ts
            country: input.country,
            city: input.city
          })
```
Replace with:
```ts
            country: input.country,
            city: input.city,
            linkedin: input.linkedin || null,
            github: input.github || null,
            website: input.website || null
          })
```
4b. `updateProfile` set. Find:
```ts
            country: inputData.country,
            city: inputData.city,
            updatedAt: new Date()
```
Replace with:
```ts
            country: inputData.country,
            city: inputData.city,
            linkedin: inputData.linkedin || null,
            github: inputData.github || null,
            website: inputData.website || null,
            updatedAt: new Date()
```
4c. `importProfile` insert. Find:
```ts
            country: parsed.country || '',
            city: parsed.city || ''
          })
```
Replace with:
```ts
            country: parsed.country || '',
            city: parsed.city || '',
            linkedin: parsed.linkedin || null,
            github: parsed.github || null,
            website: parsed.website || null
          })
```

## Step 5 — resume parser (`src/server/services/parse-profile.ts`)
5a. Type. Find:
```ts
  country: string;
  city: string;
  jobs: {
```
Replace with:
```ts
  country: string;
  city: string;
  linkedin: string;
  github: string;
  website: string;
  jobs: {
```
5b. Prompt template. Find:
```ts
  "firstname": "", "lastname": "", "email": "", "contactno": "", "country": "", "city": "",
```
Replace with:
```ts
  "firstname": "", "lastname": "", "email": "", "contactno": "", "country": "", "city": "",
  "linkedin": "", "github": "", "website": "",
```
5c. Return. Find:
```ts
    country: str(p.country),
    city: str(p.city),
    jobs: jobsIn.map((j) => ({
```
Replace with:
```ts
    country: str(p.country),
    city: str(p.city),
    linkedin: str(p.linkedin),
    github: str(p.github),
    website: str(p.website),
    jobs: jobsIn.map((j) => ({
```

## Step 6 — resume personal_details schema (`src/features/resume/utils/form-schema.ts`)
Find:
```ts
      summary: z
        .string()
        .min(3, { message: 'Please enter a summary' })
        .optional()
        .nullable()
    })
    .optional(),
```
Replace with:
```ts
      summary: z
        .string()
        .min(3, { message: 'Please enter a summary' })
        .optional()
        .nullable(),
      linkedin: z.string().optional().nullable(),
      github: z.string().optional().nullable(),
      website: z.string().optional().nullable()
    })
    .optional(),
```

## Step 7 — resume editor fields (`src/features/resume/components/personal-details.tsx`)
Add three fields after the Phone field. Find (the whole phone FormField):
```tsx
        <FormField
          control={control}
          name='personal_details.phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type='tel' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
```
Replace with that SAME block followed by:
```tsx
        <FormField
          control={control}
          name='personal_details.phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type='tel' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.linkedin'
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.github'
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.website'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio / Website</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
```

## Step 8 — generation copies links into personal_details (`src/server/services/ai-resume.ts`)
Find:
```ts
        city: profile.city,
        summary: content.personal_details?.summary || ''
      },
```
Replace with:
```ts
        city: profile.city,
        linkedin: profile.linkedin ?? '',
        github: profile.github ?? '',
        website: profile.website ?? '',
        summary: content.personal_details?.summary || ''
      },
```

## Step 9 — templates (render the links in the contact line)

### 9a. `templateFour.tsx` — append to the `contact` array. Find:
```tsx
  const contact = [
    pd?.phone,
    pd?.email,
    [pd?.city, pd?.country].filter(Boolean).join(', ')
  ]
```
Replace with:
```tsx
  const contact = [
    pd?.phone,
    pd?.email,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ]
```

### 9b. `templateFive.tsx` — append to `contactLine`. Find:
```tsx
  const contactLine = [
    pd?.email,
    pd?.phone,
    [pd?.city, pd?.country].filter(Boolean).join(', ')
  ]
```
Replace with:
```tsx
  const contactLine = [
    pd?.email,
    pd?.phone,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ]
```

### 9c. `templateOne.tsx` — add 3 `<Text>` blocks before the contact `</View>`. Find:
```tsx
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
          </View>
```
Replace with:
```tsx
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
            {pd?.linkedin ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.linkedin}</Text>
            ) : null}
            {pd?.github ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.github}</Text>
            ) : null}
            {pd?.website ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.website}</Text>
            ) : null}
          </View>
```

### 9d. `templateTwo.tsx` — same idea, style `text-xs text-muted`. Find:
```tsx
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-muted')}>
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
          </View>
```
Replace with:
```tsx
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-muted')}>
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
            {pd?.linkedin ? (
              <Text style={tw('text-xs text-muted')}>{pd.linkedin}</Text>
            ) : null}
            {pd?.github ? (
              <Text style={tw('text-xs text-muted')}>{pd.github}</Text>
            ) : null}
            {pd?.website ? (
              <Text style={tw('text-xs text-muted')}>{pd.website}</Text>
            ) : null}
          </View>
```

### 9e. `templateThree.tsx` — same, with the `'·  '` prefix convention. Find:
```tsx
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-muted')}>
                {'·  '}
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
          </View>
```
Replace with:
```tsx
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-muted')}>
                {'·  '}
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
            {pd?.linkedin ? (
              <Text style={tw('text-xs text-muted')}>{'·  ' + pd.linkedin}</Text>
            ) : null}
            {pd?.github ? (
              <Text style={tw('text-xs text-muted')}>{'·  ' + pd.github}</Text>
            ) : null}
            {pd?.website ? (
              <Text style={tw('text-xs text-muted')}>{'·  ' + pd.website}</Text>
            ) : null}
          </View>
```

## Step 10 — cleanup the unused import from plan 026 (`src/features/profile/components/profile-list.tsx`)
Delete this now-unused import line:
```ts
import { ProfileWithRelations } from '@/server/routers/profile-router';
```

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0
- [ ] `grep -c "linkedin" src/server/db/schema/profiles.ts` → 1
- [ ] `grep -rl "pd.linkedin\|pd?.linkedin" src/features/resume/templates | wc -l` → 5 (all templates)
- [ ] `grep -c "linkedin" src/server/services/ai-resume.ts` → 1
- [ ] `grep -c "linkedin" src/server/services/parse-profile.ts` → ≥ 3 (type + prompt + return)
- [ ] `grep -c "ProfileWithRelations" src/features/profile/components/profile-list.tsx` → 0
- [ ] `git status` shows only the 14 in-scope files (13 edited/added content + profile-list cleanup); NO migration files committed

## STOP conditions
- Any find block doesn't match verbatim (file drift) → STOP, report which file/block.
- A FormField `control=` mismatch: the profile form uses `control={form.control}`, the
  resume editor uses `control={control}` — if tsc complains about the control prop,
  STOP and report (don't swap blindly).
- tsc says `profile.linkedin` doesn't exist on the profile type → Step 1 (schema) didn't
  land or the type didn't regenerate; STOP and report.

## Test plan (manual — after `pnpm db:push`)
1. `pnpm db:push` → accept the 3 new `profiles` columns.
2. Profile create/edit page → fill LinkedIn/GitHub/Portfolio → save.
3. Generate a resume from that profile → open the editor → the three links appear in
   Personal Details and are editable → they render in the contact line of all 5
   templates (check templateFive especially — the ATS one).
4. Import a resume (paste/PDF) that contains a LinkedIn URL → the profile picks it up.

## Maintenance notes
- Links live on the profile and are copied into `personal_details` at generation time,
  so old resumes generated before this change won't have them until re-generated (or
  add them in the editor). This is expected.
- **Migration**: the schema change is applied via `pnpm db:push` by the maintainer;
  the empty drizzle journal means `db:push` (diff-and-apply) is the right tool, not
  `db:generate`/`migrate`. The executor must NOT run any `db:*` command.
