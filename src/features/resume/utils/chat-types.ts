import { TResumeEditFormValues } from './form-schema';

export type ChatRole = 'user' | 'assistant';

// Wire shape sent to / used by the AI (role + content only).
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// Server response from the chat-edit endpoint.
export interface ChatEditResult {
  reply: string;
  changes: string[];
  // Full resume with the model's edits merged in; null for a plain reply.
  updatedResume: TResumeEditFormValues | null;
}

// A specific resume item the chat is scoped to. `index` is set for array
// sections (jobs/educations/projects); omitted for summary/skills/tools/
// languages. `key` is a stable-ish identity snapshot used to re-resolve the
// index at send time in case the user reordered/deleted items after picking.
export interface ChatFocus {
  section:
    | 'summary'
    | 'jobs'
    | 'educations'
    | 'projects'
    | 'skills'
    | 'tools'
    | 'languages';
  index?: number;
  label: string; // e.g. "Project · Open Source Collaboration Tool"
  key?: string; // identity for re-resolution
}

// One dimension of the blended ATS score (keyword match, quantification, …).
export interface AtsDimension {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number; // fraction of the overall score
  detail?: string;
}

// A JD keyword as shipped to the client — enough to re-run the deterministic
// matcher locally (verify-after-apply).
export interface AtsKeyword {
  term: string;
  importance: 'required' | 'preferred';
  aliases?: string[];
}

// ATS report (mirrors the ats-analysis service output). `score` is the blended
// multi-dimension score; `breakdown` holds the per-dimension sub-scores.
export interface AtsReport {
  score: number;
  keywordScore?: number;
  breakdown?: AtsDimension[];
  matchedKeywords: string[];
  missingKeywords: string[];
  // Missing keywords split by importance (optional — older reports may omit them).
  missingRequired?: string[];
  missingPreferred?: string[];
  rationale?: string;
  suggestions: string[];
  // Full keyword list (with aliases) for client-side verification.
  keywords?: AtsKeyword[];
}

// Result of the instant local keyword check after an ATS-triggered edit was
// applied: did the edit actually land the terms, as the matcher sees them?
export interface AtsVerifyResult {
  nowMatching: string[]; // were missing, now literally match
  stillMissing: string[]; // were missing, still don't match
  lost: string[]; // matched before the edit, no longer match
}

// A message as rendered in the UI: adds an id, the applied-change summary, and
// the pre-edit snapshot used to power per-turn Undo.
export interface ChatUiMessage {
  id: string;
  role: ChatRole;
  content: string;
  changes?: string[];
  // Snapshot of form values BEFORE this assistant turn applied its edits.
  undoSnapshot?: TResumeEditFormValues;
  undone?: boolean;
  error?: boolean;
  // True while this assistant message is still receiving streamed tokens.
  streaming?: boolean;
  // True after the reply text finishes but while the edit is still generating.
  applyingEdit?: boolean;
  // ATS score result rendered inline; atsLoading while it is being fetched.
  atsReport?: AtsReport;
  atsLoading?: boolean;
  // Score from the previous ATS analysis in this thread → drives a Δ indicator
  // so the user can see the score climbing as they apply improvements.
  atsPrevScore?: number;
  // Local keyword check attached after an ATS-triggered edit applied.
  atsVerify?: AtsVerifyResult;
}
