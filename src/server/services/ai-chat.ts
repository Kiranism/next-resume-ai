import { z } from 'zod';
import {
  educationSchema,
  jobSchema,
  projectSchema,
  TResumeEditFormValues
} from '@/features/resume/utils/form-schema';
import type {
  ChatEditResult,
  ChatMessage
} from '@/features/resume/utils/chat-types';
import { ATS_WRITING_GUIDELINES } from './resume-guidance';

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
  updatedResume: z.record(z.string(), z.any()).nullable().catch(null)
});

type PersonalDetails = NonNullable<TResumeEditFormValues['personal_details']>;

// Conservative section-level merge. The model returns a full resume; we only let
// a section overwrite the current one when it is safe:
//  - personal_details: overlay provided string fields (can't blank existing).
//  - skills/tools/languages: replace whenever the model returns an array.
//  - jobs/educations: replace ONLY if EVERY item passes strict validation, so
//    chat can never corrupt structured, date-bearing work history.
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
    merged.skills = z.array(skillItem).catch([]).parse(ai.skills);
  }
  if (Array.isArray(ai.tools)) {
    merged.tools = z.array(toolItem).catch([]).parse(ai.tools);
  }
  if (Array.isArray(ai.languages)) {
    merged.languages = z.array(languageItem).catch([]).parse(ai.languages);
  }

  if (Array.isArray(ai.jobs)) {
    const parsed = z.array(jobSchema).safeParse(ai.jobs);
    if (parsed.success) merged.jobs = parsed.data;
    else skipped.push('work experience');
  }
  if (Array.isArray(ai.educations)) {
    const parsed = z.array(educationSchema).safeParse(ai.educations);
    if (parsed.success) merged.educations = parsed.data;
    else skipped.push('education');
  }
  if (Array.isArray(ai.projects)) {
    const parsed = z.array(projectSchema).safeParse(ai.projects);
    if (parsed.success) merged.projects = parsed.data;
    else skipped.push('projects');
  }

  return { merged, skipped };
}

function resumeForPrompt(resume: TResumeEditFormValues) {
  return {
    personal_details: resume.personal_details ?? {},
    jobs: resume.jobs ?? [],
    educations: resume.educations ?? [],
    projects: resume.projects ?? [],
    skills: resume.skills ?? [],
    tools: resume.tools ?? [],
    languages: resume.languages ?? []
  };
}

export function buildChatPrompt(params: {
  messages: ChatMessage[];
  resume: TResumeEditFormValues;
  jobContext: { jobTitle: string; jobDescription: string };
}): string {
  const { messages, resume, jobContext } = params;

  const history = messages
    .slice(-MAX_HISTORY)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  return `
You are an expert resume assistant embedded in a resume builder. The user is
tailoring their resume to a target job and talks to you to edit it. You can
rewrite and improve any section to make the resume ATS-friendly, and you answer
resume questions conversationally. Use the conversation so far as context.

Target job (for ATS relevance):
Job Title: ${jobContext.jobTitle || 'Not specified'}
Job Description: ${jobContext.jobDescription || 'Not specified'}

${ATS_WRITING_GUIDELINES}

Current resume (JSON — this is the single source of truth to edit):
${JSON.stringify(resumeForPrompt(resume))}

Conversation so far:
${history || '(no previous messages)'}

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
{"reply":"a short friendly 1-3 sentence reply — what you changed, or an answer to the user's question","changes":["one short bullet per concrete change"],"updatedResume": the sections you changed OR null}

Field rules:
- "reply": always present; shown to the user as plain text.
- "updatedResume": include ONLY the sections you actually changed — omit every
  section you did NOT touch (they are preserved automatically). Use null when you
  made no edits (e.g. the user only asked a question).
- When you change any part of a section, return that whole section (e.g. to edit
  one project, return the full "projects" array with every project).

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

  if (!parsed.data.updatedResume) {
    return { reply, changes: parsed.data.changes, updatedResume: null };
  }

  const { merged, skipped } = mergeResume(
    currentResume,
    parsed.data.updatedResume
  );
  const changes = [...parsed.data.changes];
  if (skipped.length > 0) {
    changes.push(
      `Skipped ${skipped.join(' and ')} edits (kept your existing entries to avoid data loss).`
    );
  }

  return { reply, changes, updatedResume: merged };
}
