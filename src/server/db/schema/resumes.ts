import { text, timestamp, pgTable, jsonb } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { accounts } from './accounts';

export const resumes = pgTable('resumes', {
  id: text('id').primaryKey().notNull(),
  profileId: text('profile_id')
    .notNull()
    .references(() => profiles.id),
  userId: text('user_id')
    .notNull()
    .references(() => accounts.id),
  jdJobTitle: text('jd_job_title').notNull(),
  employer: text('employer').notNull(),
  jdPostDetails: text('jd_post_details').notNull(),
  // Which resume template is applied — the dashboard cover is derived from this
  // (/templates/<templateId>.png). Matches ids in features/resume/templates/registry.
  templateId: text('template_id').notNull().default('template-five'),
  personalDetails: jsonb('personal_details'),
  jobs: jsonb('jobs').array(),
  education: jsonb('education').array(),
  projects: jsonb('projects').array(),
  skills: jsonb('skills').array(),
  tools: jsonb('tools').array(),
  languages: jsonb('languages').array(),
  hiddenSections: jsonb('hidden_sections').$type<string[]>(),
  // Cached ATS keyword set for the current JD (hash guards against JD changes),
  // so the analyze→improve→re-analyze gap list stays stable instead of the LLM
  // re-extracting a slightly different set each time.
  atsKeywords: jsonb('ats_keywords').$type<{
    hash: string;
    keywords: {
      term: string;
      importance: 'required' | 'preferred';
      // Alternate literal forms an ATS search accepts ("CI/CD" ↔ "continuous
      // integration"). Entries cached before aliases existed lack this and are
      // treated as a cache miss (re-extracted once).
      aliases?: string[];
    }[];
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
