import { z } from 'zod';
import { j, privateProcedure } from '../jstack';
import { profileSchema } from '@/features/profile/utils/form-schema';
import { db } from '../db';
import { profiles, resumes } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  Education,
  educations,
  Job,
  jobs,
  Profile
} from '../db/schema/profiles';
import { parseResumeToProfile } from '../services/parse-profile';

export const profileRouter = j.router({
  importProfile: privateProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const parsed = await parseResumeToProfile(input.text);

      return await db.transaction(async (tx) => {
        const [createdProfile] = await tx
          .insert(profiles)
          .values({
            id: nanoid(),
            userId: user.id,
            firstname: parsed.firstname || 'First name',
            lastname: parsed.lastname || 'Last name',
            email: parsed.email || 'unknown@example.com',
            contactno: parsed.contactno || '',
            country: parsed.country || '',
            city: parsed.city || ''
          })
          .returning();

        const validJobs = parsed.jobs.filter((j) => j.jobTitle || j.employer);
        if (validJobs.length > 0) {
          await tx.insert(jobs).values(
            validJobs.map((j) => ({
              profileId: createdProfile.id,
              jobTitle: j.jobTitle,
              employer: j.employer,
              description: j.description || null,
              startDate: j.startDate,
              endDate: j.endDate,
              city: j.city
            }))
          );
        }

        const validEdu = parsed.educations.filter((e) => e.school || e.degree);
        if (validEdu.length > 0) {
          await tx.insert(educations).values(
            validEdu.map((e) => ({
              profileId: createdProfile.id,
              school: e.school,
              degree: e.degree,
              field: e.field,
              description: e.description || null,
              startDate: e.startDate,
              endDate: e.endDate,
              city: e.city
            }))
          );
        }

        const complete = await tx.query.profiles.findFirst({
          where: (profiles, { eq }) => eq(profiles.id, createdProfile.id),
          with: { jobs: true, educations: true }
        });

        return c.json(complete);
      });
    }),

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
    }),

  deleteProfile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx;
      const { id } = input;

      const owned = await db.query.profiles.findFirst({
        where: eq(profiles.id, id)
      });
      if (!owned || owned.userId !== user.id) {
        return c.json({ error: 'Not found' }, 404);
      }

      // Delete dependents first (resumes + jobs have no FK cascade), then the
      // profile itself. Wrapped in a transaction so it is all-or-nothing.
      await db.transaction(async (tx) => {
        await tx.delete(resumes).where(eq(resumes.profileId, id));
        await tx.delete(jobs).where(eq(jobs.profileId, id));
        await tx.delete(educations).where(eq(educations.profileId, id));
        await tx
          .delete(profiles)
          .where(and(eq(profiles.id, id), eq(profiles.userId, user.id)));
      });

      return c.json({ id });
    })
});

export type ProfileWithRelations = Profile & {
  jobs: Job[];
  educations: Education[];
};
