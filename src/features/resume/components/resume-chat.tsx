'use client';

import { useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  IconArrowBackUp,
  IconArrowUp,
  IconChecklist,
  IconPencil,
  IconSparkles,
  IconTrash,
  IconX
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { client } from '@/lib/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent
} from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@/components/ui/message-scroller';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { type TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import {
  type AtsReport,
  type AtsVerifyResult,
  type ChatFocus,
  type ChatUiMessage
} from '@/features/resume/utils/chat-types';
import {
  matchedTermSet,
  normalizeResumeInput
} from '@/features/resume/utils/ats-match';
import { streamChatEdit } from '../api/chat-stream';
import { useClearResumeChat, useResumeChatMessages } from '../api';

interface ResumeChatProps {
  form: UseFormReturn<TResumeEditFormValues, any, undefined>;
  resumeId: string;
  // Persist immediately after an AI edit / undo (background auto-save lives in
  // the parent so manual edits and chat edits share one save path).
  saveNow: () => void;
}

const GREETING: ChatUiMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hi! I'm your resume assistant — I can do anything the editor can: add, rewrite, or delete experience, projects, and skills, hide or show sections, even clear a field. Try “add a project”, “delete my oldest job”, or “hide my education section”. Tip: type @ to point an edit at one specific item, or check your ATS score above."
};

const SUGGESTIONS = [
  'Make my resume ATS-friendly',
  'Rewrite my professional summary',
  'Hide my education section',
  'Suggest skills for this role'
];

function createId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `m-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  }
}

// Stable id for a focus option — dedupes/toggles selections and keys the chips.
const focusId = (f: ChatFocus) => `${f.section}:${f.index ?? 'all'}`;

// Identity snapshot for an array-section item, used to re-find it by content
// (not position) if the user reorders/edits the list after picking a focus.
function keyFor(
  section: ChatFocus['section'],
  item: {
    employer?: string;
    jobTitle?: string;
    school?: string;
    degree?: string;
    name?: string;
  }
): string | undefined {
  switch (section) {
    // Text-only keys, consistent with the server merge (itemKey) so focus
    // resolution and edit-matching identify an item the same way.
    case 'jobs':
      return `${item.employer ?? ''}|${item.jobTitle ?? ''}`;
    case 'educations':
      return `${item.school ?? ''}|${item.degree ?? ''}`;
    case 'projects':
      return `${item.name ?? ''}`;
    default:
      return undefined;
  }
}

function matchesKey(
  item:
    | {
        employer?: string;
        jobTitle?: string;
        school?: string;
        degree?: string;
        name?: string;
      }
    | undefined,
  focus: ChatFocus
): boolean {
  if (!item) return false;
  return keyFor(focus.section, item) === focus.key;
}

// Addressable resume items for the "@" mention picker. Only non-empty
// sections/arrays get an entry — see plan design decision #3.
function buildFocusOptions(values: TResumeEditFormValues): ChatFocus[] {
  const options: ChatFocus[] = [];

  if (values.personal_details?.summary) {
    options.push({ section: 'summary', label: 'Summary' });
  }

  (values.jobs ?? []).forEach((job, index) => {
    options.push({
      section: 'jobs',
      index,
      label: `Experience · ${job.employer || job.jobTitle || 'Untitled'}`,
      key: keyFor('jobs', job)
    });
  });

  (values.educations ?? []).forEach((education, index) => {
    options.push({
      section: 'educations',
      index,
      label: `Education · ${education.school || education.degree || 'Untitled'}`,
      key: keyFor('educations', education)
    });
  });

  (values.projects ?? []).forEach((project, index) => {
    options.push({
      section: 'projects',
      index,
      label: `Project · ${project.name || 'Untitled project'}`,
      key: keyFor('projects', project)
    });
  });

  if ((values.skills ?? []).length > 0) {
    options.push({ section: 'skills', label: 'Skills' });
  }
  if ((values.tools ?? []).length > 0) {
    options.push({ section: 'tools', label: 'Tools' });
  }
  if ((values.languages ?? []).length > 0) {
    options.push({ section: 'languages', label: 'Languages' });
  }

  return options;
}

// Drift guard: re-resolve the focused item's index against live form values
// at send time, since it may have moved (reorder) or been removed (delete)
// since the chip was set. Non-indexed focuses (summary/skills/tools/
// languages) have nothing to drift, so they pass through unchanged.
function resolveFocusForSend(
  currentFocus: ChatFocus | null,
  values: TResumeEditFormValues
): { resolved: ChatFocus | null; dropped: boolean } {
  if (!currentFocus) return { resolved: null, dropped: false };
  if (typeof currentFocus.index !== 'number') {
    return { resolved: currentFocus, dropped: false };
  }

  const section = currentFocus.section as 'jobs' | 'educations' | 'projects';
  const arr = values[section] ?? [];
  const current = arr[currentFocus.index];
  if (matchesKey(current, currentFocus)) {
    return { resolved: currentFocus, dropped: false };
  }

  const foundIndex = arr.findIndex((item) => matchesKey(item, currentFocus));
  if (foundIndex !== -1) {
    return { resolved: { ...currentFocus, index: foundIndex }, dropped: false };
  }

  return { resolved: null, dropped: true };
}

export function ResumeChat({ form, resumeId, saveNow }: ResumeChatProps) {
  const [messages, setMessages] = useState<ChatUiMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // Focus chips: the resume items the NEXT send is scoped to (multi-select).
  // Cleared right after they're used — context applies to one message, not the
  // whole thread, so a reply about "this project" can't leak into later turns.
  const [focuses, setFocuses] = useState<ChatFocus[]>([]);
  const toggleFocus = (option: ChatFocus, on: boolean) =>
    setFocuses((prev) => {
      const rest = prev.filter((f) => focusId(f) !== focusId(option));
      return on ? [...rest, option] : rest;
    });
  const [focusMenuOpen, setFocusMenuOpen] = useState(false);
  const [focusOptions, setFocusOptions] = useState<ChatFocus[]>([]);
  const seededRef = useRef(false);
  // Set by the ATS apply buttons: the report whose keywords the NEXT applied
  // edit should be verified against (locally, with the server's exact matcher).
  const pendingAtsReportRef = useRef<AtsReport | null>(null);

  const { data: chatData, isLoading: isLoadingHistory } =
    useResumeChatMessages(resumeId);
  const { mutate: clearChat, isPending: isClearing } = useClearResumeChat();

  // Hydrate the saved thread from the DB once (server-owned history). Undo
  // snapshots are session-only, so restored assistant turns show their change
  // summary but no Undo button.
  useEffect(() => {
    if (seededRef.current || !chatData || !('messages' in chatData)) return;
    seededRef.current = true;
    const saved = chatData.messages;
    if (Array.isArray(saved) && saved.length > 0) {
      setMessages(
        saved.map((row) => ({
          id: row.id,
          role: row.role as ChatUiMessage['role'],
          content: row.content,
          changes: row.changes ?? undefined
        }))
      );
    }
  }, [chatData]);

  const updateMessage = (id: string, patch: Partial<ChatUiMessage>) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );

  // Instant local check after an ATS-triggered edit: which of the report's
  // keywords does the updated resume literally match now? Runs the exact
  // matcher the server scores with, so a ✓ here is what the next analysis
  // will confirm.
  const verifyAtsEdit = (
    report: AtsReport,
    updated: TResumeEditFormValues
  ): AtsVerifyResult | undefined => {
    if (!report.keywords?.length) return undefined;
    const matchedNow = matchedTermSet(
      report.keywords,
      normalizeResumeInput({
        personalDetails: updated.personal_details,
        jobs: updated.jobs,
        educations: updated.educations,
        projects: updated.projects,
        skills: updated.skills,
        tools: updated.tools,
        languages: updated.languages,
        hiddenSections: updated.hiddenSections
      })
    );
    return {
      nowMatching: report.missingKeywords.filter((t) => matchedNow.has(t)),
      stillMissing: report.missingKeywords.filter((t) => !matchedNow.has(t)),
      lost: report.matchedKeywords.filter((t) => !matchedNow.has(t))
    };
  };

  const handleSend = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;

    setInput('');

    // Snapshot BEFORE applying edits so this turn's Undo can restore it.
    const snapshot = form.getValues();

    // Drift guard: re-resolve each focused item's index against live values in
    // case it moved or was deleted since its chip was set.
    const resolvedFocuses: ChatFocus[] = [];
    let droppedCount = 0;
    for (const f of focuses) {
      const { resolved, dropped } = resolveFocusForSend(f, snapshot);
      if (dropped) droppedCount++;
      else if (resolved) resolvedFocuses.push(resolved);
    }
    // Focus is single-use: this message consumes the chips, so they reset and
    // the next message starts unscoped unless the user picks again.
    setFocuses([]);

    const assistantId = createId();
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: 'user', content },
      ...(droppedCount > 0
        ? [
            {
              id: createId(),
              role: 'assistant' as const,
              content:
                resolvedFocuses.length > 0
                  ? 'Some items you selected no longer exist; I applied your request to the ones that remain.'
                  : 'The items you selected no longer exist, so I edited the whole resume instead.'
            }
          ]
        : []),
      { id: assistantId, role: 'assistant', content: '', streaming: true }
    ]);

    setBusy(true);

    // The server owns conversation history, so only the new message is sent.
    await streamChatEdit(
      {
        resumeId,
        message: content,
        resume: snapshot,
        focus: resolvedFocuses.length > 0 ? resolvedFocuses : null
      },
      {
        onText: (chunk) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          ),
        onReplyComplete: () =>
          updateMessage(assistantId, { applyingEdit: true }),
        onDone: ({ reply, changes, updatedResume }) => {
          // If this send came from an ATS apply button, verify the edit
          // against that report's keywords — instantly, with the same matcher
          // the server scores with.
          const pendingReport = pendingAtsReportRef.current;
          pendingAtsReportRef.current = null;
          const atsVerify =
            updatedResume && pendingReport
              ? verifyAtsEdit(pendingReport, updatedResume)
              : undefined;
          if (updatedResume) {
            form.reset(updatedResume);
            saveNow(); // persist the AI edit immediately (agentic auto-save)
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: reply || m.content,
                    changes,
                    atsVerify,
                    streaming: false,
                    applyingEdit: false,
                    undoSnapshot: updatedResume ? snapshot : undefined
                  }
                : m
            )
          );
        },
        onError: (message) => {
          pendingAtsReportRef.current = null;
          updateMessage(assistantId, {
            content: message,
            streaming: false,
            applyingEdit: false,
            error: true
          });
        }
      }
    );

    setBusy(false);
  };

  const handleAtsScore = async () => {
    const messageId = createId();
    // Remember the last score in this thread so we can show the improvement.
    const prevScore = [...messages].reverse().find((m) => m.atsReport)
      ?.atsReport?.score;
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: 'assistant', content: '', atsLoading: true }
    ]);

    try {
      // Analyze the CURRENT field values and recompute fresh every time.
      const response = await client.ats.analyzeCurrent.$post({
        resumeId,
        resume: form.getValues()
      });
      const data = await response.json();
      if (data && !('error' in data)) {
        const report = data as AtsReport;
        updateMessage(messageId, {
          atsLoading: false,
          atsReport: report,
          atsPrevScore: prevScore,
          content: `Your resume scores ${report.score}/100 for ATS readiness.`
        });
      } else {
        updateMessage(messageId, {
          atsLoading: false,
          error: true,
          content: 'Could not analyze your ATS score. Please try again.'
        });
      }
    } catch {
      updateMessage(messageId, {
        atsLoading: false,
        error: true,
        content: 'Could not analyze your ATS score. Please try again.'
      });
    }
  };

  const handleApplyAts = (report: AtsReport) => {
    pendingAtsReportRef.current = report;
    const parts: string[] = [];
    const required = report.missingRequired ?? [];
    const preferred = report.missingPreferred ?? [];
    const missing =
      required.length || preferred.length
        ? [...required, ...preferred]
        : report.missingKeywords;
    if (missing.length > 0) {
      const reqLine = required.length
        ? `PRIORITIZE these required keywords: ${required.join(', ')}. `
        : '';
      parts.push(
        `Add these keywords using the EXACT terms (verbatim, so an ATS matches them). ${reqLine}Put technologies/tools in my skills or tools lists where they fit my background, and weave the rest truthfully into my summary and experience bullets — never invent employers, roles, or dates. All keywords: ${missing.join(', ')}.`
      );
    }
    if (report.suggestions.length > 0) {
      parts.push(
        `Also apply these suggestions:\n- ${report.suggestions.join('\n- ')}`
      );
    }
    handleSend(`Improve my resume for ATS. ${parts.join(' ')}`.trim());
  };

  // One-click apply for a single ATS suggestion — a targeted edit through the
  // chat pipeline instead of the everything-at-once improve.
  const handleApplySuggestion = (suggestion: string, report: AtsReport) => {
    pendingAtsReportRef.current = report;
    handleSend(
      `Apply this ATS improvement as ONE targeted edit (keep everything else unchanged, never invent employers, roles, or dates): ${suggestion}`
    );
  };

  const handleUndo = (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target?.undoSnapshot) return;
    form.reset(target.undoSnapshot);
    saveNow(); // persist the reverted state too
    updateMessage(messageId, { undone: true });
  };

  const handleClear = () => {
    clearChat(resumeId, {
      onSuccess: () => {
        seededRef.current = true;
        setMessages([GREETING]);
      }
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(input);
    }
  };

  // "@" mention trigger: typing "@" opens the same picker as the context
  // button and is consumed (not sent as message text), mirroring the @-mention
  // idiom from Slack/Notion/Linear so the picker is reachable without leaving
  // the keyboard.
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value.length > input.length && value.endsWith('@')) {
      setInput(value.slice(0, -1));
      setFocusOptions(buildFocusOptions(form.getValues()));
      setFocusMenuOpen(true);
      return;
    }
    setInput(value);
  };

  const showSuggestions = messages.length <= 1 && !busy;

  return (
    <div className='flex h-full flex-col gap-3'>
      {/* Header */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-col'>
          <span className='truncate text-sm font-medium'>
            Chat with your resume
          </span>
          <span className='text-muted-foreground truncate text-xs'>
            Edits apply and save automatically.
          </span>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAtsScore()}
            disabled={busy}
            aria-label='Analyze ATS'
            className='gap-2'
          >
            <IconSparkles data-icon='inline-start' />
            <span className='hidden sm:inline'>Analyze ATS</span>
          </Button>
          {messages.length > 1 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleClear}
              disabled={busy || isClearing}
              aria-label='Clear chat'
              className='text-muted-foreground gap-2'
            >
              <IconTrash data-icon='inline-start' />
              <span className='hidden sm:inline'>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className='min-h-0 flex-1'>
        {isLoadingHistory ? (
          <div className='flex flex-col gap-5 px-1 py-4'>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2',
                  i % 2 === 1 && 'flex-row-reverse'
                )}
              >
                {i % 2 === 0 && (
                  <Skeleton className='size-8 shrink-0 rounded-full' />
                )}
                <div className='flex max-w-[75%] flex-col gap-2'>
                  <Skeleton className='h-4 w-52' />
                  <Skeleton className='h-4 w-40' />
                  {i % 2 === 0 && <Skeleton className='h-4 w-28' />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className='py-2'>
                  {messages.map((message) => {
                    const isLoading =
                      message.role === 'assistant' &&
                      ((message.streaming && !message.content) ||
                        message.atsLoading);

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === 'user'}
                      >
                        <Message
                          align={message.role === 'user' ? 'end' : 'start'}
                        >
                          {message.role === 'assistant' && (
                            <MessageAvatar className='size-8'>
                              <IconSparkles className='text-primary size-4' />
                            </MessageAvatar>
                          )}
                          <MessageContent>
                            {isLoading ? (
                              <span className='shimmer px-1 text-sm'>
                                {message.atsLoading
                                  ? 'Analyzing ATS score…'
                                  : 'Thinking…'}
                              </span>
                            ) : (
                              <Bubble
                                align={
                                  message.role === 'user' ? 'end' : 'start'
                                }
                                variant={
                                  message.error
                                    ? 'destructive'
                                    : message.role === 'user'
                                      ? 'default'
                                      : 'muted'
                                }
                              >
                                <BubbleContent>
                                  {message.content}
                                  {message.streaming &&
                                    message.content &&
                                    !message.applyingEdit && (
                                      <span
                                        aria-hidden
                                        className='ml-0.5 inline-block animate-pulse'
                                      >
                                        ▍
                                      </span>
                                    )}
                                </BubbleContent>
                              </Bubble>
                            )}

                            {message.applyingEdit && (
                              <span className='shimmer px-1 text-sm'>
                                Applying changes…
                              </span>
                            )}

                            {message.atsReport && (
                              <div className='bg-muted/40 flex flex-col gap-3 rounded-lg border p-3 text-xs'>
                                <div className='flex items-baseline gap-2'>
                                  <span className='text-foreground text-2xl font-bold'>
                                    {message.atsReport.score}
                                  </span>
                                  <span className='text-muted-foreground'>
                                    / 100 ATS match
                                  </span>
                                  {typeof message.atsPrevScore === 'number' &&
                                    message.atsPrevScore !==
                                      message.atsReport.score && (
                                      <Badge
                                        variant={
                                          message.atsReport.score >
                                          message.atsPrevScore
                                            ? 'default'
                                            : 'secondary'
                                        }
                                        className='ml-auto'
                                      >
                                        {message.atsReport.score >
                                        message.atsPrevScore
                                          ? '▲'
                                          : '▼'}{' '}
                                        {Math.abs(
                                          message.atsReport.score -
                                            message.atsPrevScore
                                        )}{' '}
                                        from last
                                      </Badge>
                                    )}
                                </div>

                                {(message.atsReport.breakdown?.length ?? 0) >
                                  0 && (
                                  <div className='flex flex-col gap-1.5'>
                                    {message.atsReport.breakdown!.map((dim) => (
                                      <div
                                        key={dim.key}
                                        className='flex items-center gap-2'
                                        title={dim.detail}
                                      >
                                        <span className='text-muted-foreground w-28 shrink-0 truncate'>
                                          {dim.label}
                                        </span>
                                        <div className='bg-muted h-1.5 flex-1 overflow-hidden rounded-full'>
                                          <div
                                            className='bg-primary h-full rounded-full'
                                            style={{ width: `${dim.score}%` }}
                                          />
                                        </div>
                                        <span className='text-foreground w-7 shrink-0 text-right font-medium'>
                                          {dim.score}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(message.atsReport.missingRequired?.length ??
                                  0) > 0 && (
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-foreground font-medium'>
                                      Missing — required
                                    </span>
                                    <div className='flex flex-wrap gap-1'>
                                      {message.atsReport
                                        .missingRequired!.slice(0, 12)
                                        .map((keyword, i) => (
                                          <Badge key={i} variant='destructive'>
                                            {keyword}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {(message.atsReport.missingPreferred?.length ??
                                  0) > 0 && (
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-muted-foreground font-medium'>
                                      Missing — nice to have
                                    </span>
                                    <div className='flex flex-wrap gap-1'>
                                      {message.atsReport
                                        .missingPreferred!.slice(0, 10)
                                        .map((keyword, i) => (
                                          <Badge key={i} variant='secondary'>
                                            {keyword}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {!message.atsReport.missingRequired &&
                                  !message.atsReport.missingPreferred &&
                                  message.atsReport.missingKeywords.length >
                                    0 && (
                                    <div className='flex flex-col gap-1'>
                                      <span className='text-foreground font-medium'>
                                        Missing keywords
                                      </span>
                                      <div className='flex flex-wrap gap-1'>
                                        {message.atsReport.missingKeywords
                                          .slice(0, 12)
                                          .map((keyword, i) => (
                                            <Badge
                                              key={i}
                                              variant='destructive'
                                            >
                                              {keyword}
                                            </Badge>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                {message.atsReport.suggestions.length > 0 && (
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-foreground font-medium'>
                                      Suggestions
                                    </span>
                                    <ul className='text-muted-foreground flex list-disc flex-col gap-1 pl-4'>
                                      {message.atsReport.suggestions
                                        .slice(0, 8)
                                        .map((suggestion, i) => (
                                          <li key={i}>
                                            {suggestion}{' '}
                                            <button
                                              type='button'
                                              className='text-primary font-medium underline-offset-2 hover:underline disabled:opacity-50'
                                              disabled={busy}
                                              onClick={() =>
                                                handleApplySuggestion(
                                                  suggestion,
                                                  message.atsReport!
                                                )
                                              }
                                            >
                                              Apply
                                            </button>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}

                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='h-7 w-fit gap-1.5'
                                  disabled={busy}
                                  onClick={() =>
                                    handleApplyAts(message.atsReport!)
                                  }
                                >
                                  <IconSparkles data-icon='inline-start' />
                                  Improve my resume with these
                                </Button>
                              </div>
                            )}

                            {message.role === 'assistant' &&
                              !message.streaming &&
                              message.changes &&
                              message.changes.length > 0 && (
                                <div className='bg-muted/40 flex flex-col gap-2 rounded-lg border p-2.5 text-xs'>
                                  <div className='text-foreground flex items-center gap-1.5 font-medium'>
                                    <IconPencil className='size-3.5' />
                                    {message.undone
                                      ? 'Changes reverted'
                                      : 'Applied changes'}
                                  </div>
                                  <ul
                                    className={cn(
                                      'text-muted-foreground flex flex-col gap-1',
                                      message.undone &&
                                        'line-through opacity-60'
                                    )}
                                  >
                                    {message.changes.map((change, i) => (
                                      <li key={i} className='flex gap-1.5'>
                                        <span aria-hidden>•</span>
                                        <span>{change}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  {message.undoSnapshot && (
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      className='h-7 gap-1.5 self-start'
                                      disabled={message.undone}
                                      onClick={() => handleUndo(message.id)}
                                    >
                                      <IconArrowBackUp data-icon='inline-start' />
                                      {message.undone ? 'Reverted' : 'Undo'}
                                    </Button>
                                  )}
                                </div>
                              )}

                            {/* Verify-after-apply: the local keyword check run
                                against the edit this message applied. */}
                            {message.atsVerify && !message.undone && (
                              <div className='bg-muted/40 flex flex-col gap-2 rounded-lg border p-2.5 text-xs'>
                                <div className='text-foreground flex items-center gap-1.5 font-medium'>
                                  <IconChecklist className='size-3.5' />
                                  Keyword check
                                </div>
                                {message.atsVerify.nowMatching.length > 0 && (
                                  <div className='flex flex-wrap items-center gap-1'>
                                    <span className='text-muted-foreground mr-1'>
                                      ✓ Now matching
                                    </span>
                                    {message.atsVerify.nowMatching
                                      .slice(0, 12)
                                      .map((keyword, i) => (
                                        <Badge key={i} variant='default'>
                                          {keyword}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                                {message.atsVerify.stillMissing.length > 0 && (
                                  <div className='flex flex-wrap items-center gap-1'>
                                    <span className='text-muted-foreground mr-1'>
                                      ✗ Still missing
                                    </span>
                                    {message.atsVerify.stillMissing
                                      .slice(0, 12)
                                      .map((keyword, i) => (
                                        <Badge key={i} variant='destructive'>
                                          {keyword}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                                {message.atsVerify.lost.length > 0 && (
                                  <div className='flex flex-wrap items-center gap-1'>
                                    <span className='text-muted-foreground mr-1'>
                                      ⚠ No longer matching
                                    </span>
                                    {message.atsVerify.lost
                                      .slice(0, 12)
                                      .map((keyword, i) => (
                                        <Badge key={i} variant='secondary'>
                                          {keyword}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                                <span className='text-muted-foreground'>
                                  {message.atsVerify.stillMissing.length ===
                                    0 && message.atsVerify.lost.length === 0
                                    ? message.atsVerify.nowMatching.length > 0
                                      ? 'Every targeted keyword now matches — run Analyze ATS to see your new score.'
                                      : 'No keyword changes from this edit.'
                                    : 'Verified with the same matcher the score uses — re-run Analyze ATS for the updated score.'}
                                </span>
                              </div>
                            )}
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className='flex flex-wrap gap-2'>
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              variant='outline'
              size='sm'
              className='rounded-full'
              onClick={() => handleSend(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Focus chips: the resume items attached to the next message, if any */}
      {focuses.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          {focuses.map((f) => (
            <Badge
              key={focusId(f)}
              variant='secondary'
              className='gap-1 py-1 pr-1 pl-2.5'
            >
              {f.label}
              <button
                type='button'
                onClick={() => toggleFocus(f, false)}
                aria-label={`Remove ${f.label}`}
                className='hover:bg-foreground/10 ml-0.5 rounded-full p-0.5'
              >
                <IconX className='size-3' />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* @ mention picker: opened by typing "@" in the composer (see
          handleInputChange). Multi-select checklist — the menu stays open so you
          can attach several items; the trigger below is a zero-size anchor the
          menu positions against. */}
      <DropdownMenu
        open={focusMenuOpen}
        onOpenChange={(open: boolean) => {
          setFocusMenuOpen(open);
          if (open) setFocusOptions(buildFocusOptions(form.getValues()));
        }}
      >
        <DropdownMenuTrigger
          type='button'
          aria-hidden='true'
          tabIndex={-1}
          className='h-0 w-0 opacity-0'
        />
        <DropdownMenuContent align='start' className='max-h-72 w-64'>
          {focusOptions.length === 0 ? (
            <DropdownMenuItem disabled>
              Nothing to focus on yet
            </DropdownMenuItem>
          ) : (
            focusOptions.map((option) => {
              const id = focusId(option);
              return (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={focuses.some((f) => focusId(f) === id)}
                  onCheckedChange={(on: boolean) => toggleFocus(option, on)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Composer */}
      <div className='flex items-end gap-2'>
        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={2}
          placeholder='Ask the AI to edit your resume… (type @ to reference an item)'
          className='max-h-40 min-h-11 flex-1 resize-none'
        />
        <Button
          type='button'
          size='icon'
          onClick={() => handleSend(input)}
          disabled={!input.trim() || busy}
          aria-label='Send message'
        >
          <IconArrowUp />
        </Button>
      </div>
    </div>
  );
}
