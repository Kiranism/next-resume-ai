'use client';

import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { type AutosaveState } from '../hooks/use-autosave-resume';

export function AutosaveIndicator({
  state,
  className
}: {
  state: AutosaveState;
  className?: string;
}) {
  if (state === 'idle') return null;

  return (
    <span
      className={cn(
        'text-muted-foreground flex items-center gap-1.5 text-xs',
        state === 'error' && 'text-destructive',
        className
      )}
      aria-live='polite'
    >
      {state === 'saving' && (
        <>
          <Spinner className='size-3.5' />
          Saving…
        </>
      )}
      {state === 'saved' && (
        <>
          <IconCheck className='size-3.5' />
          Saved
        </>
      )}
      {state === 'error' && (
        <>
          <IconAlertTriangle className='size-3.5' />
          Unsaved
        </>
      )}
    </span>
  );
}
