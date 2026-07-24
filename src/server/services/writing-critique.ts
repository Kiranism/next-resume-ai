// AI bullet-level writing critique. The deterministic checks in
// features/resume/utils/bullet-critique.ts run first and seed the model as
// hints; the model (guided by the Resume Bullet Writer + Quantifier skills)
// judges every bullet in context — vagueness, weak outcomes, redundancy — and
// proposes a concrete rewrite for each one that can be stronger. Deterministic
// results are the graceful fallback when the model call fails, so "Review
// writing" always returns something.
import { generateJsonContent } from './ai-model';
import { CHAT_WRITING_GUIDANCE } from './resume-skills';
import type { NormalizedResume } from '@/features/resume/utils/ats-match';
import {
  critiqueResume,
  type BulletCritique,
  type WritingReport
} from '@/features/resume/utils/bullet-critique';

// Stable per-bullet id used in the prompt and parsed back from the response:
// "j0.2" = jobs[0], bullet 2; "p1.0" = projects[1], bullet 0.
function bulletId(section: 'jobs' | 'projects', item: number, b: number) {
  return `${section === 'jobs' ? 'j' : 'p'}${item}.${b}`;
}

function parseBulletId(id: string): {
  section: 'jobs' | 'projects';
  itemIndex: number;
  bulletIndex: number;
} | null {
  const m = /^([jp])(\d+)\.(\d+)$/.exec(id.trim());
  if (!m) return null;
  return {
    section: m[1] === 'j' ? 'jobs' : 'projects',
    itemIndex: Number(m[2]),
    bulletIndex: Number(m[3])
  };
}

type AiCritique = {
  bullets?: unknown;
  summary?: unknown;
};

// Merge the model's per-bullet notes/rewrites into the deterministic report.
// AI entries are validated against the actual resume (id must resolve, rewrite
// must be non-trivial); bullets only the AI flagged are added with empty
// deterministic issues. Exported for unit testing.
export function mergeAiCritique(
  base: WritingReport,
  resume: NormalizedResume,
  ai: AiCritique
): WritingReport {
  const byId = new Map<string, BulletCritique>();
  for (const b of base.flagged) {
    byId.set(bulletId(b.section, b.itemIndex, b.bulletIndex), b);
  }

  const bulletText = (
    section: 'jobs' | 'projects',
    itemIndex: number,
    bulletIndex: number
  ): { text: string; itemLabel: string } | null => {
    const item = section === 'jobs' ? resume.jobs[itemIndex] : undefined;
    const proj =
      section === 'projects' ? resume.projects[itemIndex] : undefined;
    const bullets = item?.bullets ?? proj?.bullets;
    const text = bullets?.[bulletIndex];
    if (typeof text !== 'string') return null;
    const itemLabel = item
      ? [item.title, item.employer].filter(Boolean).join(', ') || 'Job'
      : proj?.name || 'Project';
    return { text, itemLabel };
  };

  if (Array.isArray(ai.bullets)) {
    for (const raw of ai.bullets) {
      if (!raw || typeof raw !== 'object') continue;
      const obj = raw as { id?: unknown; issues?: unknown; rewrite?: unknown };
      const loc = parseBulletId(String(obj.id ?? ''));
      if (!loc) continue;
      const found = bulletText(loc.section, loc.itemIndex, loc.bulletIndex);
      if (!found) continue;

      const aiNotes = (Array.isArray(obj.issues) ? obj.issues : [])
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0 && s.length <= 80)
        .slice(0, 3);
      const rewriteRaw =
        typeof obj.rewrite === 'string' ? obj.rewrite.trim() : '';
      const rewrite =
        rewriteRaw.length > 0 &&
        rewriteRaw.length <= 400 &&
        rewriteRaw.toLowerCase() !== found.text.trim().toLowerCase()
          ? rewriteRaw
          : undefined;
      if (aiNotes.length === 0 && !rewrite) continue;

      const id = bulletId(loc.section, loc.itemIndex, loc.bulletIndex);
      const existing = byId.get(id);
      if (existing) {
        existing.aiNotes = aiNotes;
        existing.rewrite = rewrite;
      } else {
        const added: BulletCritique = {
          section: loc.section,
          itemIndex: loc.itemIndex,
          itemLabel: found.itemLabel,
          bulletIndex: loc.bulletIndex,
          text: found.text,
          issues: [],
          aiNotes,
          rewrite
        };
        byId.set(id, added);
        base.flagged.push(added);
      }
    }
  }

  if (ai.summary && typeof ai.summary === 'object') {
    const s = ai.summary as { issues?: unknown; rewrite?: unknown };
    base.summaryAiNotes = (Array.isArray(s.issues) ? s.issues : [])
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0 && x.length <= 80)
      .slice(0, 3);
    const rewrite = typeof s.rewrite === 'string' ? s.rewrite.trim() : '';
    if (
      rewrite &&
      rewrite.length <= 700 &&
      rewrite.toLowerCase() !== resume.summary.trim().toLowerCase()
    ) {
      base.summaryRewrite = rewrite;
    }
  }

  // Stable order: resume order (jobs before projects, then item/bullet index).
  base.flagged.sort((a, b) => {
    if (a.section !== b.section) return a.section === 'jobs' ? -1 : 1;
    return a.itemIndex - b.itemIndex || a.bulletIndex - b.bulletIndex;
  });
  base.flaggedCount = base.flagged.length;
  return base;
}

export async function critiqueWritingWithAi(
  resume: NormalizedResume
): Promise<WritingReport> {
  const base = critiqueResume(resume);
  if (base.totalBullets === 0 && !resume.summary.trim()) return base;

  const lines: string[] = [];
  resume.jobs.forEach((j, i) => {
    const label = [j.title, j.employer].filter(Boolean).join(', ') || 'Job';
    lines.push(`EXPERIENCE — ${label}:`);
    j.bullets.forEach((text, b) =>
      lines.push(`[${bulletId('jobs', i, b)}] ${text}`)
    );
  });
  resume.projects.forEach((p, i) => {
    lines.push(`PROJECT — ${p.name || 'Project'}:`);
    p.bullets.forEach((text, b) =>
      lines.push(`[${bulletId('projects', i, b)}] ${text}`)
    );
  });

  const flaggedHints = base.flagged
    .map(
      (b) =>
        `[${bulletId(b.section, b.itemIndex, b.bulletIndex)}] ${b.issues
          .map((i) => i.label)
          .join(', ')}`
    )
    .join('\n');

  const prompt = `You are an expert resume writing coach. Apply the principles in the reference guidance below.

${CHAT_WRITING_GUIDANCE}

RESUME BULLETS (each prefixed with its id):
${lines.join('\n')}

SUMMARY:
${resume.summary || '(none)'}

Automated checks already flagged these (fix these issues at minimum):
${flaggedHints || '(none)'}

Review EVERY bullet in context. For each bullet that could be stronger — including ones the automated checks missed (vague claims, no outcome, redundant with another bullet, buried lede) — return its id, 1-3 short issue notes, and ONE rewritten version that fixes them.

Rewrite rules:
- Start with a strong, varied action verb; lead with the outcome where possible.
- NEVER invent numbers, employers, or facts. If a metric would strengthen the bullet but the original has none, use a bracketed placeholder the user fills in, e.g. "[X]%" or "[N] users".
- Keep each rewrite under 30 words, no first-person pronouns, truthful to the original meaning.
- Skip bullets that are already strong (do not return them).

Also review the SUMMARY the same way (issues + a rewrite under 80 words) if it can be stronger; skip if strong or empty.

Return ONLY this JSON object and nothing else:
{
  "bullets": [{"id": "j0.1", "issues": ["vague outcome"], "rewrite": "..."}, ...],
  "summary": {"issues": ["..."], "rewrite": "..."}
}
Omit "summary" if the summary is already strong or empty.`;

  try {
    const raw = await generateJsonContent(prompt, { tier: 'writing' });
    let parsed: AiCritique = {};
    try {
      parsed = JSON.parse(raw) as AiCritique;
    } catch {
      parsed = {};
    }
    return mergeAiCritique(base, resume, parsed);
  } catch (err) {
    // Model unavailable → the deterministic report still ships.
    console.error('AI writing critique failed (falling back to local):', err);
    return base;
  }
}
