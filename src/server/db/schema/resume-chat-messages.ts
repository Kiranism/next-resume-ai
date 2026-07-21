import { text, timestamp, jsonb, pgTable } from 'drizzle-orm/pg-core';
import { resumes } from './resumes';
import { accounts } from './accounts';

// One persistent chat thread per resume: each row is a single message.
// Cascade-deletes when its parent resume is removed.
export const resumeChatMessages = pgTable('resume_chat_messages', {
  id: text('id').primaryKey().notNull(),
  resumeId: text('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => accounts.id),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  // Human-readable applied-change summary for assistant turns (null for user).
  changes: jsonb('changes').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export type ResumeChatMessage = typeof resumeChatMessages.$inferSelect;
export type NewResumeChatMessage = typeof resumeChatMessages.$inferInsert;
