import { NextRequest } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/server/db';
import { resumes, resumeChatMessages } from '@/server/db/schema';
import {
  buildChatPrompt,
  finalizeChatEdit,
  CHAT_EDIT_SENTINEL
} from '@/server/services/ai-chat';
import { streamChatCompletion } from '@/server/services/ai-model';
import { TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import type { ChatMessage, ChatRole } from '@/features/resume/utils/chat-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatStreamBody {
  resumeId: string;
  message: string;
  resume: TResumeEditFormValues;
}

function jsonLine(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + '\n');
}

// Best-effort message persistence with a small retry. A transient DB blip
// (e.g. a dropped Neon TLS socket during a long stream — ECONNRESET) must never
// break the chat: the reply and edits already reached the client, so history is
// secondary. Never throws.
async function persistMessage(
  values: typeof resumeChatMessages.$inferInsert
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.insert(resumeChatMessages).values(values);
      return;
    } catch (error) {
      if (attempt === 2) {
        console.error('Failed to persist chat message:', error);
        return;
      }
      // Brief backoff so the pool can hand out a fresh connection.
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}

export async function POST(req: NextRequest) {
  // Auth: identity from the verified Clerk session → the app account row.
  const auth = await currentUser();
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }
  const account = await db.query.accounts.findFirst({
    where: (accounts, { eq }) => eq(accounts.externalId, auth.id)
  });
  if (!account) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: ChatStreamBody;
  try {
    body = (await req.json()) as ChatStreamBody;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!body?.resumeId || !message) {
    return new Response('Bad request', { status: 400 });
  }

  // Ownership check + source of the target job description for ATS context.
  const resume = await db.query.resumes.findFirst({
    where: and(eq(resumes.id, body.resumeId), eq(resumes.userId, account.id))
  });
  if (!resume) {
    return new Response('Not found', { status: 404 });
  }

  // Server-owned history: load the saved thread for context (not client-sent).
  const priorRows = await db.query.resumeChatMessages.findMany({
    where: and(
      eq(resumeChatMessages.resumeId, body.resumeId),
      eq(resumeChatMessages.userId, account.id)
    ),
    orderBy: [asc(resumeChatMessages.createdAt)]
  });
  const priorTurns: ChatMessage[] = priorRows.map((row) => ({
    role: row.role as ChatRole,
    content: row.content
  }));

  const currentResume = body.resume ?? {};
  const prompt = buildChatPrompt({
    messages: [...priorTurns, { role: 'user', content: message }],
    resume: currentResume,
    jobContext: {
      jobTitle: resume.jdJobTitle,
      jobDescription: resume.jdPostDetails
    }
  });

  // Persist the user turn up front so it is never lost if the stream fails.
  await persistMessage({
    id: nanoid(),
    resumeId: body.resumeId,
    userId: account.id,
    role: 'user',
    content: message
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = '';
      let emitted = 0; // chars of `full` already sent as `text`
      let sentinelIndex = -1;
      let replyComplete = false;

      try {
        await streamChatCompletion(prompt, (delta) => {
          full += delta;

          if (sentinelIndex === -1) {
            const found = full.indexOf(CHAT_EDIT_SENTINEL);
            if (found !== -1) sentinelIndex = found;
          }

          // Emit only text before the sentinel; hold back a sentinel's worth of
          // chars so a boundary split across deltas never leaks as visible text.
          const safeEnd =
            sentinelIndex !== -1
              ? sentinelIndex
              : Math.max(0, full.length - CHAT_EDIT_SENTINEL.length);

          if (safeEnd > emitted) {
            const chunk = full.slice(emitted, safeEnd);
            emitted = safeEnd;
            controller.enqueue(jsonLine({ type: 'text', value: chunk }));
          }

          // Reply text is done; the (larger) edit JSON is still generating —
          // tell the client so it can show an "applying changes" indicator.
          if (sentinelIndex !== -1 && !replyComplete) {
            replyComplete = true;
            controller.enqueue(jsonLine({ type: 'reply-complete' }));
          }
        });

        const result = finalizeChatEdit(full, currentResume);

        // Send the result to the client FIRST (the important part), then persist
        // the turn best-effort — a DB blip must not turn a good reply into an error.
        controller.enqueue(
          jsonLine({
            type: 'done',
            reply: result.reply,
            changes: result.changes,
            updatedResume: result.updatedResume
          })
        );

        await persistMessage({
          id: nanoid(),
          resumeId: body.resumeId,
          userId: account.id,
          role: 'assistant',
          content: result.reply,
          changes: result.changes
        });
      } catch (error) {
        console.error('Chat stream failed:', error);
        controller.enqueue(
          jsonLine({
            type: 'error',
            message:
              'I ran into a problem editing your resume. Please try again.'
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
