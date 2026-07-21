import { generateJsonContent } from './ai-model';

export type ParsedProfile = {
  firstname: string;
  lastname: string;
  email: string;
  contactno: string;
  country: string;
  city: string;
  linkedin: string;
  github: string;
  website: string;
  jobs: {
    jobTitle: string;
    employer: string;
    description: string;
    startDate: string;
    endDate: string;
    city: string;
  }[];
  educations: {
    school: string;
    degree: string;
    field: string;
    description: string;
    startDate: string;
    endDate: string;
    city: string;
  }[];
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export async function parseResumeToProfile(
  text: string
): Promise<ParsedProfile> {
  const prompt = `Extract structured resume/CV data from the text below and return ONLY a JSON object.

RESUME TEXT:
${text}

Return JSON with EXACTLY this shape. Use an empty string "" for anything not found. Format all dates as YYYY-MM-DD (use "" if unknown):
{
  "firstname": "", "lastname": "", "email": "", "contactno": "", "country": "", "city": "",
  "linkedin": "", "github": "", "website": "",
  "jobs": [{ "jobTitle": "", "employer": "", "description": "", "startDate": "", "endDate": "", "city": "" }],
  "educations": [{ "school": "", "degree": "", "field": "", "description": "", "startDate": "", "endDate": "", "city": "" }]
}`;

  const raw = await generateJsonContent(prompt);
  const p = JSON.parse(raw) as Record<string, unknown>;

  const jobsIn = Array.isArray(p.jobs)
    ? (p.jobs as Record<string, unknown>[])
    : [];
  const eduIn = Array.isArray(p.educations)
    ? (p.educations as Record<string, unknown>[])
    : [];

  return {
    firstname: str(p.firstname),
    lastname: str(p.lastname),
    email: str(p.email),
    contactno: str(p.contactno),
    country: str(p.country),
    city: str(p.city),
    linkedin: str(p.linkedin),
    github: str(p.github),
    website: str(p.website),
    jobs: jobsIn.map((j) => ({
      jobTitle: str(j.jobTitle),
      employer: str(j.employer),
      description: str(j.description),
      startDate: str(j.startDate),
      endDate: str(j.endDate),
      city: str(j.city)
    })),
    educations: eduIn.map((e) => ({
      school: str(e.school),
      degree: str(e.degree),
      field: str(e.field),
      description: str(e.description),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      city: str(e.city)
    }))
  };
}
