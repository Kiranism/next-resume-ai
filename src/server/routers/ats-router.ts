import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes } from '../db/schema';
import {
  analyzeResumeAts,
  normalizeResumeInput,
  type AnalyzedKeyword
} from '../services/ats-analysis';

type KeywordCache = {
  hash: string;
  keywords: {
    term: string;
    importance: 'required' | 'preferred';
    aliases?: string[];
  }[];
};

// Stable hash of the JD so a cached keyword set is only reused while the JD is
// unchanged (a re-tailor to a new JD invalidates it).
function hashJd(jobTitle: string, jobDescription: string): string {
  const s = `${jobTitle}\n${jobDescription}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Every entry must carry an aliases array — caches written before alias
// matching existed are treated as a miss so they re-extract (once) with
// aliases included.
function cachedKeywords(
  atsKeywords: unknown,
  hash: string
): AnalyzedKeyword[] | null {
  const c = atsKeywords as KeywordCache | null | undefined;
  if (!c || c.hash !== hash || !Array.isArray(c.keywords)) return null;
  return c.keywords.every((k) => Array.isArray(k.aliases))
    ? (c.keywords as AnalyzedKeyword[])
    : null;
}

// Store the freshly-extracted keyword set so the gap list stays stable next
// analysis. Best-effort — caching is an optimization, never let it fail the
// request (both endpoints seed it so whichever runs first warms the cache).
async function persistKeywordCache(
  resumeId: string,
  userId: string,
  hash: string,
  keywords: AnalyzedKeyword[]
): Promise<void> {
  if (keywords.length === 0) return;
  try {
    await db
      .update(resumes)
      .set({
        atsKeywords: {
          hash,
          keywords: keywords.map((k) => ({
            term: k.term,
            importance: k.importance,
            aliases: k.aliases ?? []
          }))
        }
      })
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)));
  } catch (err) {
    console.error('Failed to cache ATS keywords (non-fatal):', err);
  }
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

      const normalized = normalizeResumeInput({
        personalDetails: resume.personalDetails,
        jobs: resume.jobs,
        educations: resume.education,
        projects: resume.projects,
        skills: resume.skills,
        tools: resume.tools,
        languages: resume.languages,
        hiddenSections: resume.hiddenSections
      });

      const hash = hashJd(resume.jdJobTitle, resume.jdPostDetails);
      const cached = cachedKeywords(resume.atsKeywords, hash);
      const { keywords, ...report } = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resume: normalized,
        cachedKeywords: cached
      });
      if (!cached) {
        await persistKeywordCache(resume.id, user.id, hash, keywords);
      }

      return c.json(report);
    }),

  // Analyze the CURRENT (client) resume content instead of the saved snapshot,
  // and recompute every call (a mutation is never cached). Used by the chat's
  // "ATS score" so the score always reflects the latest field values.
  // `refresh: true` bypasses the JD keyword cache (re-extracts and re-caches) —
  // the escape hatch when an extraction looks off.
  analyzeCurrent: privateProcedure
    .input(
      z.object({
        resumeId: z.string(),
        resume: z.record(z.string(), z.any()),
        refresh: z.boolean().optional()
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
      const normalized = normalizeResumeInput({
        personalDetails: current.personal_details,
        jobs: current.jobs,
        educations: current.educations,
        projects: current.projects,
        skills: current.skills,
        tools: current.tools,
        languages: current.languages,
        hiddenSections: current.hiddenSections
      });

      const hash = hashJd(resume.jdJobTitle, resume.jdPostDetails);
      const cached = input.refresh
        ? null
        : cachedKeywords(resume.atsKeywords, hash);
      const { keywords, ...report } = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resume: normalized,
        cachedKeywords: cached
      });

      if (!cached) {
        await persistKeywordCache(input.resumeId, user.id, hash, keywords);
      }

      return c.json(report);
    })
});
