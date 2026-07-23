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

// Boundary the model prints between its natural-language reply and the machine
// edit payload. The streaming route shows everything BEFORE it as live text and
// buffers everything after it as JSON.
export const CHAT_EDIT_SENTINEL = '@@@EDIT@@@';

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

// Machine payload after the sentinel. `updatedResume` is loose here; the real
// safety comes from mergeResume(), which validates each section strictly.
const editPayloadSchema = z.object({
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

Respond in EXACTLY this format and nothing else:
1. A short, friendly reply (1-3 sentences). If you edited the resume, briefly
   say what you changed. This is shown to the user as plain text.
2. Then a line containing only: ${CHAT_EDIT_SENTINEL}
3. Then a single minified JSON object:
   {"changes":["one short bullet per concrete change"],"updatedResume":{ full resume with your edits } or null}

If you made no edits (e.g. the user only asked a question), still output your
reply, then ${CHAT_EDIT_SENTINEL}, then {"changes":[],"updatedResume":null}.

The updatedResume shape (when not null):
{"personal_details":{"resume_job_title":"","fname":"","lname":"","email":"","phone":"","country":"","city":"","summary":"","linkedin":"","github":"","website":""},"jobs":[{"id":0,"jobTitle":"","employer":"","description":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","city":""}],"educations":[{"id":0,"school":"","degree":"","field":"","description":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","city":""}],"projects":[{"name":"","description":"","link":""}],"skills":[{"skill_name":"","proficiency_level":""}],"tools":[{"tool_name":"","proficiency_level":""}],"languages":[{"lang_name":"","proficiency_level":""}]}

Example:
I've tightened your summary and added a few ATS keywords for this role.
${CHAT_EDIT_SENTINEL}
{"changes":["Rewrote professional summary","Added 3 skills"],"updatedResume":{ ... }}
`;
}

// Splits the full model output into the reply text and the merged edit result.
// Runs the conservative merge so structured work history can't be corrupted.
export function finalizeChatEdit(
  fullText: string,
  currentResume: TResumeEditFormValues
): ChatEditResult {
  const sentinelIndex = fullText.indexOf(CHAT_EDIT_SENTINEL);

  if (sentinelIndex === -1) {
    return {
      reply: fullText.trim() || DEFAULT_REPLY,
      changes: [],
      updatedResume: null
    };
  }

  const reply = fullText.slice(0, sentinelIndex).trim() || DEFAULT_REPLY;
  const jsonPart = fullText
    .slice(sentinelIndex + CHAT_EDIT_SENTINEL.length)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: z.SafeParseReturnType<unknown, z.infer<typeof editPayloadSchema>>;
  try {
    parsed = editPayloadSchema.safeParse(JSON.parse(jsonPart));
  } catch {
    return { reply, changes: [], updatedResume: null };
  }

  if (!parsed.success || !parsed.data.updatedResume) {
    return {
      reply,
      changes: parsed.success ? parsed.data.changes : [],
      updatedResume: null
    };
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
