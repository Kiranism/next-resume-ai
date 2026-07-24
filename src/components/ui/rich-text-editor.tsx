'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold as BoldIcon, List as ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { docToRichText, richTextToDoc } from './rich-text-editor.serialize';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * A headless Tiptap editor constrained to exactly two marks — bold and
 * bullet list — that serializes to/from the tiny markdown subset the PDF
 * templates render (`@/features/resume/utils/rich-text`'s `parseRichText`).
 * Stays a plain controlled `string` field so it drops into react-hook-form
 * exactly like the `<Textarea>` it replaces.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className
}: RichTextEditorProps) {
  // Tracks the last string we emitted via onChange, so the effect that syncs
  // an incoming `value` prop can tell "the user typed this" (skip
  // setContent — would reset the cursor) apart from "value changed
  // externally, e.g. AI chat's setValue" (do setContent).
  const lastEmitted = React.useRef(value);
  // Tiptap's useEditor captures its onUpdate closure ONCE at editor creation, so
  // a bare `onChange` call would stay bound to whatever array index this field
  // had on first render. After a useFieldArray remove/reorder shifts indices,
  // that stale onChange writes back to the OLD index — resurrecting a deleted
  // entry. Route through a ref so onUpdate always targets the CURRENT field.
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const [isEmpty, setIsEmpty] = React.useState(() => value.trim().length === 0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        italic: false,
        // Not part of the two-mark contract (bold + bullet list only) — a
        // hard break mid-paragraph has no representation in the markdown
        // subset the PDF renderer parses.
        hardBreak: false
      })
    ],
    content: richTextToDoc(value),
    editorProps: {
      attributes: {
        class: 'min-h-[100px] w-full px-3 py-2 text-sm outline-none'
      }
    },
    onCreate: ({ editor }) => setIsEmpty(editor.isEmpty),
    onUpdate: ({ editor }) => {
      const next = docToRichText(editor.getJSON());
      lastEmitted.current = next;
      setIsEmpty(editor.isEmpty);
      onChangeRef.current(next);
    }
  });

  // Controlled guard: only push `value` into the editor when it did NOT
  // originate from this editor's own last onChange emit. Without this,
  // every keystroke would round-trip through onChange -> parent -> value
  // prop -> setContent and reset the cursor to the start.
  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(richTextToDoc(value), false);
    setIsEmpty(editor.isEmpty);
  }, [value, editor]);

  return (
    <div
      className={cn(
        'border-input focus-within:border-ring focus-within:ring-ring/50 rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]',
        className
      )}
    >
      <div className='border-input flex items-center gap-1 border-b px-1.5 py-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-7 w-7 p-0',
            editor?.isActive('bold') && 'bg-accent text-accent-foreground'
          )}
          disabled={!editor}
          aria-label='Bold'
          aria-pressed={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-7 w-7 p-0',
            editor?.isActive('bulletList') && 'bg-accent text-accent-foreground'
          )}
          disabled={!editor}
          aria-label='Bullet list'
          aria-pressed={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className='h-4 w-4' />
        </Button>
      </div>
      <div className='relative'>
        {placeholder && isEmpty && (
          <div className='text-muted-foreground pointer-events-none absolute top-2 left-3 text-sm select-none'>
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
