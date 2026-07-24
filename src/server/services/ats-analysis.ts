import { generateJsonContent } from './ai-model';
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

type Importance = 'required' | 'preferred';
type AnalyzedKeyword = { term: string; importance: Importance };

// Score per the Resume ATS Optimizer criteria: the JD's keywords split into
// REQUIRED (must-have/critical) and PREFERRED (nice-to-have), scored by coverage
// with required weighted heavily. Presence is checked deterministically, so a
// keyword that's literally in the resume ALWAYS counts — that's what keeps the
// analyze→improve→re-analyze loop converging. Exported for unit testing.
const PREFERRED_WEIGHT = 0.4;

export function scoreAtsMatch(
  keywords: AnalyzedKeyword[],
  resumeText: string
): { matchedKeywords: string[]; missingKeywords: string[]; score: number } {
  const resumeLower = resumeText.toLowerCase();
  const resumeCompact = compact(resumeText);

  const seen = new Set<string>();
  const unique: AnalyzedKeyword[] = [];
  for (const k of keywords) {
    const term = (k?.term ?? '').trim();
    const c = compact(term);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    unique.push({
      term,
      importance: k.importance === 'preferred' ? 'preferred' : 'required'
    });
  }
  // Required first (Resume ATS Optimizer lists must-haves first).
  unique.sort((a, b) =>
    a.importance === b.importance ? 0 : a.importance === 'required' ? -1 : 1
  );

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  let reqTotal = 0;
  let reqMatched = 0;
  let prefTotal = 0;
  let prefMatched = 0;
  for (const kw of unique) {
    const present = resumeHasKeyword(kw.term, resumeLower, resumeCompact);
    if (kw.importance === 'required') {
      reqTotal++;
      if (present) reqMatched++;
    } else {
      prefTotal++;
      if (present) prefMatched++;
    }
    (present ? matchedKeywords : missingKeywords).push(kw.term);
  }

  const numerator = reqMatched + PREFERRED_WEIGHT * prefMatched;
  const denominator = reqTotal + PREFERRED_WEIGHT * prefTotal;
  const score =
    denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
  return { matchedKeywords, missingKeywords, score };
}

export async function analyzeResumeAts(input: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
}): Promise<AtsReport> {
  // The LLM extracts + classifies the JD keywords following the Resume ATS
  // Optimizer criteria (reference guidance). Matching + scoring stay
  // deterministic so the score is stable and only moves when the resume changes.
  const prompt = `You are an ATS keyword analyst. Follow the Resume ATS Optimizer criteria in the reference guidance below. From the JOB DESCRIPTION, extract the keywords a resume must contain to pass ATS screening — hard skills, technologies, tools, methodologies, certifications, concrete qualifications — and classify EACH as:
- "required": must-have / critical (under Requirements, "must have", "X years", or mentioned repeatedly)
- "preferred": nice-to-have / bonus ("a plus", "preferred", mentioned once)
Prefer specific, screenable terms ("React", "Next.js", "CI/CD", "Kubernetes", "content management") over generic soft skills.

JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription}

${ATS_ANALYSIS_GUIDANCE}

Return ONLY this JSON object and nothing else:
{
  "keywords": [{"term": "React", "importance": "required"}, ...],
  "suggestions": ["3-5 concrete edits that would raise the match, inserting missing REQUIRED keywords into the summary, skills, or a specific experience bullet"]
}
Include 12-20 keywords, most important first.`;

  const raw = await generateJsonContent(prompt);
  let parsed: { keywords?: unknown; suggestions?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  // Accept both the classified shape ({term, importance}) and a bare string list
  // (older/loose model output) — bare strings default to "required".
  const keywords: AnalyzedKeyword[] = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .map((k): AnalyzedKeyword | null => {
          if (typeof k === 'string') {
            return { term: k, importance: 'required' };
          }
          if (k && typeof k === 'object' && 'term' in k) {
            const obj = k as { term?: unknown; importance?: unknown };
            return {
              term: String(obj.term ?? ''),
              importance:
                obj.importance === 'preferred' ? 'preferred' : 'required'
            };
          }
          return null;
        })
        .filter((k): k is AnalyzedKeyword => k !== null && k.term.trim() !== '')
    : [];

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const { matchedKeywords, missingKeywords, score } = scoreAtsMatch(
    keywords,
    input.resumeText
  );

  const total = matchedKeywords.length + missingKeywords.length;
  const band =
    score >= 90
      ? 'excellent'
      : score >= 75
        ? 'strong'
        : score >= 60
          ? 'good'
          : score >= 50
            ? 'a stretch'
            : 'under-qualified';
  const rationale =
    total === 0
      ? 'Could not extract keywords from the job description — add a job description to get an ATS match score.'
      : `You match ${matchedKeywords.length} of ${total} key terms from the job description — ${score}% (${band}; aim for 80%+). Add the missing required keywords below — in your skills, and where truthful in your experience bullets and summary — to raise the score.`;

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
