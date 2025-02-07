import { z } from 'zod';
import { j, privateProcedure } from '../jstack';
import { db } from '../db';
import { resumes, profiles } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
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

      // Create new resume record
      const newResume = {
        id: nanoid(),
        profileId,
        jdJobTitle: resumeData.jd_job_title,
        employer: resumeData.employer,
        jdPostDetails: resumeData.jd_post_details
      };

      // Get profile data
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, profileId)
      });

      if (!profile) {
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
          jobs: aiGeneratedContent.jobs,
          education: aiGeneratedContent.education,
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

  // Get a resume by ID
  getResume: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      console.log('input', input);
      const { user } = ctx;

      const resume = await db.query.resumes.findFirst({
        where: eq(resumes.id, input.id)
      });

      return c.json(resume);
    }),
  // Update a resume
  updateResume: privateProcedure
    .input(
      z.object({
        id: z.string(),
        ...resumeEditFormSchema.shape
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(resumes)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(resumes.id, id))
        .returning();

      return c.json(updated);
    }),

  // Get all resumes for a profile
  getProfileResumes: privateProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const profileResumes = await db.query.resumes.findMany({
        where: eq(resumes.profileId, input.profileId)
      });

      return c.json(profileResumes);
    }),

  getAllResumes: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx;
    const allResumes = await db.query.resumes.findMany({
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
      const { resumeId, image } = input;

      try {
        const imageUrl = await uploadImageToStorage(image);
        const [updated] = await db
          .update(resumes)
          .set({
            previewImageUrl: imageUrl,
            updatedAt: new Date()
          })
          .where(eq(resumes.id, String(resumeId)))
          .returning();

        return c.json(updated);
      } catch (error) {
        console.error('Error in uploadPreviewImage:', error);
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    })
});
