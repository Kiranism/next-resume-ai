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

export const jobSchema = z.object({
  id: z.number().optional(), // For existing jobs during updates
  jobTitle: z
    .string()
    .min(3, { message: 'Job title must be at least 3 characters' }),
  employer: z
    .string()
    .min(3, { message: 'Employer must be at least 3 characters' }),
  description: z.string().optional(),
  startDate: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Start date should be in the format YYYY-MM-DD'
  }),
  endDate: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'End date should be in the format YYYY-MM-DD'
  }),
  city: z.string().min(1, { message: 'Please select a city' })
});

export const educationSchema = z.object({
  id: z.number().optional(),
  school: z
    .string()
    .min(3, { message: 'School name must be at least 3 characters' }),
  degree: z
    .string()
    .min(3, { message: 'Degree name must be at least 3 characters' }),
  field: z
    .string()
    .min(3, { message: 'Field name must be at least 3 characters' }),
  description: z.string().optional(),
  startDate: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Start date should be in the format YYYY-MM-DD'
  }),
  endDate: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'End date should be in the format YYYY-MM-DD'
  }),
  city: z.string().min(1, { message: 'Please select a city' })
});

export const projectSchema = z.object({
  name: z.string().min(1, { message: 'Please enter a project name' }),
  description: z.string().optional(),
  link: z.string().optional()
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
        .nullable(),
      linkedin: z.string().optional().nullable(),
      github: z.string().optional().nullable(),
      website: z.string().optional().nullable()
    })
    .optional(),
  jobs: z.array(jobSchema).optional(),
  educations: z.array(educationSchema).optional(),
  projects: z.array(projectSchema).optional(),
  skills: z.array(proficiencyLevelSchema).optional(),
  tools: z.array(toolSchema).optional(),
  languages: z.array(languageSchema).optional(),
  // Section keys hidden from the rendered resume (e.g. ['projects','languages']).
  hiddenSections: z.array(z.string()).optional()
});

// Toggleable resume sections (keys used in `hiddenSections`).
export const RESUME_SECTIONS = [
  { key: 'summary', label: 'Summary' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'projects', label: 'Projects' },
  { key: 'skills', label: 'Skills' },
  { key: 'tools', label: 'Tools' },
  { key: 'languages', label: 'Languages' }
] as const;

export type TResumeEditFormValues = z.infer<typeof resumeEditFormSchema>;
export type TResumeFormValues = {
  jd_job_title: string;
  employer: string;
  jd_post_details: string;
};
