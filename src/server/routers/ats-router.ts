import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes } from '../db/schema';
import { analyzeResumeAts } from '../services/ats-analysis';

export const atsRouter = j.router({
  getReport: privateProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, user.id))
      });

      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      const resumeText = JSON.stringify({
        personalDetails: resume.personalDetails,
        jobs: resume.jobs,
        education: resume.education,
        skills: resume.skills,
        tools: resume.tools,
        languages: resume.languages
      });

      const report = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resumeText
      });

      return c.json(report);
    })
});
