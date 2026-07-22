import { z } from 'zod';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes, profiles, accounts } from '../db/schema';
import { eq, desc, inArray, and, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { resumeFormSchema } from '@/features/resume/utils/form-schema';
import { generateResumeContent } from '../services/ai-resume';

export const resumeRouter = j.router({
  // Create a new resume
  createResume: privateProcedure
    .input(
      z.object({
        profileId: z.string(),
        ...resumeFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { profileId, ...resumeData } = input;

      // Get the account record first
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.externalId, user.externalId)
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Enforce per-account generation quota (accounts.quotaLimit; the user's
      // resume count is the usage proxy). Prevents unbounded paid AI calls.
      const [{ value: usedCount }] = await db
        .select({ value: count() })
        .from(resumes)
        .where(eq(resumes.userId, account.id));

      if (usedCount >= account.quotaLimit) {
        return c.json(
          { error: 'Generation quota reached. Delete a resume to make room.' },
          429
        );
      }

      // Get profile data
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, profileId),
        with: {
          jobs: true,
          educations: true
        }
      });

      if (!profile || profile.userId !== account.id) {
        return c.json({ error: 'Profile not found' }, 404);
      }

      // Generate AI content BEFORE inserting, so a generation failure never
      // leaves an orphan resume row in the database.
      const aiGeneratedContent = await generateResumeContent(
        {
          ...resumeData,
          profileId: input.profileId
        },
        profile
      );

      // Insert the fully-populated resume in a single write.
      const newResume = {
        id: nanoid(),
        userId: account.id,
        profileId,
        templateId: 'template-five',
        jdJobTitle: resumeData.jd_job_title,
        employer: resumeData.employer,
        jdPostDetails: resumeData.jd_post_details,
        personalDetails: aiGeneratedContent.personal_details,
        jobs: profile.jobs,
        education: profile.educations,
        projects: [],
        skills: aiGeneratedContent.skills,
        tools: aiGeneratedContent.tools,
        languages: aiGeneratedContent.languages,
        hiddenSections: [],
        updatedAt: new Date()
      };
      const [created] = await db.insert(resumes).values(newResume).returning();

      const sendResumeData = { ...created, profile: profile };

      return c.json({ id: created.id, data: sendResumeData });
    }),

  getProfiles: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx;
    const userProfiles = await db.query.profiles.findMany({
      where: eq(profiles.userId, user.id)
    });
    return c.json(userProfiles);
  }),

  // Get a resume by ID (owner only)
  getResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, user.id))
      });

      if (!resume) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json(resume);
    }),
  // Update a resume (owner only)
  updateResume: privateProcedure
    // Lenient input: the resume is stored as jsonb, so persistence must NOT be
    // blocked by the strict form schema. A normal resume (e.g. a current job
    // with an empty endDate, or a blank city) is "invalid" per the strict
    // schema but is completely valid to save — gating on it silently dropped
    // every save. The strict schema stays for FORM UX (field hints) only.
    .input(
      z.object({
        id: z.string(),
        resume_id: z.string().optional(),
        templateId: z.string().optional(),
        personal_details: z.record(z.string(), z.any()).nullish(),
        jobs: z.array(z.any()).optional(),
        educations: z.array(z.any()).optional(),
        projects: z.array(z.any()).optional(),
        skills: z.array(z.any()).optional(),
        tools: z.array(z.any()).optional(),
        languages: z.array(z.any()).optional(),
        hiddenSections: z.array(z.string()).optional()
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { id, ...updateData } = input;

      // Map form field names → DB column props explicitly. Spreading raw form
      // keys silently dropped `personal_details` and `educations` (Drizzle only
      // matches the model prop names personalDetails / education). undefined
      // fields are omitted from the SET clause, so partial updates still work.
      const [updated] = await db
        .update(resumes)
        .set({
          templateId: updateData.templateId,
          personalDetails: updateData.personal_details,
          jobs: updateData.jobs,
          education: updateData.educations,
          projects: updateData.projects,
          skills: updateData.skills,
          tools: updateData.tools,
          languages: updateData.languages,
          hiddenSections: updateData.hiddenSections,
          updatedAt: new Date()
        })
        .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
        .returning();

      if (!updated) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json(updated);
    }),

  // Get all resumes for a profile (owner only)
  getProfileResumes: privateProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const profileResumes = await db.query.resumes.findMany({
        where: and(
          eq(resumes.profileId, input.profileId),
          eq(resumes.userId, user.id)
        )
      });

      return c.json(profileResumes);
    }),

  getAllResumes: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx;

    // First get all profiles belonging to the user
    const userProfiles = await db.query.profiles.findMany({
      where: eq(profiles.userId, user.id)
    });

    // Get the profile IDs
    const profileIds = userProfiles.map((profile) => profile.id);

    // Get all resumes for these profiles
    const allResumes = await db.query.resumes.findMany({
      where: inArray(resumes.profileId, profileIds),
      orderBy: (resumes, { desc }) => [desc(resumes.createdAt)]
    });

    return c.json(allResumes);
  }),

  // Delete a resume (owner only)
  deleteResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const [deleted] = await db
        .delete(resumes)
        .where(and(eq(resumes.id, input.id), eq(resumes.userId, user.id)))
        .returning();

      if (!deleted) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ id: deleted.id });
    }),

  // Duplicate a resume (owner only)
  duplicateResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      const source = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, user.id))
      });

      if (!source) {
        return c.json({ error: 'Not found' }, 404);
      }

      const [copy] = await db
        .insert(resumes)
        .values({
          id: nanoid(),
          userId: source.userId,
          profileId: source.profileId,
          jdJobTitle: source.jdJobTitle,
          employer: source.employer,
          jdPostDetails: source.jdPostDetails,
          personalDetails: source.personalDetails,
          jobs: source.jobs,
          education: source.education,
          skills: source.skills,
          tools: source.tools,
          languages: source.languages,
          templateId: source.templateId,
          updatedAt: new Date()
        })
        .returning();

      return c.json({ id: copy.id });
    })
});
