import { generateJsonContent } from './ai-model';

export type AtsReport = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  rationale: string;
  suggestions: string[];
};

export async function analyzeResumeAts(input: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
}): Promise<AtsReport> {
  const prompt = `You are an ATS (Applicant Tracking System) keyword analyzer.
Compare the RESUME against the JOB DESCRIPTION and return ONLY a JSON object.

JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription}

RESUME (JSON):
${input.resumeText}

Return a JSON object with EXACTLY these fields and nothing else:
{
  "score": <integer 0-100: how well the resume matches the JD for ATS keyword screening>,
  "matchedKeywords": [<important JD skills/keywords that ARE present in the resume>],
  "missingKeywords": [<important JD skills/keywords that are MISSING from the resume>],
  "rationale": "<2-4 sentence explanation of the score>",
  "suggestions": [<3-5 concrete, specific edits that would raise the score>]
}
Be strict and realistic. This is an ESTIMATE of ATS keyword alignment, not a guarantee.`;

  const raw = await generateJsonContent(prompt);
  const parsed = JSON.parse(raw) as Partial<AtsReport>;

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    matchedKeywords: toStringArray(parsed.matchedKeywords),
    missingKeywords: toStringArray(parsed.missingKeywords),
    rationale: String(parsed.rationale ?? ''),
    suggestions: toStringArray(parsed.suggestions)
  };
}
