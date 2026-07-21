import { pgTable, text, timestamp, integer, serial } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { relations } from 'drizzle-orm';

// Main profiles table
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => accounts.id),
  firstname: text('firstname').notNull(),
  lastname: text('lastname').notNull(),
  email: text('email').notNull(),
  contactno: text('contact_no').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  linkedin: text('linkedin'),
  github: text('github'),
  website: text('website'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Jobs table with reference to profile
export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  profileId: text('profile_id')
    .notNull()
    .references(() => profiles.id),
  jobTitle: text('job_title'),
  employer: text('employer'),
  description: text('description'),
  startDate: text('start_date'), // Using text to match your YYYY-MM-DD format
  endDate: text('end_date'), // Using text to match your YYYY-MM-DD format
  city: text('city'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Education table with reference to profile
export const educations = pgTable('educations', {
  id: serial('id').primaryKey(),
  profileId: text('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  school: text('school'),
  degree: text('degree'),
  field: text('field'),
  description: text('description'),
  startDate: text('start_date'), // Using text to match your YYYY-MM-DD format
  endDate: text('end_date'), // Using text to match your YYYY-MM-DD format
  city: text('city'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Define relationships for profiles
export const profilesRelations = relations(profiles, ({ many }) => ({
  jobs: many(jobs),
  educations: many(educations)
}));

// Define relationships for jobs
export const jobsRelations = relations(jobs, ({ one }) => ({
  profile: one(profiles, {
    fields: [jobs.profileId],
    references: [profiles.id]
  })
}));

// Define relationships for educations
export const educationsRelations = relations(educations, ({ one }) => ({
  profile: one(profiles, {
    fields: [educations.profileId],
    references: [profiles.id]
  })
}));

// Type inference
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Education = typeof educations.$inferSelect;
export type NewEducation = typeof educations.$inferInsert;
