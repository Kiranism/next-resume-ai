import { text, timestamp, integer, pgTable, jsonb } from 'drizzle-orm/pg-core';
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
  previewImageUrl: text('preview_image_url'),
  personalDetails: jsonb('personal_details'),
  jobs: jsonb('jobs').array(),
  education: jsonb('education').array(),
  projects: jsonb('projects').array(),
  skills: jsonb('skills').array(),
  tools: jsonb('tools').array(),
  languages: jsonb('languages').array(),
  hiddenSections: jsonb('hidden_sections').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
