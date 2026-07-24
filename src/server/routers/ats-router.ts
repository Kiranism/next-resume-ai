import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes } from '../db/schema';
import {
  analyzeResumeAts,
  hashJd,
  normalizeResumeInput,
  type AnalyzedKeyword
} from '../services/ats-analysis';
import { critiqueWritingWithAi } from '../services/writing-critique';

type KeywordCache = {
  hash: string;
  keywords: {
    term: string;
    importance: 'required' | 'preferred';
    aliases?: string[];
  }[];
};

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

// The keyword list shipped to the client (drops the internal `present` flag).
function clientKeywords(keywords: AnalyzedKeyword[]) {
  return keywords.map((k) => ({
    term: k.term,
    importance: k.importance,
    aliases: k.aliases ?? []
  }));
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

      // Keywords (with aliases) ship to the client so the chat can verify an
      // applied edit locally with the exact matcher the server scores with.
      return c.json({ ...report, keywords: clientKeywords(keywords) });
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
      const cached = cachedKeywords(resume.atsKeywords, hash);
      const { keywords, ...report } = await analyzeResumeAts({
        jobTitle: resume.jdJobTitle,
        jobDescription: resume.jdPostDetails,
        resume: normalized,
        cachedKeywords: cached
      });

      if (!cached) {
        await persistKeywordCache(input.resumeId, user.id, hash, keywords);
      }

      return c.json({ ...report, keywords: clientKeywords(keywords) });
    }),

  // Bullet-level writing critique of the CURRENT (client) resume content:
  // deterministic checks + the AI coach pass (Resume Bullet Writer/Quantifier
  // guidance) with per-bullet proposed rewrites. Falls back to deterministic-
  // only if the model call fails, so it always returns a report.
  reviewWriting: privateProcedure
    .input(
      z.object({
        resume: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ c, input }) => {
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
      const report = await critiqueWritingWithAi(normalized);
      return c.json(report);
    })
});
