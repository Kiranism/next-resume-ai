import { z } from 'zod';
import { j, privateProcedure } from '../jstack';
import { profileSchema } from '@/features/profile/utils/form-schema';
import { db } from '../db';
import { profiles } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  Education,
  educations,
  Job,
  jobs,
  Profile
} from '../db/schema/profiles';

export const profileRouter = j.router({
  getProfiles: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx;

    // Fetch profiles along with related jobs and educations
    const userProfiles = (await db.query.profiles.findMany({
      where: eq(profiles.userId, user.id),
      with: {
        jobs: true, // Include related jobs
        educations: true // Include related educations
      }
    })) as ProfileWithRelations[];

    return c.json(userProfiles);
  }),

  createProfile: privateProcedure
    .input(profileSchema)
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;

      // Start a transaction since we're inserting into multiple tables
      return await db.transaction(async (tx) => {
        // Create the base profile first
        const [createdProfile] = await tx
          .insert(profiles)
          .values({
            id: nanoid(),
            userId: user.id,
            firstname: input.firstname,
            lastname: input.lastname,
            email: input.email,
            contactno: input.contactno,
            country: input.country,
            city: input.city
          })
          .returning();

        // Insert jobs if they exist
        if (input.jobs && input.jobs.length > 0) {
          await tx.insert(jobs).values(
            input.jobs.map((job) => ({
              profileId: createdProfile.id,
              jobTitle: job.jobTitle,
              employer: job.employer,
              description: job.description ?? null,
              startDate: job.startDate,
              endDate: job.endDate,
              city: job.city
            }))
          );
        }

        // Insert education if it exists
        if (input.educations && input.educations.length > 0) {
          await tx.insert(educations).values(
            input.educations.map((edu) => ({
              profileId: createdProfile.id,
              school: edu.school,
              degree: edu.degree,
              field: edu.field,
              description: edu.description ?? null, // Using nullish coalescing
              startDate: edu.startDate,
              endDate: edu.endDate,
              city: edu.city
            }))
          );
        }

        // Fetch the complete profile with related data
        const completeProfile = await tx.query.profiles.findFirst({
          where: (profiles, { eq }) => eq(profiles.id, createdProfile.id),
          with: {
            jobs: true,
            educations: true
          }
        });

        return c.json(completeProfile);
      });
    }),

  updateProfile: privateProcedure
    .input(z.object({ id: z.string(), ...profileSchema.shape }))
    .mutation(async ({ c, ctx, input }) => {
      const { id, ...inputData } = input;
      const { user } = ctx;

      // Ownership check: you may only update your own profile.
      const owned = await db.query.profiles.findFirst({
        where: eq(profiles.id, id)
      });
      if (!owned || owned.userId !== user.id) {
        return c.json({ error: 'Not found' }, 404);
      }

      return await db.transaction(async (tx) => {
        // Update the base profile
        const [updatedProfile] = await tx
          .update(profiles)
          .set({
            firstname: inputData.firstname,
            lastname: inputData.lastname,
            email: inputData.email,
            contactno: inputData.contactno,
            country: inputData.country,
            city: inputData.city,
            updatedAt: new Date()
          })
          .where(and(eq(profiles.id, id), eq(profiles.userId, user.id)))
          .returning();

        // Delete existing jobs and education to replace with new ones
        await tx.delete(jobs).where(eq(jobs.profileId, id));
        await tx.delete(educations).where(eq(educations.profileId, id));

        // Insert new jobs if they exist
        if (inputData.jobs && inputData.jobs.length > 0) {
          await tx.insert(jobs).values(
            inputData.jobs.map((job) => ({
              profileId: id,
              jobTitle: job.jobTitle,
              employer: job.employer,
              description: job.description ?? null,
              startDate: job.startDate,
              endDate: job.endDate,
              city: job.city
            }))
          );
        }

        // Insert new education if it exists
        if (inputData.educations && inputData.educations.length > 0) {
          await tx.insert(educations).values(
            inputData.educations.map((edu) => ({
              profileId: id,
              school: edu.school,
              degree: edu.degree,
              field: edu.field,
              description: edu.description ?? null,
              startDate: edu.startDate,
              endDate: edu.endDate,
              city: edu.city
            }))
          );
        }

        // Fetch and return the complete updated profile
        const completeProfile = await tx.query.profiles.findFirst({
          where: (profiles, { eq }) => eq(profiles.id, id),
          with: {
            jobs: true,
            educations: true // Changed from 'education' to 'educations'
          }
        });

        return c.json(completeProfile);
      });
    })
});

export type ProfileWithRelations = Profile & {
  jobs: Job[];
  educations: Education[];
};
