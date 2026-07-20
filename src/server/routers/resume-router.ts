import { z } from 'zod';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes, profiles, accounts } from '../db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  resumeFormSchema,
  resumeEditFormSchema
} from '@/features/resume/utils/form-schema';
import { generateResumeContent } from '../services/ai-resume';
import { uploadImageToStorage } from '../services/upload';

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

      // Create new resume record with correct userId
      const newResume = {
        id: nanoid(),
        userId: account.id, // Use account.id instead of user.id
        profileId,
        jdJobTitle: resumeData.jd_job_title,
        employer: resumeData.employer,
        jdPostDetails: resumeData.jd_post_details
      };

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

      // Insert initial resume into database
      const [created] = await db.insert(resumes).values(newResume).returning();

      // Generate AI content with combined profile and resume data
      const aiGeneratedContent = await generateResumeContent(
        {
          ...resumeData,
          profileId: input.profileId
        },
        profile
      );

      // Update resume with AI generated content
      const [updated] = await db
        .update(resumes)
        .set({
          personalDetails: aiGeneratedContent.personal_details,
          jobs: profile.jobs,
          education: profile.educations,
          skills: aiGeneratedContent.skills,
          tools: aiGeneratedContent.tools,
          languages: aiGeneratedContent.languages,
          updatedAt: new Date()
        })
        .where(eq(resumes.id, created.id))
        .returning();

      const sendResumeData = { ...updated, profile: profile };

      return c.json({ id: updated.id, data: sendResumeData });
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
    .input(
      z.object({
        id: z.string(),
        ...resumeEditFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(resumes)
        .set({
          ...updateData,
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
  // Upload a preview image for a resume
  uploadPreviewImage: privateProcedure
    .input(
      z.object({
        resumeId: z
          .union([z.string(), z.number()])
          .transform((val) => String(val)),
        image: z.any() // Accept any for the blob data
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { resumeId, image } = input;

      try {
        const existing = await db.query.resumes.findFirst({
          where: and(
            eq(resumes.id, String(resumeId)),
            eq(resumes.userId, user.id)
          )
        });

        if (!existing) {
          return c.json({ error: 'Not found' }, 404);
        }

        const imageUrl = await uploadImageToStorage(image);
        const [updated] = await db
          .update(resumes)
          .set({
            previewImageUrl: imageUrl,
            updatedAt: new Date()
          })
          .where(
            and(eq(resumes.id, String(resumeId)), eq(resumes.userId, user.id))
          )
          .returning();

        return c.json(updated);
      } catch (error) {
        console.error('Error in uploadPreviewImage:', error);
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    })
});
