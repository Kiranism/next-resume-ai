// Bullet-level writing critique — deterministic, client-safe, instant.
// Line-by-line checks over experience/project bullets (plus the summary) for
// the patterns that make recruiters skim past: weak verb starts, passive
// voice, clichés, filler, first-person pronouns, missing metrics, bad length.
// No model call: the same check that flags a bullet verifies its rewrite.
import type { NormalizedResume } from './ats-match';

export type BulletIssueType =
  | 'weak-start'
  | 'passive'
  | 'cliche'
  | 'filler'
  | 'pronoun'
  | 'no-metric'
  | 'too-long'
  | 'too-short';

export interface BulletIssue {
  type: BulletIssueType;
  // Human-readable, e.g. 'Weak start: "responsible for"'.
  label: string;
}

export interface BulletCritique {
  section: 'jobs' | 'projects';
  itemIndex: number;
  itemLabel: string; // e.g. "Senior Frontend Engineer, Acme" / "CVTailor"
  bulletIndex: number;
  text: string;
  issues: BulletIssue[];
  // Set by the AI coach pass (server): contextual notes the deterministic
  // checks can't see, and a concrete proposed rewrite (may contain bracketed
  // metric placeholders like "[X]%" — never invented numbers).
  aiNotes?: string[];
  rewrite?: string;
}

export interface WritingReport {
  // Only bullets WITH issues (clean ones just count toward totals).
  flagged: BulletCritique[];
  totalBullets: number;
  flaggedCount: number;
  // First words used to open 3+ bullets — monotonous verb choice.
  repeatedStarts: string[];
  summaryIssues: BulletIssue[];
  // AI coach pass on the summary.
  summaryAiNotes?: string[];
  summaryRewrite?: string;
}

// Openers that describe duties instead of achievements.
const WEAK_STARTS = [
  'responsible for',
  'duties included',
  'tasked with',
  'worked on',
  'worked with',
  'helped with',
  'helped',
  'assisted with',
  'assisted',
  'involved in',
  'participated in',
  'in charge of',
  'handled',
  'dealt with',
  'was part of',
  'contributed to',
  'supported',
  'familiar with',
  'exposure to',
  'used'
];

const CLICHES = [
  'team player',
  'hard-working',
  'hardworking',
  'hard worker',
  'detail-oriented',
  'detail oriented',
  'go-getter',
  'self-starter',
  'self starter',
  'think outside the box',
  'outside the box',
  'results-driven',
  'results driven',
  'results-oriented',
  'goal-oriented',
  'proven track record',
  'track record of success',
  'fast learner',
  'quick learner',
  'people person',
  'synergy',
  'go above and beyond',
  'above and beyond',
  'win-win',
  'highly motivated',
  'dynamic professional',
  'seasoned professional',
  'passionate about'
];

// Empty amplifiers — cut them and the sentence gets stronger.
const FILLERS = [
  'successfully',
  'effectively',
  'efficiently',
  'seamlessly',
  'various',
  'numerous',
  'very',
  'extremely',
  'truly'
];

// First-person has no place on a resume. Case-sensitive so "US" (the country)
// never trips the lowercase "us" — which is why "us" is simply excluded.
const PRONOUN_RE = /(^|[^A-Za-z])(I|my|My|me|Me|we|We|our|Our)([^A-Za-z]|$)/;

// "was built", "were managed" — rewrite active: "built", "managed".
const PASSIVE_RE =
  /\b(was|were)\s+(\w+ed|built|made|done|given|led|run|won|written|driven|grown|held|set|put|kept|brought|chosen|shown)\b/i;

const MAX_WORDS = 32;
const MIN_WORDS = 4;

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function findPhrase(textLower: string, phrases: string[]): string | null {
  for (const p of phrases) {
    const idx = textLower.indexOf(p);
    if (idx === -1) continue;
    // Whole-word boundaries so "used" doesn't hit inside "housed".
    const before = idx === 0 ? '' : textLower[idx - 1];
    const afterIdx = idx + p.length;
    const after = afterIdx >= textLower.length ? '' : textLower[afterIdx];
    if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return p;
  }
  return null;
}

export function critiqueBullet(text: string): BulletIssue[] {
  const issues: BulletIssue[] = [];
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const wordList = words(trimmed);

  const weak = WEAK_STARTS.find((p) => lower.startsWith(p));
  if (weak) issues.push({ type: 'weak-start', label: `Weak start: "${weak}"` });

  if (PASSIVE_RE.test(trimmed)) {
    const m = trimmed.match(PASSIVE_RE);
    issues.push({
      type: 'passive',
      label: `Passive voice: "${m?.[0] ?? 'was/were + verb'}"`
    });
  }

  const cliche = findPhrase(lower, CLICHES);
  if (cliche) issues.push({ type: 'cliche', label: `Cliché: "${cliche}"` });

  const filler = findPhrase(lower, FILLERS);
  if (filler)
    issues.push({ type: 'filler', label: `Filler word: "${filler}"` });

  if (PRONOUN_RE.test(trimmed)) {
    issues.push({ type: 'pronoun', label: 'First-person pronoun' });
  }

  if (!/\d/.test(trimmed)) {
    issues.push({ type: 'no-metric', label: 'No metric' });
  }

  if (wordList.length > MAX_WORDS) {
    issues.push({
      type: 'too-long',
      label: `Too long (${wordList.length} words)`
    });
  } else if (wordList.length < MIN_WORDS) {
    issues.push({ type: 'too-short', label: 'Too thin — add what/how/impact' });
  }

  return issues;
}

// Summary is prose, not achievement bullets: metric/length rules differ, so
// only the style checks apply (plus its own generous length cap).
export function critiqueSummary(summary: string): BulletIssue[] {
  const issues: BulletIssue[] = [];
  const trimmed = summary.trim();
  if (!trimmed) return issues;
  const lower = trimmed.toLowerCase();

  if (PRONOUN_RE.test(trimmed)) {
    issues.push({
      type: 'pronoun',
      label:
        'First-person pronoun — write "Frontend engineer with…", not "I am…"'
    });
  }
  const cliche = findPhrase(lower, CLICHES);
  if (cliche) issues.push({ type: 'cliche', label: `Cliché: "${cliche}"` });
  const filler = findPhrase(lower, FILLERS);
  if (filler)
    issues.push({ type: 'filler', label: `Filler word: "${filler}"` });
  if (words(trimmed).length > 80) {
    issues.push({
      type: 'too-long',
      label: `Too long (${words(trimmed).length} words — aim under 80)`
    });
  }
  return issues;
}

export function critiqueResume(r: NormalizedResume): WritingReport {
  const flagged: BulletCritique[] = [];
  let totalBullets = 0;
  const startCounts = new Map<string, number>();

  const scan = (
    section: 'jobs' | 'projects',
    itemIndex: number,
    itemLabel: string,
    bullets: string[]
  ) => {
    bullets.forEach((text, bulletIndex) => {
      totalBullets++;
      const first = words(text)[0]
        ?.toLowerCase()
        .replace(/[^a-z]/g, '');
      if (first && first.length > 2) {
        startCounts.set(first, (startCounts.get(first) ?? 0) + 1);
      }
      const issues = critiqueBullet(text);
      if (issues.length > 0) {
        flagged.push({
          section,
          itemIndex,
          itemLabel,
          bulletIndex,
          text,
          issues
        });
      }
    });
  };

  r.jobs.forEach((j, i) =>
    scan(
      'jobs',
      i,
      [j.title, j.employer].filter(Boolean).join(', ') || 'Job',
      j.bullets
    )
  );
  r.projects.forEach((p, i) =>
    scan('projects', i, p.name || 'Project', p.bullets)
  );

  const repeatedStarts = [...startCounts.entries()]
    .filter(([, n]) => n >= 3)
    .map(([w]) => w);

  return {
    flagged,
    totalBullets,
    flaggedCount: flagged.length,
    repeatedStarts,
    summaryIssues: critiqueSummary(r.summary)
  };
}
