import { generateJsonContent } from './ai-model';
import { ATS_ANALYSIS_GUIDANCE } from './resume-skills';
import {
  buildMatchIndex,
  indexHasTerm,
  listText,
  narrativeText,
  resumeToPlainText,
  termCount,
  tokenize,
  type AnalyzedKeyword,
  type NormalizedResume
} from '@/features/resume/utils/ats-match';

// The pure matching core (normalization, n-gram matcher) lives in
// features/resume/utils/ats-match.ts so the client's verify-after-apply check
// uses the exact same logic. Re-exported here for the router and tests.
export {
  buildMatchIndex,
  indexHasTerm,
  normalizeResumeInput,
  resumeToPlainText,
  stripHtml
} from '@/features/resume/utils/ats-match';
export type {
  AnalyzedKeyword,
  MatchIndex,
  NormalizedResume
} from '@/features/resume/utils/ats-match';

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// ---------------------------------------------------------------------------
// Keyword scoring (60% of the blended score)
// ---------------------------------------------------------------------------

const PREFERRED_WEIGHT = 0.4;
const STUFFING_THRESHOLD = 6;

export function scoreAtsMatch(
  keywords: AnalyzedKeyword[],
  fullText: string,
  narrative?: string,
  lists?: string
): {
  matchedKeywords: string[];
  missingKeywords: string[];
  missingRequired: string[];
  missingPreferred: string[];
  // Matched only via an alias — the exact JD term itself is absent.
  aliasMatched: string[];
  // Literally missing (term + aliases), but the model judged the resume covers
  // it semantically — "add the exact term" guidance, never score credit.
  synonymCovered: string[];
  // Matched, but only in the skills/tools lists — never demonstrated in a
  // summary/experience/project line.
  listOnly: string[];
  stuffed: { term: string; count: number }[];
  score: number;
} {
  const fullIdx = buildMatchIndex(fullText);
  const narrativeIdx = narrative ? buildMatchIndex(narrative) : null;
  const listIdx = lists ? buildMatchIndex(lists) : null;

  const seen = new Set<string>();
  const unique: AnalyzedKeyword[] = [];
  for (const k of keywords) {
    const term = (k?.term ?? '').trim();
    const key = tokenize(term).join('');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({
      term,
      importance: k.importance === 'preferred' ? 'preferred' : 'required',
      aliases: (k.aliases ?? [])
        .map((a) => String(a).trim())
        .filter((a) => a && tokenize(a).join('') !== key)
        .slice(0, 3),
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
  const aliasMatched: string[] = [];
  const synonymCovered: string[] = [];
  const listOnly: string[] = [];
  const stuffed: { term: string; count: number }[] = [];
  let reqTotal = 0;
  let reqMatched = 0;
  let prefTotal = 0;
  let prefMatched = 0;

  for (const kw of unique) {
    const exact = indexHasTerm(kw.term, fullIdx);
    const viaAlias =
      !exact && (kw.aliases ?? []).some((a) => indexHasTerm(a, fullIdx));
    const matched = exact || viaAlias;

    if (kw.importance === 'required') {
      reqTotal++;
      if (matched) reqMatched++;
      else missingRequired.push(kw.term);
    } else {
      prefTotal++;
      if (matched) prefMatched++;
      else missingPreferred.push(kw.term);
    }
    (matched ? matchedKeywords : missingKeywords).push(kw.term);
    if (viaAlias) aliasMatched.push(kw.term);
    if (!matched && kw.present === true) synonymCovered.push(kw.term);

    if (matched && narrativeIdx && listIdx) {
      const forms = [kw.term, ...(kw.aliases ?? [])];
      const inNarrative = forms.some((f) => indexHasTerm(f, narrativeIdx));
      const inLists = forms.some((f) => indexHasTerm(f, listIdx));
      if (!inNarrative && inLists) listOnly.push(kw.term);
    }
    if (exact) {
      const count = termCount(kw.term, fullIdx);
      if (count >= STUFFING_THRESHOLD) stuffed.push({ term: kw.term, count });
    }
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
    aliasMatched,
    synonymCovered,
    listOnly,
    stuffed,
    score
  };
}

// Deterministically drop extracted keywords that don't literally appear in the
// JD — the model occasionally "extracts" a term the JD never says, which
// poisons the denominator with an unmatchable requirement. Falls back to the
// full list if validation would leave too few (heavily paraphrased JDs).
export function filterKeywordsToJd(
  keywords: AnalyzedKeyword[],
  jdText: string
): AnalyzedKeyword[] {
  const jdIdx = buildMatchIndex(jdText);
  const kept = keywords.filter((k) => indexHasTerm(k.term, jdIdx));
  // Keep the validated list when a solid majority survives; if validation
  // guts the list, the JD is paraphrase-heavy — trust the model instead.
  return kept.length >= Math.max(3, Math.ceil(keywords.length / 2))
    ? kept
    : keywords;
}

// ---------------------------------------------------------------------------
// Blended multi-dimension score
// ---------------------------------------------------------------------------

export type AtsDimension = {
  key: 'keywords' | 'quantification' | 'title' | 'sections' | 'length';
  label: string;
  score: number; // 0-100
  weight: number; // fraction of the overall score
  detail: string;
};

export type AtsReport = {
  score: number; // blended overall
  keywordScore: number;
  breakdown: AtsDimension[];
  matchedKeywords: string[];
  missingKeywords: string[];
  missingRequired: string[];
  missingPreferred: string[];
  rationale: string;
  suggestions: string[];
};

const TITLE_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'and',
  'or',
  'for',
  'in',
  'to',
  'with',
  'at',
  'on'
]);

function titleDimension(jdTitle: string, r: NormalizedResume): AtsDimension {
  const wanted = tokenize(jdTitle).filter((t) => !TITLE_STOPWORDS.has(t));
  const titlesIdx = buildMatchIndex(
    [r.title, ...r.jobs.map((j) => j.title)].filter(Boolean).join('\n')
  );
  if (wanted.length === 0) {
    return {
      key: 'title',
      label: 'Title match',
      score: 100,
      weight: 0.1,
      detail: 'No target job title set.'
    };
  }
  const hit = wanted.filter((t) => indexHasTerm(t, titlesIdx)).length;
  const score = Math.round((hit / wanted.length) * 100);
  return {
    key: 'title',
    label: 'Title match',
    score,
    weight: 0.1,
    detail: `${hit} of ${wanted.length} words from "${jdTitle.trim()}" appear in your titles.`
  };
}

function quantificationDimension(r: NormalizedResume): {
  dim: AtsDimension;
  quantified: number;
  bulletCount: number;
} {
  const bullets = [
    ...r.jobs.flatMap((j) => j.bullets),
    ...r.projects.flatMap((p) => p.bullets)
  ];
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  // 50%+ of bullets carrying a metric = full marks (Resume Quantifier bar).
  const score =
    bullets.length === 0
      ? 0
      : Math.min(100, Math.round((quantified / bullets.length / 0.5) * 100));
  return {
    dim: {
      key: 'quantification',
      label: 'Quantified impact',
      score,
      weight: 0.15,
      detail: `${quantified} of ${bullets.length} experience/project bullets include a number.`
    },
    quantified,
    bulletCount: bullets.length
  };
}

function sectionsDimension(r: NormalizedResume): AtsDimension {
  const checks: [boolean, string][] = [
    [r.summary.trim().length >= 30, 'summary'],
    [r.jobs.length >= 1, 'experience'],
    [r.educations.length >= 1, 'education'],
    [r.skills.length + r.tools.length >= 3, 'skills']
  ];
  const missing = checks.filter(([ok]) => !ok).map(([, name]) => name);
  const score = Math.round(
    (checks.filter(([ok]) => ok).length / checks.length) * 100
  );
  return {
    key: 'sections',
    label: 'Core sections',
    score,
    weight: 0.1,
    detail: missing.length
      ? `Missing or thin: ${missing.join(', ')}.`
      : 'Summary, experience, education, and skills all present.'
  };
}

function lengthDimension(plainText: string): AtsDimension {
  const words = tokenize(plainText).length;
  const score =
    words >= 400 && words <= 800
      ? 100
      : (words >= 250 && words < 400) || (words > 800 && words <= 1100)
        ? 70
        : 40;
  return {
    key: 'length',
    label: 'Length',
    score,
    weight: 0.05,
    detail: `${words} words (400–800 is the sweet spot).`
  };
}

// Assemble the five weighted dimensions and the blended overall score.
// Exported for unit testing (analyzeResumeAts needs a live model).
export function buildAtsBreakdown(
  resume: NormalizedResume,
  jobTitle: string,
  plainText: string,
  kwScore: number,
  kwMatched: number,
  kwTotal: number
): {
  breakdown: AtsDimension[];
  overall: number;
  quantified: number;
  bulletCount: number;
} {
  const keywordsDim: AtsDimension = {
    key: 'keywords',
    label: 'Keyword match',
    score: kwScore,
    weight: 0.6,
    detail: `${kwMatched} of ${kwTotal} JD terms found (required terms weigh 2.5× preferred).`
  };
  const quant = quantificationDimension(resume);
  const breakdown: AtsDimension[] = [
    keywordsDim,
    quant.dim,
    titleDimension(jobTitle, resume),
    sectionsDimension(resume),
    lengthDimension(plainText)
  ];
  const overall = Math.round(
    breakdown.reduce((sum, d) => sum + d.score * d.weight, 0)
  );
  return {
    breakdown,
    overall,
    quantified: quant.quantified,
    bulletCount: quant.bulletCount
  };
}

// ---------------------------------------------------------------------------
// Full analysis
// ---------------------------------------------------------------------------

export async function analyzeResumeAts(input: {
  jobTitle: string;
  jobDescription: string;
  resume: NormalizedResume;
  // A previously-extracted keyword set for this JD. When provided the model
  // REUSES it (only re-judging presence + suggestions), so the gap list stays
  // stable across analyses instead of drifting on every call.
  cachedKeywords?: AnalyzedKeyword[] | null;
}): Promise<AtsReport & { keywords: AnalyzedKeyword[] }> {
  const plainText = resumeToPlainText(input.resume);
  const cached =
    Array.isArray(input.cachedKeywords) && input.cachedKeywords.length > 0
      ? input.cachedKeywords
      : null;

  const keywordTask = cached
    ? `Use EXACTLY this fixed keyword list — do NOT add, drop, or rename any (keep each "aliases" list as given):
${JSON.stringify(
  cached.map((k) => ({
    term: k.term,
    importance: k.importance,
    aliases: k.aliases ?? []
  }))
)}
For each keyword set "present" to whether the RESUME already demonstrates it, counting synonyms/equivalents (e.g. "continuous integration" satisfies "CI/CD", "led a team" satisfies "leadership").`
    : `Extract 12-20 keywords a resume must contain to pass ATS screening — hard skills, technologies, tools, methodologies, certifications, concrete qualifications (prefer specific screenable terms over generic soft skills). Every term must appear VERBATIM in the job description. Classify EACH as "required" (must-have/critical: under Requirements, "must have", "X years", or repeated) or "preferred" (nice-to-have: "a plus", "preferred", mentioned once). For each keyword also list up to 3 "aliases": alternate literal spellings an ATS search would accept as the SAME thing — acronym ↔ expansion ("CI/CD" ↔ "continuous integration"), product-name variants ("React.js" ↔ "React") — NOT broader concepts. Set "present" to whether the RESUME already demonstrates it, counting synonyms/equivalents.`;

  const prompt = `You are an ATS keyword analyst. Follow the Resume ATS Optimizer criteria in the reference guidance below.

JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription}

RESUME:
${plainText}

${ATS_ANALYSIS_GUIDANCE}

${keywordTask}

Return ONLY this JSON object and nothing else:
{
  "keywords": [{"term": "React", "importance": "required", "aliases": ["React.js"], "present": true}, ...],
  "suggestions": ["3-4 concrete edits that would raise the match; each must be ONE self-contained instruction naming the target section (summary, skills, or a specific job/project) and the exact keywords or text to add"]
}
List required keywords first.`;

  const raw = await generateJsonContent(prompt);
  let parsed: { keywords?: unknown; suggestions?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  // Accept the classified shape ({term, importance, aliases, present}) or a
  // bare string list (loose model output) — bare strings default to "required".
  let keywords: AnalyzedKeyword[] = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .map((k): AnalyzedKeyword | null => {
          if (typeof k === 'string') {
            return { term: k, importance: 'required', aliases: [] };
          }
          if (k && typeof k === 'object' && 'term' in k) {
            const obj = k as {
              term?: unknown;
              importance?: unknown;
              aliases?: unknown;
              present?: unknown;
            };
            return {
              term: String(obj.term ?? ''),
              importance:
                obj.importance === 'preferred' ? 'preferred' : 'required',
              aliases: arr(obj.aliases)
                .map((a) => String(a).trim())
                .filter(Boolean)
                .slice(0, 3),
              present: obj.present === true
            };
          }
          return null;
        })
        .filter((k): k is AnalyzedKeyword => k !== null && k.term.trim() !== '')
    : [];

  // Freshly-extracted keywords must literally appear in the JD (cached sets
  // were validated when first extracted).
  if (!cached && keywords.length > 0) {
    keywords = filterKeywordsToJd(
      keywords,
      `${input.jobTitle}\n${input.jobDescription}`
    );
  }

  const llmSuggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const kw = scoreAtsMatch(
    keywords,
    plainText,
    narrativeText(input.resume),
    listText(input.resume)
  );

  // ----- blended score -----
  const { breakdown, overall, quantified, bulletCount } = buildAtsBreakdown(
    input.resume,
    input.jobTitle,
    plainText,
    kw.score,
    kw.matchedKeywords.length,
    kw.matchedKeywords.length + kw.missingKeywords.length
  );

  // ----- suggestions: exact-term hints, then LLM edits, then diagnostics -----
  const hints: string[] = [];
  if (kw.aliasMatched.length > 0) {
    hints.push(
      `Swap in the exact JD wording for: ${kw.aliasMatched
        .slice(0, 6)
        .join(
          ', '
        )} — you match via an equivalent term, but the verbatim keyword is what every ATS search hits.`
    );
  }
  if (kw.synonymCovered.length > 0) {
    hints.push(
      `Use the EXACT job-description terms for these — your resume covers them with related wording, but an ATS matches literally: ${kw.synonymCovered
        .slice(0, 6)
        .join(', ')}.`
    );
  }

  const diagnostics: string[] = [];
  if (kw.listOnly.length > 0) {
    diagnostics.push(
      `Demonstrate these in an experience or project bullet — right now they only appear in your skills list: ${kw.listOnly
        .slice(0, 5)
        .join(', ')}.`
    );
  }
  const quantDim = breakdown.find((d) => d.key === 'quantification')!;
  if (bulletCount > 0 && quantDim.score < 70) {
    diagnostics.push(
      `Only ${quantified} of ${bulletCount} bullets include a number — quantify impact (%, $, users, time saved, scale).`
    );
  }
  const titleDim = breakdown.find((d) => d.key === 'title')!;
  if (titleDim.score < 100 && input.jobTitle.trim()) {
    diagnostics.push(
      `Mirror the target job title where truthful: the JD says "${input.jobTitle.trim()}"${
        input.resume.title
          ? ` but your resume title reads "${input.resume.title}"`
          : ' and your resume has no title'
      }.`
    );
  }
  const lengthDim = breakdown.find((d) => d.key === 'length')!;
  if (lengthDim.score < 100) {
    diagnostics.push(`Adjust length: ${lengthDim.detail}`);
  }
  for (const s of kw.stuffed.slice(0, 2)) {
    diagnostics.push(
      `"${s.term}" appears ${s.count}× — vary the wording so it doesn't read as keyword stuffing.`
    );
  }

  const fallback =
    kw.missingRequired.length > 0
      ? [
          `Add these missing required keywords where they fit your background: ${kw.missingRequired
            .slice(0, 8)
            .join(', ')}.`
        ]
      : [];
  const suggestions = [
    ...hints,
    ...(llmSuggestions.length > 0 ? llmSuggestions.slice(0, 4) : fallback),
    ...diagnostics.slice(0, 4)
  ];

  const total = kw.matchedKeywords.length + kw.missingKeywords.length;
  const band =
    overall >= 90
      ? 'excellent'
      : overall >= 75
        ? 'strong'
        : overall >= 60
          ? 'good'
          : overall >= 50
            ? 'a stretch'
            : 'needs work';
  const rationale =
    total === 0
      ? 'Could not extract keywords from the job description — add a job description to get an ATS match score.'
      : `Overall ${overall}/100 (${band}; aim for 80+). Keyword match is 60% of the score — you hit ${kw.matchedKeywords.length} of ${total} JD terms — blended with quantified impact, title match, core sections, and length (see breakdown).`;

  return {
    score: overall,
    keywordScore: kw.score,
    breakdown,
    matchedKeywords: kw.matchedKeywords,
    missingKeywords: kw.missingKeywords,
    missingRequired: kw.missingRequired,
    missingPreferred: kw.missingPreferred,
    rationale,
    suggestions,
    keywords
  };
}
