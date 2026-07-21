import type { TResumeEditFormValues } from '../utils/form-schema';

interface DonePayload {
  reply: string;
  changes: string[];
  updatedResume: TResumeEditFormValues | null;
}

interface StreamHandlers {
  onText: (chunk: string) => void;
  onReplyComplete: () => void;
  onDone: (payload: DonePayload) => void;
  onError: (message: string) => void;
}

// POSTs to the streaming chat endpoint and dispatches NDJSON events
// (`text` / `done` / `error`) to the handlers as they arrive. The server owns
// the conversation history, so only the new user message is sent up.
export async function streamChatEdit(
  body: {
    resumeId: string;
    message: string;
    resume: TResumeEditFormValues;
  },
  handlers: StreamHandlers
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    handlers.onError('Network error. Please try again.');
    return;
  }

  if (!response.ok || !response.body) {
    handlers.onError('Something went wrong. Please try again.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: {
      type: string;
      value?: string;
      message?: string;
    } & Partial<DonePayload>;
    try {
      event = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (event.type === 'text') {
      handlers.onText(event.value ?? '');
    } else if (event.type === 'reply-complete') {
      handlers.onReplyComplete();
    } else if (event.type === 'done') {
      handlers.onDone({
        reply: event.reply ?? '',
        changes: event.changes ?? [],
        updatedResume: event.updatedResume ?? null
      });
    } else if (event.type === 'error') {
      handlers.onError(event.message ?? 'Something went wrong.');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }
  }

  // Flush any trailing line without a newline terminator.
  if (buffer.trim()) handleLine(buffer);
}
