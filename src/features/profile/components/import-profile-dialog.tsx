'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

export function ImportProfileDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { mutateAsync: importProfile, isPending } = useImportProfile();

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
      <DialogTrigger asChild>
        <Button variant='outline'>Import from text</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Import a profile from text</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground'>
          Paste your existing resume or CV text. We&apos;ll parse it into a
          profile you can review and edit.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Paste your resume text here…'
          className='min-h-[220px]'
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
