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

// ATS keyword report (mirrors the ats-analysis service output).
export interface AtsReport {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  rationale?: string;
  suggestions: string[];
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
}
