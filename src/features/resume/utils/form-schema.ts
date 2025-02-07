import * as z from 'zod';

// for resume creation page
export const resumeFormSchema = z.object({
  jd_job_title: z.string().min(3, { message: 'Please enter job title' }),
  employer: z
    .string()
    .min(3, { message: 'Employer name must be at least 3 characters long' }),
  jd_post_details: z
    .string()
    .min(3, { message: 'Job description must be at least 3 characters long' })
});

export const proficiencyLevelSchema = z.object({
  skill_name: z.string(),
  proficiency_level: z.string()
});

const toolSchema = z.object({
  tool_name: z.string(),
  proficiency_level: z.string()
});

const languageSchema = z.object({
  lang_name: z.string(),
  proficiency_level: z.string()
});

export const resumeEditFormSchema = z.object({
  resume_id: z.string().optional(),
  personal_details: z
    .object({
      resume_job_title: z
        .string()
        .min(3, { message: 'Please enter job title' })
        .optional(),
      fname: z
        .string()
        .min(3, { message: "Please enter user's first name" })
        .optional(),
      lname: z
        .string()
        .min(1, { message: 'Last name must be at least 1 characters long' })
        .optional(),
      email: z
        .string()
        .email({ message: 'Please enter a valid email' })
        .optional(),
      phone: z.string().optional(), // Adjusted to string since it's a phone number
      country: z.string().optional(),
      city: z.string().optional(),
      summary: z
        .string()
        .min(3, { message: 'Please enter a summary' })
        .optional()
        .nullable()
    })
    .optional(),
  jobs: z
    .array(
      z
        .object({
          id: z.number().optional(),
          job_title: z
            .string()
            .min(3, { message: 'Job title must be at least 3 characters' })
            .optional(),
          employer: z
            .string()
            .min(3, { message: 'Employer Name must be at least 3 characters' })
            .optional(),
          description: z.string().optional().nullable(),
          start_date: z
            .string()
            .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
              message: 'Start date should be in the format YYYY-MM-DD'
            })
            .optional(),
          end_date: z
            .string()
            .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
              message: 'End date should be in the format YYYY-MM-DD'
            })
            .optional(),
          country: z.string().optional(),
          city: z.string().optional()
        })
        .optional()
    )
    .optional(),
  education: z
    .array(
      z
        .object({
          id: z.number().optional(),
          school: z
            .string()
            .min(3, { message: 'School Name must be at least 3 characters' })
            .optional(),
          degree: z
            .string()
            .min(3, { message: 'Degree Name must be at least 3 characters' })
            .optional(),
          field: z
            .string()
            .min(3, { message: 'Field Name must be at least 3 characters' })
            .optional(),
          description: z.string().optional(),
          start_date: z
            .string()
            .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
              message: 'Start date should be in the format YYYY-MM-DD'
            })
            .optional(),
          end_date: z
            .string()
            .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
              message: 'End date should be in the format YYYY-MM-DD'
            })
            .optional(),
          country: z.string().optional(),
          city: z.string().optional()
        })
        .optional()
    )
    .optional(),
  skills: z.array(proficiencyLevelSchema).optional(),
  tools: z.array(toolSchema).optional(),
  languages: z.array(languageSchema).optional()
});

export type TResumeEditFormValues = z.infer<typeof resumeEditFormSchema>;
export type TResumeFormValues = {
  jd_job_title: string;
  employer: string;
  jd_post_details: string;
};
