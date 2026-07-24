import { generateJsonContent } from './ai-model';
import { ATS_ANALYSIS_GUIDANCE } from './resume-skills';

export type AtsReport = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  // Missing split by importance (Resume ATS Optimizer criteria) so the UI can
  // show must-haves separately from nice-to-haves.
  missingRequired: string[];
  missingPreferred: string[];
  rationale: string;
  suggestions: string[];
};

type Importance = 'required' | 'preferred';
// `present` is the model's semantic judgment (does the resume demonstrate this,
// synonyms/equivalents included). It is OR'd with the deterministic exact-match
// during scoring, so a literally-present keyword always counts.
export type AnalyzedKeyword = {
  term: string;
  importance: Importance;
  present?: boolean;
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

// Score per the Resume ATS Optimizer criteria: keywords split into REQUIRED
// (must-have/critical) and PREFERRED (nice-to-have), scored by coverage with
// required weighted heavily. A keyword counts as present if the model judged it
// present (synonyms) OR it's a literal match — the literal match guarantees the
// analyze→improve→re-analyze loop converges. Exported for unit testing.
const PREFERRED_WEIGHT = 0.4;

export function scoreAtsMatch(
  keywords: AnalyzedKeyword[],
  resumeText: string
): {
  matchedKeywords: string[];
  missingKeywords: string[];
  missingRequired: string[];
  missingPreferred: string[];
  // Keywords literally MISSING but which the model judged the resume covers via
  // a synonym/equivalent — surfaced as "add the exact term" guidance, NOT counted
  // toward the score (a real ATS matches literally).
  synonymCovered: string[];
  score: number;
} {
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
      importance: k.importance === 'preferred' ? 'preferred' : 'required',
      present: k.present === true
    });
  }
  // Required first (Resume ATS Optimizer lists must-haves first).
  unique.sort((a, b) =>
    a.importance === b.importance ? 0 : a.importance === 'required' ? -1 : 1
  );

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  const missingRequired: string[] = [];
  const missingPreferred: string[] = [];
  const synonymCovered: string[] = [];
  let reqTotal = 0;
  let reqMatched = 0;
  let prefTotal = 0;
  let prefMatched = 0;
  for (const kw of unique) {
    // Score on LITERAL presence only — that's what an ATS keyword screen does.
    // The model's semantic `present` flag doesn't inflate the score; it only
    // marks "covered via a related term, add the exact keyword" for guidance.
    const literal = resumeHasKeyword(kw.term, resumeLower, resumeCompact);
    if (kw.importance === 'required') {
      reqTotal++;
      if (literal) reqMatched++;
      else missingRequired.push(kw.term);
    } else {
      prefTotal++;
      if (literal) prefMatched++;
      else missingPreferred.push(kw.term);
    }
    (literal ? matchedKeywords : missingKeywords).push(kw.term);
    if (!literal && kw.present === true) synonymCovered.push(kw.term);
  }

  const numerator = reqMatched + PREFERRED_WEIGHT * prefMatched;
  const denominator = reqTotal + PREFERRED_WEIGHT * prefTotal;
  const score =
    denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
  return {
    matchedKeywords,
    missingKeywords,
    missingRequired,
    missingPreferred,
    synonymCovered,
    score
  };
}

export async function analyzeResumeAts(input: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
  // A previously-extracted keyword set for this JD. When provided the model
  // REUSES it (only re-judging presence + suggestions), so the gap list stays
  // stable across analyses instead of drifting on every call.
  cachedKeywords?: AnalyzedKeyword[] | null;
}): Promise<AtsReport & { keywords: AnalyzedKeyword[] }> {
  const cached =
    Array.isArray(input.cachedKeywords) && input.cachedKeywords.length > 0
      ? input.cachedKeywords
      : null;

  const keywordTask = cached
    ? `Use EXACTLY this fixed keyword list — do NOT add, drop, or rename any:
${JSON.stringify(cached.map((k) => ({ term: k.term, importance: k.importance })))}
For each keyword set "present" to whether the RESUME already demonstrates it, counting synonyms/equivalents (e.g. "continuous integration" satisfies "CI/CD", "led a team" satisfies "leadership").`
    : `Extract 12-20 keywords a resume must contain to pass ATS screening — hard skills, technologies, tools, methodologies, certifications, concrete qualifications (prefer specific screenable terms over generic soft skills). Classify EACH as "required" (must-have/critical: under Requirements, "must have", "X years", or repeated) or "preferred" (nice-to-have: "a plus", "preferred", mentioned once), and set "present" to whether the RESUME already demonstrates it, counting synonyms/equivalents.`;

  const prompt = `You are an ATS keyword analyst. Follow the Resume ATS Optimizer criteria in the reference guidance below.

JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription}

RESUME (JSON):
${input.resumeText}

${ATS_ANALYSIS_GUIDANCE}

${keywordTask}

Return ONLY this JSON object and nothing else:
{
  "keywords": [{"term": "React", "importance": "required", "present": true}, ...],
  "suggestions": ["3-5 concrete edits that would raise the match, inserting missing REQUIRED keywords into the summary, skills, or a specific experience bullet"]
}
List required keywords first.`;

  const raw = await generateJsonContent(prompt);
  let parsed: { keywords?: unknown; suggestions?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  // Accept the classified shape ({term, importance, present}) or a bare string
  // list (loose model output) — bare strings default to "required".
  const keywords: AnalyzedKeyword[] = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .map((k): AnalyzedKeyword | null => {
          if (typeof k === 'string') {
            return { term: k, importance: 'required' };
          }
          if (k && typeof k === 'object' && 'term' in k) {
            const obj = k as {
              term?: unknown;
              importance?: unknown;
              present?: unknown;
            };
            return {
              term: String(obj.term ?? ''),
              importance:
                obj.importance === 'preferred' ? 'preferred' : 'required',
              present: obj.present === true
            };
          }
          return null;
        })
        .filter((k): k is AnalyzedKeyword => k !== null && k.term.trim() !== '')
    : [];

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const {
    matchedKeywords,
    missingKeywords,
    missingRequired,
    missingPreferred,
    synonymCovered,
    score
  } = scoreAtsMatch(keywords, input.resumeText);

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

  // "You cover these conceptually — use the exact term so an ATS matches" is the
  // most actionable, honest guidance the semantic pass produces.
  const synonymHint =
    synonymCovered.length > 0
      ? [
          `Use the EXACT job-description terms for these — your resume covers them with related wording, but an ATS matches literally: ${synonymCovered
            .slice(0, 8)
            .join(', ')}.`
        ]
      : [];
  const baseSuggestions =
    suggestions.length > 0
      ? suggestions
      : missingRequired.length > 0
        ? [
            `Add these missing required keywords where they fit your background: ${missingRequired
              .slice(0, 8)
              .join(', ')}.`
          ]
        : [
            'Your resume already covers the required terms — tighten wording and quantify impact.'
          ];
  const finalSuggestions = [...synonymHint, ...baseSuggestions];

  return {
    score,
    matchedKeywords,
    missingKeywords,
    missingRequired,
    missingPreferred,
    rationale,
    suggestions: finalSuggestions,
    keywords
  };
}
