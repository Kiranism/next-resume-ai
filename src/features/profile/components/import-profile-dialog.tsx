'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useImportProfile } from '../api';
import { extractPdfText } from '../utils/extract-pdf-text';

export function ImportProfileDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: importProfile, isPending } = useImportProfile();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    setIsReading(true);
    try {
      const extracted = await extractPdfText(file);
      if (extracted.length < 30) {
        toast.error(
          "Couldn't read text from this PDF (is it a scan/image?). Try pasting the text instead."
        );
        return;
      }
      setText(extracted);
      toast.success('Extracted — review below, then Parse & Import');
    } catch {
      toast.error('Could not read this PDF');
    } finally {
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (!text.trim()) return;
    try {
      const result = await importProfile(text);
      if (result && !('error' in result)) {
        toast.success('Profile imported — review and edit it below');
        setText('');
        setOpen(false);
      } else {
        toast.error('Could not import profile');
      }
    } catch {
      toast.error('Could not import profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant='outline' />}>
        Import resume
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Import a profile</DialogTitle>
        </DialogHeader>
        <p className='text-muted-foreground text-sm'>
          Upload your resume PDF (or paste its text). We&apos;ll parse it into a
          profile you can review and edit.
        </p>

        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,.pdf'
          className='hidden'
          onChange={handleFile}
        />
        <Button
          type='button'
          variant='outline'
          disabled={isReading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isReading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Upload className='mr-2 h-4 w-4' />
          )}
          {isReading ? 'Reading PDF…' : 'Upload PDF'}
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='…or paste your resume text here'
          className='min-h-[200px]'
        />
        <DialogFooter>
          <Button onClick={handleImport} disabled={isPending || !text.trim()}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isPending ? 'Parsing…' : 'Parse & Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
