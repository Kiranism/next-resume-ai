import {
  resumeFormSchema,
  TResumeEditFormValues
} from '@/features/resume/utils/form-schema';
import { generateJsonContent } from './ai-model';
import { ATS_WRITING_GUIDELINES } from './resume-guidance';
import { RESUME_WRITING_GUIDANCE } from './resume-skills';
import { z } from 'zod';
import { Profile } from '@/server/db/schema/profiles';
import { ProfileWithRelations } from '../routers/profile-router';

// Lenient item schemas: accept a plain string OR an object and normalize to the
// expected { <name>, proficiency_level } shape; never throw (per-item .catch).
const skillItem = z
  .preprocess(
    (v) => (typeof v === 'string' ? { skill_name: v } : v),
    z.object({
      skill_name: z.string().catch(''),
      proficiency_level: z.string().catch('')
    })
  )
  .catch({ skill_name: '', proficiency_level: '' });

const toolItem = z
  .preprocess(
    (v) => (typeof v === 'string' ? { tool_name: v } : v),
    z.object({
      tool_name: z.string().catch(''),
      proficiency_level: z.string().catch('')
    })
  )
  .catch({ tool_name: '', proficiency_level: '' });

const languageItem = z
  .preprocess(
    (v) => (typeof v === 'string' ? { lang_name: v } : v),
    z.object({
      lang_name: z.string().catch(''),
      proficiency_level: z.string().catch('')
    })
  )
  .catch({ lang_name: '', proficiency_level: '' });

// Validates the model's JSON. Every field .catch()es to a safe default, so a
// non-array (or otherwise malformed) field becomes [] / {} instead of crashing.
const aiResumeSchema = z.object({
  personal_details: z
    .object({
      resume_job_title: z.string().catch(''),
      summary: z.string().catch('')
    })
    .partial()
    .catch({}),
  jobs: z.array(z.any()).catch([]),
  educations: z.array(z.any()).catch([]),
  skills: z.array(skillItem).catch([]),
  tools: z.array(toolItem).catch([]),
  languages: z.array(languageItem).catch([])
});

export async function generateResumeContent(
  input: {
    profileId: string;
    jd_job_title: string;
    employer: string;
    jd_post_details: string;
  },
  profile: ProfileWithRelations
): Promise<TResumeEditFormValues> {
  const prompt = `
    Generate a professional resume based on the following information (dont mention the company name this is a job description where we wanted to apply so make it ats friendly by using above or following information):

    Target Position:
    Job Title: ${input.jd_job_title}
    Employer: ${input.employer}
    Job Description: ${input.jd_post_details}

    Candidate Profile:
    Full Name: ${profile.firstname} ${profile.lastname}
    Email: ${profile.email}
    Contact: ${profile.contactno}
    Location: ${profile.city}, ${profile.country}

    Work History:
    ${
      profile?.jobs && profile?.jobs.length > 0
        ? profile?.jobs
            .map((job) => {
              // Safely handle potential undefined or null values
              return `
      - Position: ${job.jobTitle || 'Not Specified'}
        Company: ${job.employer || 'Not Specified'}
        Location: ${job.city || 'Not Specified'}
        Duration: ${job.startDate || 'N/A'} to ${job.endDate || 'Present'}
      `;
            })
            .join('\n')
        : 'No work experience recorded'
    }

    Education:
    ${
      profile?.educations && profile?.educations.length > 0
        ? profile?.educations
            .map((education) => {
              // Safely handle potential undefined or null values
              return `
        School: ${education.school || 'Not Specified'}
        Degree: ${education.degree || 'Not Specified'}
        Field: ${education.field || 'Not Specified'}
        Location: ${education.city || 'Not Specified'}
        Duration: ${education.startDate || 'N/A'} to ${education.endDate || 'Present'}
      `;
            })
            .join('\n')
        : 'No education recorded'
    }

    ${RESUME_WRITING_GUIDANCE}

    ${ATS_WRITING_GUIDELINES}

    Instructions:
    1. Write a compelling professional summary (3-5 sentences) in
       personal_details.summary that highlights years of experience, emphasizes the
       skills most relevant to the target position, showcases key achievements from
       the work history, and aligns with the job description. Set
       personal_details.resume_job_title to the target job title. Format
       personal_details.summary using ONLY this minimal markup: wrap the single most
       important metric/number in **double asterisks** for bold (e.g. "led a team of
       **8** engineers"). Do not use any other markdown (no headings, italics,
       links, bullet lists).
    2. Populate ALL of the sections below from the job description and the work
       history — never leave them empty:
       - skills: 8-14 of the most relevant hard and soft skills for the target role.
         Use the job description's exact terminology where it matches.
       - tools: 5-10 concrete tools, technologies, frameworks, or platforms relevant
         to the role.
       - languages: spoken/human languages the candidate likely knows (e.g. English).
         If none can be reasonably inferred, use an empty array — never invent.
    3. Do NOT return work experience or education — those come from the candidate
       profile, not from you.
    4. Return ONLY a JSON object with EXACTLY these field names and this shape:
    {
      "personal_details": {
        "resume_job_title": "string",
        "summary": "string"
      },
      "skills": [
        { "skill_name": "string", "proficiency_level": "Beginner | Intermediate | Advanced | Expert" }
      ],
      "tools": [
        { "tool_name": "string", "proficiency_level": "Beginner | Intermediate | Advanced | Expert" }
      ],
      "languages": [
        { "lang_name": "string", "proficiency_level": "Basic | Conversational | Fluent | Native" }
      ]
    }
  `;

  try {
    const responseText = await generateJsonContent(prompt);

    // Validate + normalize the model's JSON with zod so a malformed field
    // (e.g. a non-array skills value) can never crash the DB insert.
    const parsedResult = aiResumeSchema.safeParse(JSON.parse(responseText));
    const content = parsedResult.success
      ? parsedResult.data
      : aiResumeSchema.parse({});

    return {
      personal_details: {
        resume_job_title:
          content.personal_details?.resume_job_title || input.jd_job_title,
        fname: profile.firstname,
        lname: profile.lastname,
        email: profile.email,
        phone: profile.contactno,
        country: profile.country,
        city: profile.city,
        linkedin: profile.linkedin ?? '',
        github: profile.github ?? '',
        website: profile.website ?? '',
        summary: content.personal_details?.summary || ''
      },
      jobs: content.jobs,
      educations: content.educations,
      skills: content.skills,
      tools: content.tools,
      languages: content.languages
    };
  } catch (error) {
    console.error('Error generating resume content:', error);
    throw error;
  }
}
