import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes, resumeChatMessages } from '../db/schema';

// Owner-check: the resume must belong to the current account.
async function assertOwnsResume(resumeId: string, userId: string) {
  return db.query.resumes.findFirst({
    where: and(eq(resumes.id, resumeId), eq(resumes.userId, userId))
  });
}

export const chatRouter = j.router({
  // Load the saved chat thread for a resume (ordered oldest-first).
  getMessages: privateProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await assertOwnsResume(input.resumeId, user.id);
      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      const rows = await db.query.resumeChatMessages.findMany({
        where: and(
          eq(resumeChatMessages.resumeId, input.resumeId),
          eq(resumeChatMessages.userId, user.id)
        ),
        orderBy: [asc(resumeChatMessages.createdAt)]
      });

      return c.json({ messages: rows });
    }),

  // Clear the whole thread for a resume.
  clearMessages: privateProcedure
    .input(z.object({ resumeId: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await assertOwnsResume(input.resumeId, user.id);
      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      await db
        .delete(resumeChatMessages)
        .where(
          and(
            eq(resumeChatMessages.resumeId, input.resumeId),
            eq(resumeChatMessages.userId, user.id)
          )
        );

      return c.json({ success: true });
    })
});
