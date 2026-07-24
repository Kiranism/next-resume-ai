import { generateJsonContent } from './ai-model';
import { ATS_SCORING_GUIDELINES } from './resume-guidance';
import { ATS_ANALYSIS_GUIDANCE } from './resume-skills';

export type AtsReport = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  rationale: string;
  suggestions: string[];
};

// Collapse to lowercase alphanumerics so "Next.js", "NextJS", and "next js" all
// become "nextjs" — punctuation/spacing variants match, which is what an ATS
// keyword screen effectively does.
function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Deterministic presence test: is `keyword` in the resume text?
//  - Multi-token terms ("CI/CD", "Next.js", "content management") match on their
//    concatenated compact form, so punctuation/spacing variants all count.
//  - A single LONG token (>=5, e.g. "kubernetes", "graphql") matches as a
//    compact substring.
//  - A single SHORT token ("AI", "Go", "SQL", "Java") requires a whole-word
//    match, so it doesn't false-positive inside "trAIning" or "JavaScript".
function resumeHasKeyword(
  keyword: string,
  resumeLower: string,
  resumeCompact: string
): boolean {
  const tokens = keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.length >= 2) return resumeCompact.includes(tokens.join(''));

  const token = tokens[0];
  if (token.length >= 5) return resumeCompact.includes(token);
  try {
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`).test(
      resumeLower
    );
  } catch {
    return resumeCompact.includes(token);
  }
}

// The deterministic core — exported so it can be unit-tested without an LLM.
// Given the JD keywords and the resume text, partition matched/missing and score
// by coverage. Adding a keyword to the resume ALWAYS moves it matched and raises
// the score, which is what makes the analyze→improve→re-analyze loop converge.
export function computeAtsMatch(
  keywords: string[],
  resumeText: string
): { matchedKeywords: string[]; missingKeywords: string[]; score: number } {
  const resumeLower = resumeText.toLowerCase();
  const resumeCompact = compact(resumeText);

  const seen = new Set<string>();
  const unique = keywords
    .map((k) => k.trim())
    .filter((k) => {
      const c = compact(k);
      if (!c || seen.has(c)) return false;
      seen.add(c);
      return true;
    });

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  for (const kw of unique) {
    if (resumeHasKeyword(kw, resumeLower, resumeCompact))
      matchedKeywords.push(kw);
    else missingKeywords.push(kw);
  }

  const total = unique.length;
  const score =
    total === 0 ? 0 : Math.round((matchedKeywords.length / total) * 100);
  return { matchedKeywords, missingKeywords, score };
}

export async function analyzeResumeAts(input: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
}): Promise<AtsReport> {
  // The LLM does the part it's good at — understanding the JD and pulling out the
  // keywords that matter. Matching + scoring are done deterministically below so
  // the score is stable and moves only when the resume actually changes.
  const prompt = `You are an ATS keyword analyst. From the JOB DESCRIPTION below, extract the most important keywords a resume MUST contain to pass ATS keyword screening for this role: hard skills, technologies, tools, methodologies, certifications, and concrete qualifications. Prefer specific, screenable terms ("React", "Next.js", "CI/CD", "Kubernetes", "content management") over generic soft skills.

JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription}

${ATS_ANALYSIS_GUIDANCE}

${ATS_SCORING_GUIDELINES}

Return ONLY this JSON object and nothing else:
{
  "keywords": [12-20 keyword strings, each 1-4 words, most important first],
  "suggestions": [3-5 concrete edits that would make the resume match this job better]
}`;

  const raw = await generateJsonContent(prompt);
  let parsed: { keywords?: unknown; suggestions?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

  const keywords = toStringArray(parsed.keywords);
  const suggestions = toStringArray(parsed.suggestions);

  const { matchedKeywords, missingKeywords, score } = computeAtsMatch(
    keywords,
    input.resumeText
  );

  const total = matchedKeywords.length + missingKeywords.length;
  const rationale =
    total === 0
      ? 'Could not extract keywords from the job description — add a job description to get an ATS match score.'
      : `Your resume contains ${matchedKeywords.length} of ${total} key terms from the job description (${score}%). Add the missing keywords below — in your skills, and where truthful in your experience bullets and summary — to raise your ATS match.`;

  const finalSuggestions =
    suggestions.length > 0
      ? suggestions
      : missingKeywords.length > 0
        ? [
            `Add these missing keywords where they fit your background: ${missingKeywords
              .slice(0, 8)
              .join(', ')}.`
          ]
        : [
            'Your resume already covers the key terms — tighten wording and quantify impact.'
          ];

  return {
    score,
    matchedKeywords,
    missingKeywords,
    rationale,
    suggestions: finalSuggestions
  };
}
