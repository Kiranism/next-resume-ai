import { z } from 'zod';
import { TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import type {
  ChatEditResult,
  ChatFocus,
  ChatMessage
} from '@/features/resume/utils/chat-types';
import { ATS_WRITING_GUIDELINES } from './resume-guidance';
import { RESUME_WRITING_GUIDANCE } from './resume-skills';

const DEFAULT_REPLY = 'Done — let me know if you want anything else.';

// Keep the last N turns so the prompt stays bounded on long conversations.
const MAX_HISTORY = 12;

// Lenient item schemas (mirrors ai-resume.ts): accept a plain string OR an
// object and normalize; never throw. Used for skills/tools/languages so a
// malformed list from the model degrades gracefully instead of crashing.
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

// The model's single-JSON response. `updatedResume` is loose here; the real
// safety comes from mergeResume(), which validates each section strictly.
const chatResponseSchema = z.object({
  reply: z.string().catch(''),
  changes: z.array(z.string()).catch([]),
  updatedResume: z.record(z.string(), z.any()).nullable().catch(null),
  // Explicit deletions, keyed by section → the item(s) to remove (by identity).
  // The ONLY channel that deletes data — omission never does (see
  // mergeArrayById) — so an accidental drop can't destroy a list.
  remove: z.record(z.string(), z.array(z.any())).nullable().catch(null),
  // Section visibility — arrays of section names to hide from / show on the
  // rendered resume (mirrors the form's eye toggle → hiddenSections).
  hide: z.array(z.string()).nullable().catch(null),
  show: z.array(z.string()).nullable().catch(null)
});

type PersonalDetails = NonNullable<TResumeEditFormValues['personal_details']>;

// Identity key for matching an incoming (edited/added) item to an existing one.
// Case-insensitive + trimmed so an edit that keeps the identifying field(s) but
// changes other fields still matches its original. An empty key means "no stable
// identity" → the item is treated as new (appended), never overwriting anything.
function itemKey(section: string, item: Record<string, unknown>): string {
  const s = (v: unknown) =>
    String(v ?? '')
      .trim()
      .toLowerCase();
  switch (section) {
    // Text-only identity (no dates): the model reliably echoes employer/title
    // but often reformats or omits dates, which would break the match.
    case 'jobs':
      return `${s(item.employer)}|${s(item.jobTitle)}`;
    case 'educations':
      return `${s(item.school)}|${s(item.degree)}`;
    case 'projects':
      return s(item.name);
    case 'skills':
      return s(item.skill_name);
    case 'tools':
      return s(item.tool_name);
    case 'languages':
      return s(item.lang_name);
    default:
      return '';
  }
}

// Upsert the model's returned items into the current list WITHOUT dropping items
// it didn't return (the data-loss fix). Two behaviours make edits robust:
//  - Matched items are FIELD-merged: a partial edit (the model returns an item's
//    identity + only its new description) keeps the fields it didn't mention,
//    instead of being rejected for looking incomplete.
//  - `coerce` validates/normalizes each resulting item; returning null skips
//    just THAT item (never the whole section), preserving the current entry.
// Result length is always >= current, so a chat edit can never silently delete.
function mergeArrayById<T>(
  current: T[],
  incoming: unknown[],
  section: string,
  coerce: (item: unknown) => T | null
): { result: T[]; skipped: boolean } {
  const keyOf = (item: unknown) =>
    itemKey(section, item as Record<string, unknown>);
  const result: T[] = [...current];
  const indexByKey = new Map<string, number>();
  result.forEach((item, i) => {
    const k = keyOf(item);
    if (k && !indexByKey.has(k)) indexByKey.set(k, i);
  });
  let skipped = false;
  for (const raw of incoming) {
    const k = keyOf(raw);
    const at = k ? indexByKey.get(k) : undefined;
    if (at !== undefined) {
      // Edit of an existing entry → field-merge the changed fields onto it.
      const next = coerce({
        ...(result[at] as Record<string, unknown>),
        ...(raw as Record<string, unknown>)
      });
      if (next !== null) result[at] = next;
      else skipped = true;
    } else {
      // Genuinely new entry → validate then append.
      const next = coerce(raw);
      if (next !== null) {
        result.push(next);
        if (k) indexByKey.set(k, result.length - 1);
      } else {
        skipped = true;
      }
    }
  }
  return { result, skipped };
}

// Accept an AI-returned structured item as long as it carries an identifying
// value (so {} junk is dropped), passing it through as-is otherwise. This mirrors
// the form — an incomplete entry is allowed and can be finished later — so a
// legitimate edit/addition is no longer rejected by strict validation (which
// surfaced as "kept your existing entries to avoid data loss"). Sibling safety
// still holds: mergeArrayById only replaces the matched item / appends new ones.
function lenientEntry<T>(raw: unknown, identityFields: string[]): T | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const hasIdentity = identityFields.some((f) => {
    const v = o[f];
    return typeof v === 'string' && v.trim() !== '';
  });
  return hasIdentity ? (o as unknown as T) : null;
}

// Section-level merge. The model returns only the sections it changed, and within
// a list section only the ITEMS it changed/added — so we upsert by identity
// (mergeArrayById) instead of blindly replacing the array. This prevents the
// data-loss bug where editing one project/job wiped out the others just because
// the model didn't echo them back.
//  - personal_details: overlay provided string fields (can't blank existing).
//  - all list sections: upsert by identity — matched items are field-merged,
//    new items appended, omitted items preserved. Items are accepted leniently
//    (lenientEntry / the *Item schemas); only identity-less junk is dropped.
function mergeResume(
  current: TResumeEditFormValues,
  ai: Record<string, unknown>
): { merged: TResumeEditFormValues; skipped: string[] } {
  const skipped: string[] = [];
  const merged: TResumeEditFormValues = { ...current };

  const aiPd = ai.personal_details;
  if (aiPd && typeof aiPd === 'object') {
    const next: PersonalDetails = { ...(current.personal_details ?? {}) };
    for (const [key, value] of Object.entries(
      aiPd as Record<string, unknown>
    )) {
      if (typeof value === 'string' && value.trim() !== '') {
        (next as Record<string, unknown>)[key] = value;
      }
    }
    merged.personal_details = next;
  }

  if (Array.isArray(ai.skills)) {
    merged.skills = mergeArrayById(
      current.skills ?? [],
      ai.skills,
      'skills',
      (i) => skillItem.parse(i)
    ).result;
  }
  if (Array.isArray(ai.tools)) {
    merged.tools = mergeArrayById(current.tools ?? [], ai.tools, 'tools', (i) =>
      toolItem.parse(i)
    ).result;
  }
  if (Array.isArray(ai.languages)) {
    merged.languages = mergeArrayById(
      current.languages ?? [],
      ai.languages,
      'languages',
      (i) => languageItem.parse(i)
    ).result;
  }

  if (Array.isArray(ai.jobs)) {
    const r = mergeArrayById(current.jobs ?? [], ai.jobs, 'jobs', (i) =>
      lenientEntry(i, ['employer', 'jobTitle'])
    );
    merged.jobs = r.result;
    if (r.skipped) skipped.push('work experience');
  }
  if (Array.isArray(ai.educations)) {
    const r = mergeArrayById(
      current.educations ?? [],
      ai.educations,
      'educations',
      (i) => lenientEntry(i, ['school', 'degree'])
    );
    merged.educations = r.result;
    if (r.skipped) skipped.push('education');
  }
  if (Array.isArray(ai.projects)) {
    const r = mergeArrayById(
      current.projects ?? [],
      ai.projects,
      'projects',
      (i) => lenientEntry(i, ['name'])
    );
    merged.projects = r.result;
    if (r.skipped) skipped.push('projects');
  }

  return { merged, skipped };
}

const LIST_SECTIONS = [
  'jobs',
  'educations',
  'projects',
  'skills',
  'tools',
  'languages'
] as const;

// Apply the model's EXPLICIT deletions. Each remove[section] entry identifies an
// item — an object with its identifying field(s), or a bare string for the
// single-key sections (projects/skills/tools/languages) — and matching items are
// filtered out of the merged section. This is the ONLY path that removes data
// (merges never shrink a list), so an accidental omission can't delete anything.
// Returns the sections it actually removed from.
function applyRemovals(
  merged: TResumeEditFormValues,
  remove: Record<string, unknown> | null | undefined
): string[] {
  if (!remove) return [];
  const m = merged as unknown as Record<string, unknown>;
  const removedFrom: string[] = [];

  // Clearing personal details: remove.personal_details is an array of FIELD
  // names to blank (e.g. ["linkedin"]) — the only way chat clears a field the
  // edit-overlay otherwise refuses to empty.
  const pdFields = remove.personal_details;
  if (Array.isArray(pdFields) && pdFields.length > 0) {
    const details: Record<string, unknown> = {
      ...(merged.personal_details ?? {})
    };
    let cleared = false;
    for (const field of pdFields) {
      const f = String(field).trim();
      if (f && f in details) {
        details[f] = '';
        cleared = true;
      }
    }
    if (cleared) {
      merged.personal_details =
        details as TResumeEditFormValues['personal_details'];
      removedFrom.push('personal_details');
    }
  }

  for (const section of LIST_SECTIONS) {
    const entries = remove[section];
    const arr = m[section];
    if (
      !Array.isArray(entries) ||
      entries.length === 0 ||
      !Array.isArray(arr)
    ) {
      continue;
    }
    const removeKeys = new Set(
      entries
        .map((e) =>
          typeof e === 'string'
            ? e.trim().toLowerCase()
            : itemKey(section, e as Record<string, unknown>)
        )
        .filter((k) => k !== '')
    );
    if (removeKeys.size === 0) continue;
    const kept = arr.filter(
      (item) =>
        !removeKeys.has(itemKey(section, item as Record<string, unknown>))
    );
    if (kept.length !== arr.length) {
      m[section] = kept;
      removedFrom.push(section);
    }
  }
  return removedFrom;
}

// Canonical hiddenSections keys (the form uses "experience" for the jobs
// section, "summary" for the summary, etc.).
const VISIBILITY_KEYS = [
  'summary',
  'experience',
  'education',
  'projects',
  'skills',
  'tools',
  'languages'
];

// Map a section name the model might use onto the canonical hiddenSections key.
function normalizeSectionKey(raw: unknown): string | null {
  const k = String(raw ?? '')
    .trim()
    .toLowerCase();
  const alias: Record<string, string> = {
    jobs: 'experience',
    work: 'experience',
    'work experience': 'experience',
    'professional summary': 'summary',
    educations: 'education',
    project: 'projects',
    skill: 'skills',
    tool: 'tools',
    language: 'languages'
  };
  const key = alias[k] ?? k;
  return VISIBILITY_KEYS.includes(key) ? key : null;
}

// Hide/show sections by editing hiddenSections (the same array the form's eye
// toggle writes). Additive + explicit: only the named sections move.
function applyVisibility(
  merged: TResumeEditFormValues,
  hide: unknown,
  show: unknown
): boolean {
  const hideArr = Array.isArray(hide) ? hide : [];
  const showArr = Array.isArray(show) ? show : [];
  if (hideArr.length === 0 && showArr.length === 0) return false;
  const hidden = new Set(merged.hiddenSections ?? []);
  for (const raw of hideArr) {
    const key = normalizeSectionKey(raw);
    if (key) hidden.add(key);
  }
  for (const raw of showArr) {
    const key = normalizeSectionKey(raw);
    if (key) hidden.delete(key);
  }
  merged.hiddenSections = [...hidden];
  return true;
}

function resumeForPrompt(resume: TResumeEditFormValues) {
  return {
    personal_details: resume.personal_details ?? {},
    jobs: resume.jobs ?? [],
    educations: resume.educations ?? [],
    projects: resume.projects ?? [],
    skills: resume.skills ?? [],
    tools: resume.tools ?? [],
    languages: resume.languages ?? [],
    hiddenSections: resume.hiddenSections ?? []
  };
}

// One line describing a single focused item for the FOCUS block. Returns '' for
// an out-of-range index (the item was deleted client-side before send).
function describeFocus(
  resume: TResumeEditFormValues,
  focus: ChatFocus
): string {
  if (
    typeof focus.index === 'number' &&
    (focus.section === 'jobs' ||
      focus.section === 'educations' ||
      focus.section === 'projects')
  ) {
    const arr = resume[focus.section];
    if (!Array.isArray(arr) || focus.index < 0 || focus.index >= arr.length) {
      return '';
    }
    return `- ${focus.section} (item #${focus.index}): ${JSON.stringify(arr[focus.index])}`;
  }

  if (focus.section === 'summary') {
    return `- summary: ${JSON.stringify(resume.personal_details?.summary ?? '')}`;
  }

  // skills / tools / languages — whole-list sections (no per-item index).
  return `- ${focus.section} list: ${JSON.stringify(resume[focus.section] ?? [])}`;
}

// FOCUS prompt block: when the user scoped the chat to specific item(s) via the
// "@" picker, tell the model to edit ONLY those and echo just the changed
// item(s) back. Sibling safety no longer depends on this — mergeArrayById
// preserves any item the model omits regardless — so this purely removes the
// "which item did they mean?" guess. Returns '' when there is no focus.
function buildFocusBlock(
  resume: TResumeEditFormValues,
  focuses: ChatFocus[] | null | undefined
): string {
  if (!focuses || focuses.length === 0) return '';
  const lines = focuses
    .map((focus) => describeFocus(resume, focus))
    .filter((line) => line !== '');
  if (lines.length === 0) return '';
  return `
FOCUS — the user is targeting ONLY these part(s) of the resume. Apply their
request ONLY to the item(s) listed here and nothing else; for each, return only
the changed item(s) per the list-section rule below.
${lines.join('\n')}
`;
}

export function buildChatPrompt(params: {
  messages: ChatMessage[];
  resume: TResumeEditFormValues;
  jobContext: { jobTitle: string; jobDescription: string };
  focus?: ChatFocus[] | null;
}): string {
  const { messages, resume, jobContext, focus } = params;

  const history = messages
    .slice(-MAX_HISTORY)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const focusBlock = buildFocusBlock(resume, focus);

  return `
You are an expert resume assistant embedded in a resume builder. The user is
tailoring their resume to a target job and talks to you to edit it. You can
rewrite and improve any section to make the resume ATS-friendly, and you answer
resume questions conversationally. Use the conversation so far as context.

Target job (for ATS relevance):
Job Title: ${jobContext.jobTitle || 'Not specified'}
Job Description: ${jobContext.jobDescription || 'Not specified'}

${RESUME_WRITING_GUIDANCE}

${ATS_WRITING_GUIDELINES}

Current resume (JSON — this is the single source of truth to edit):
${JSON.stringify(resumeForPrompt(resume))}

Conversation so far:
${history || '(no previous messages)'}
${focusBlock}
Rules:
- Only make the changes the user asked for. If they ask a broad request like
  "make it ATS friendly", improve the summary, skills, tools, and experience
  bullets per the guidelines above — do not touch fields they didn't imply.
- Preserve every field you are NOT changing exactly as-is.
- Keep all dates in YYYY-MM-DD format. Never invent jobs, education, employers,
  or dates the user did not provide.
- Experience bullets go in jobs[].description and educations[].description.
- Projects go in projects[] as { name, description, link } — only if the user
  mentions them; never invent projects.
- Format jobs[].description, educations[].description, projects[].description,
  and personal_details.summary using ONLY this minimal markup: put each
  achievement on its own line prefixed with "- " to make a bullet; wrap the
  single most important metric/number in each bullet in **double asterisks**
  for bold (e.g. "- Increased signups by **32%** ..."). Do not use any other
  markdown (no headings, italics, links).
- Write proficiency_level values as one of: Beginner, Intermediate, Advanced,
  Expert (skills/tools) or Basic, Conversational, Fluent, Native (languages).

Respond with a SINGLE valid JSON object and NOTHING else — no markdown, no code
fences, no text before or after:
{"reply":"a short friendly 1-3 sentence reply — what you changed, or an answer to the user's question","changes":["one short bullet per concrete change"],"updatedResume": the sections you changed OR null,"remove": items to delete OR null,"hide": section names to hide OR null,"show": section names to reveal OR null}

Field rules:
- "reply": always present; shown to the user as plain text.
- "updatedResume": include ONLY the sections you actually changed — omit every
  section you did NOT touch (they are preserved automatically). Use null when you
  made no edits (e.g. the user only asked a question).
- For list sections (jobs, educations, projects, skills, tools, languages),
  return ONLY the items you ADDED or CHANGED — never resend the whole list. Items
  you leave out are preserved automatically. Keep each changed item's identifying
  field(s) EXACTLY unchanged so it matches the existing entry: projects by
  "name"; jobs by "employer" + "jobTitle"; educations by "school" + "degree";
  skills by "skill_name"; tools by "tool_name"; languages by "lang_name". Give a
  brand-new item a new identifying value.
- "remove": ONLY when the user EXPLICITLY asks to delete/remove item(s). It is an
  object keyed by section name, each value an array of the item(s) to delete,
  identified by the SAME identifying field(s) as above — e.g.
  {"projects":[{"name":"Old Project"}],"skills":[{"skill_name":"jQuery"}],
  "jobs":[{"employer":"Acme","jobTitle":"Intern"}]}.
  Deletion happens ONLY through "remove" — leaving an item out of "updatedResume"
  never deletes it. Never remove anything the user did not clearly ask to remove.
  Use null when deleting nothing.
- To CLEAR a personal detail (e.g. "remove my LinkedIn"), list its field name(s)
  under remove.personal_details — e.g. {"personal_details":["linkedin","website"]}.
  (Editing a field to a new value still goes in updatedResume.personal_details.)
- "hide" / "show": ONLY when the user asks to hide or reveal a whole section. Each
  is an array of section names drawn from exactly: "summary", "experience" (the
  work-experience section), "education", "projects", "skills", "tools",
  "languages". e.g. hide:["education"] removes Education from the rendered resume;
  show:["projects"] brings it back. Use null for each when not changing visibility.

Section shapes for updatedResume (include only the ones you changed):
{"personal_details":{"resume_job_title":"","fname":"","lname":"","email":"","phone":"","country":"","city":"","summary":"","linkedin":"","github":"","website":""},"jobs":[{"id":0,"jobTitle":"","employer":"","description":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","city":""}],"educations":[{"id":0,"school":"","degree":"","field":"","description":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","city":""}],"projects":[{"name":"","description":"","link":""}],"skills":[{"skill_name":"","proficiency_level":""}],"tools":[{"tool_name":"","proficiency_level":""}],"languages":[{"lang_name":"","proficiency_level":""}]}

Example (user asked to improve their projects):
{"reply":"I expanded your projects with impact-focused bullets and bolded the key metrics.","changes":["Rewrote 2 project descriptions","Bolded key metrics"],"updatedResume":{"projects":[{"name":"Chat SDK","description":"- Built a realtime chat SDK adopted by **12k+** developers.\\n- Cut reconnect latency by **60%**.","link":"github.com/x/chat"}]}}
`;
}

// LLMs frequently emit RAW newlines/tabs inside JSON string values — e.g. the
// multi-line "- " bullet descriptions this prompt now asks for — which is
// invalid JSON and makes JSON.parse throw. Escape control chars that occur
// INSIDE a string literal so the payload still parses. Already-escaped
// sequences (a literal backslash-n, two chars) are left untouched.
function escapeRawControlCharsInStrings(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
    }
    out += ch;
  }
  return out;
}

// Parse the model's edit JSON, tolerating raw control chars inside strings.
function parseEditJson(jsonPart: string): unknown {
  try {
    return JSON.parse(jsonPart);
  } catch {
    try {
      return JSON.parse(escapeRawControlCharsInStrings(jsonPart));
    } catch {
      return undefined;
    }
  }
}

// Parse the model's single-JSON response into the reply and the merged edit.
// The response comes back from json_object mode so it is valid JSON;
// parseEditJson's repair stays as a belt-and-suspenders fallback. mergeResume
// keeps structured work history safe.
export function parseChatEdit(
  rawResponse: string,
  currentResume: TResumeEditFormValues
): ChatEditResult {
  const jsonPart = rawResponse
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const data = parseEditJson(jsonPart);
  if (data === undefined) {
    console.warn(
      '[chat] response JSON failed to parse; no changes applied. Tail:',
      jsonPart.slice(0, 300)
    );
    return { reply: DEFAULT_REPLY, changes: [], updatedResume: null };
  }

  const parsed = chatResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(
      '[chat] response failed schema validation; no changes applied.'
    );
    return { reply: DEFAULT_REPLY, changes: [], updatedResume: null };
  }

  const reply = parsed.data.reply.trim() || DEFAULT_REPLY;

  const hasEdit = !!parsed.data.updatedResume;
  const hasRemoval =
    !!parsed.data.remove && Object.keys(parsed.data.remove).length > 0;
  const hasVisibility =
    (Array.isArray(parsed.data.hide) && parsed.data.hide.length > 0) ||
    (Array.isArray(parsed.data.show) && parsed.data.show.length > 0);

  // No edit, deletion, or visibility change → plain reply, resume untouched.
  if (!hasEdit && !hasRemoval && !hasVisibility) {
    return { reply, changes: parsed.data.changes, updatedResume: null };
  }

  const { merged, skipped } = hasEdit
    ? mergeResume(
        currentResume,
        parsed.data.updatedResume as Record<string, unknown>
      )
    : { merged: { ...currentResume }, skipped: [] as string[] };

  applyRemovals(merged, parsed.data.remove);
  applyVisibility(merged, parsed.data.hide, parsed.data.show);

  const changes = [...parsed.data.changes];
  if (skipped.length > 0) {
    changes.push(
      `Skipped ${skipped.join(' and ')} edits (kept your existing entries to avoid data loss).`
    );
  }

  return { reply, changes, updatedResume: merged };
}
