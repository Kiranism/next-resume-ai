import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes } from '../db/schema';
import { analyzeResumeAts } from '../services/ats-analysis';

// Build the text an ATS actually sees: sections the user hid from the rendered
// resume (hiddenSections) are excluded, so their content can't inflate the
// keyword match for a resume the recruiter never sees.
function visibleResumeText(s: {
  personalDetails: unknown;
  jobs: unknown;
  education: unknown;
  projects: unknown;
  skills: unknown;
  tools: unknown;
  languages: unknown;
  hiddenSections: unknown;
}): string {
  const hidden = new Set(
    Array.isArray(s.hiddenSections) ? (s.hiddenSections as string[]) : []
  );
  const pd = s.personalDetails as Record<string, unknown> | null | undefined;
  return JSON.stringify({
    personalDetails: hidden.has('summary') && pd ? { ...pd, summary: '' } : pd,
    jobs: hidden.has('experience') ? [] : s.jobs,
    education: hidden.has('education') ? [] : s.education,
    projects: hidden.has('projects') ? [] : s.projects,
    skills: hidden.has('skills') ? [] : s.skills,
    tools: hidden.has('tools') ? [] : s.tools,
    languages: hidden.has('languages') ? [] : s.languages
  });
}

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

      const resumeText = visibleResumeText({
        personalDetails: resume.personalDetails,
        jobs: resume.jobs,
        education: resume.education,
        projects: resume.projects,
        skills: resume.skills,
        tools: resume.tools,
        languages: resume.languages,
        hiddenSections: resume.hiddenSections
      });

      const report = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resumeText
      });

      return c.json(report);
    }),

  // Analyze the CURRENT (client) resume content instead of the saved snapshot,
  // and recompute every call (a mutation is never cached). Used by the chat's
  // "ATS score" so the score always reflects the latest field values.
  analyzeCurrent: privateProcedure
    .input(
      z.object({
        resumeId: z.string(),
        resume: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, user.id))
      });

      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      const current = input.resume as Record<string, unknown>;
      const resumeText = visibleResumeText({
        personalDetails: current.personal_details,
        jobs: current.jobs,
        education: current.educations,
        projects: current.projects,
        skills: current.skills,
        tools: current.tools,
        languages: current.languages,
        hiddenSections: current.hiddenSections
      });

      const report = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resumeText
      });

      return c.json(report);
    })
});
