// Pure, client-safe ATS matching core — shared by the server analysis service
// (ats-analysis.ts) and the chat's instant verify-after-apply check. No model
// calls, no server imports: normalization + deterministic keyword matching
// only, so client and server always agree on what "matches" means.

// ---------------------------------------------------------------------------
// Normalized resume — the single shape ATS matching works on. Built from
// either the DB row or the client form values (callers map field names), with
// hidden sections already excluded and Tiptap HTML stripped, so matching runs
// against the words a recruiter actually reads — never JSON keys or tags.
// ---------------------------------------------------------------------------

export type NormalizedResume = {
  name: string;
  title: string; // resume_job_title
  summary: string;
  jobs: {
    title: string;
    employer: string;
    location: string;
    dates: string;
    bullets: string[];
  }[];
  educations: {
    school: string;
    degree: string;
    field: string;
    bullets: string[];
  }[];
  projects: { name: string; bullets: string[] }[];
  skills: string[];
  tools: string[];
  languages: string[];
};

// `aliases` are alternate literal forms an ATS-configured search accepts as the
// same thing (acronym ↔ expansion, "React.js" ↔ "React"). A keyword counts as
// matched when the exact term OR any alias literally appears — deterministic,
// so the analyze→improve→re-analyze loop always converges. `present` is the
// model's broader semantic judgment; it never affects the score, only the
// "use the exact term" hint.
export type AnalyzedKeyword = {
  term: string;
  importance: 'required' | 'preferred';
  aliases?: string[];
  present?: boolean;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

// Tiptap descriptions are HTML — reduce to plain text lines.
export function stripHtml(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/div|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function toBullets(description: string): string[] {
  return stripHtml(description)
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•·◦*\-–—]+/, '').trim())
    .filter((line) => line.length > 1);
}

// Map raw section data (DB row or client form values — inner item shapes are
// identical) into a NormalizedResume, dropping hidden sections entirely so
// their content can't inflate the match for a resume the recruiter never sees.
export function normalizeResumeInput(input: {
  personalDetails?: unknown;
  jobs?: unknown;
  educations?: unknown;
  projects?: unknown;
  skills?: unknown;
  tools?: unknown;
  languages?: unknown;
  hiddenSections?: unknown;
}): NormalizedResume {
  const hidden = new Set(arr(input.hiddenSections).map((s) => String(s)));
  const pd = rec(input.personalDetails);
  const nameOf = (item: unknown, key: string): string =>
    typeof item === 'string' ? item : str(rec(item)[key]);

  return {
    name: [str(pd.fname), str(pd.lname)].filter(Boolean).join(' '),
    title: str(pd.resume_job_title),
    summary: hidden.has('summary') ? '' : stripHtml(str(pd.summary)),
    jobs: hidden.has('experience')
      ? []
      : arr(input.jobs).map((j) => {
          const job = rec(j);
          const dates = [str(job.startDate), str(job.endDate)]
            .filter(Boolean)
            .join(' – ');
          return {
            title: str(job.jobTitle),
            employer: str(job.employer),
            location: str(job.city),
            dates,
            bullets: toBullets(str(job.description))
          };
        }),
    educations: hidden.has('education')
      ? []
      : arr(input.educations).map((e) => {
          const edu = rec(e);
          return {
            school: str(edu.school),
            degree: str(edu.degree),
            field: str(edu.field),
            bullets: toBullets(str(edu.description))
          };
        }),
    projects: hidden.has('projects')
      ? []
      : arr(input.projects).map((p) => {
          const proj = rec(p);
          return {
            name: str(proj.name),
            bullets: toBullets(str(proj.description))
          };
        }),
    skills: hidden.has('skills')
      ? []
      : arr(input.skills)
          .map((s) => nameOf(s, 'skill_name'))
          .filter(Boolean),
    tools: hidden.has('tools')
      ? []
      : arr(input.tools)
          .map((t) => nameOf(t, 'tool_name'))
          .filter(Boolean),
    languages: hidden.has('languages')
      ? []
      : arr(input.languages)
          .map((l) => nameOf(l, 'lang_name'))
          .filter(Boolean)
  };
}

// The narrative text (summary + experience + projects + education) vs the flat
// skill lists — used for "only in your skills list" placement hints.
export function narrativeText(r: NormalizedResume): string {
  const lines: string[] = [];
  if (r.name || r.title)
    lines.push([r.name, r.title].filter(Boolean).join(' — '));
  if (r.summary) lines.push(`Summary: ${r.summary}`);
  for (const j of r.jobs) {
    const head = [j.title, j.employer].filter(Boolean).join(', ');
    const meta = [j.dates, j.location].filter(Boolean).join(' — ');
    const line = head ? (meta ? `${head} (${meta})` : head) : meta;
    if (line) lines.push(line);
    for (const b of j.bullets) lines.push(`- ${b}`);
  }
  for (const p of r.projects) {
    if (p.name) lines.push(p.name);
    for (const b of p.bullets) lines.push(`- ${b}`);
  }
  for (const e of r.educations) {
    const head = [e.degree, e.field].filter(Boolean).join(' in ');
    lines.push([head, e.school].filter(Boolean).join(', '));
    for (const b of e.bullets) lines.push(`- ${b}`);
  }
  return lines.join('\n');
}

export function listText(r: NormalizedResume): string {
  const lines: string[] = [];
  if (r.skills.length) lines.push(`Skills: ${r.skills.join(', ')}`);
  if (r.tools.length) lines.push(`Tools: ${r.tools.join(', ')}`);
  if (r.languages.length) lines.push(`Languages: ${r.languages.join(', ')}`);
  return lines.join('\n');
}

// Human-readable plain text of the visible resume: what the matcher scans and
// what the model reads. Empty sections are omitted entirely — a bare
// "education" section header must not satisfy an "education" keyword.
export function resumeToPlainText(r: NormalizedResume): string {
  const parts: string[] = [];
  const narrative = narrativeText(r);
  if (narrative) parts.push(narrative);
  const lists = listText(r);
  if (lists) parts.push(lists);
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Deterministic matcher — n-gram token index.
//
// The resume text is tokenized (lowercase alphanumeric runs) and every join of
// 1–5 consecutive tokens is indexed in compact form. A keyword matches when its
// own compact join is in the index:
//   "Next.js" → "nextjs"  matches resume "NextJS" / "next js" / "Next.js"
//   "CI/CD"   → "cicd"    matches "CI/CD" and "ci cd"
//   "react"   does NOT match inside "reaction" (different token) — a plain
//   substring matcher false-positives here.
// Single short tokens ("AI", "Go", "SQL") use a whole-word regex so they can't
// hit inside other words ("trAIning").
// ---------------------------------------------------------------------------

const MAX_NGRAM = 5;

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type MatchIndex = {
  lower: string;
  grams: Map<string, number>;
};

export function buildMatchIndex(text: string): MatchIndex {
  const lower = text.toLowerCase();
  const tokens = tokenize(lower);
  const grams = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    let joined = '';
    for (let n = 0; n < MAX_NGRAM && i + n < tokens.length; n++) {
      joined += tokens[i + n];
      grams.set(joined, (grams.get(joined) ?? 0) + 1);
    }
  }
  return { lower, grams };
}

export function indexHasTerm(term: string, index: MatchIndex): boolean {
  const tokens = tokenize(term);
  if (tokens.length === 0) return false;
  const joined = tokens.join('');
  if (tokens.length === 1 && joined.length < 5) {
    // Short single tokens need whole-word matching ("AI" ≠ "trAIning").
    try {
      return new RegExp(
        `(^|[^a-z0-9])${escapeRegex(joined)}([^a-z0-9]|$)`
      ).test(index.lower);
    } catch {
      return index.grams.has(joined);
    }
  }
  return index.grams.has(joined);
}

export function termCount(term: string, index: MatchIndex): number {
  const joined = tokenize(term).join('');
  return joined ? (index.grams.get(joined) ?? 0) : 0;
}

// Which keyword terms (exact or via alias) literally match this resume?
// Powers the chat's instant verify-after-apply check — same matcher the server
// scores with, so "✓ now matches" here is exactly what the next analysis says.
export function matchedTermSet(
  keywords: AnalyzedKeyword[],
  resume: NormalizedResume
): Set<string> {
  const idx = buildMatchIndex(resumeToPlainText(resume));
  const out = new Set<string>();
  for (const k of keywords) {
    const forms = [k.term, ...(k.aliases ?? [])];
    if (forms.some((f) => f && indexHasTerm(f, idx))) out.add(k.term);
  }
  return out;
}
