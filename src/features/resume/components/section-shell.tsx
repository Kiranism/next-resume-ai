'use client';

import { useFormContext } from 'react-hook-form';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { type TResumeEditFormValues } from '../utils/form-schema';

// Read/toggle a section's visibility from the shared form (hiddenSections).
export function useSectionVisibility(sectionKey: string) {
  const form = useFormContext<TResumeEditFormValues>();
  const hidden = form.watch('hiddenSections') ?? [];
  const isHidden = hidden.includes(sectionKey);

  const toggle = () => {
    const next = isHidden
      ? hidden.filter((k) => k !== sectionKey)
      : [...hidden, sectionKey];
    form.setValue('hiddenSections', next, { shouldDirty: true });
  };

  return { isHidden, toggle };
}

// The eye / eye-off button that hides a section from the rendered resume.
export function SectionToggleButton({ sectionKey }: { sectionKey: string }) {
  const { isHidden, toggle } = useSectionVisibility(sectionKey);
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onClick={toggle}
      title={isHidden ? 'Show on resume' : 'Hide from resume'}
      aria-label={isHidden ? 'Show on resume' : 'Hide from resume'}
      aria-pressed={!isHidden}
      className={cn('size-8', isHidden && 'text-muted-foreground')}
    >
      {isHidden ? (
        <IconEyeOff className='size-4' />
      ) : (
        <IconEye className='size-4' />
      )}
    </Button>
  );
}

interface SectionShellProps {
  title: string;
  sectionKey: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

// Section wrapper: title + visibility toggle, dims its fields when hidden.
export function SectionShell({
  title,
  sectionKey,
  action,
  children
}: SectionShellProps) {
  const { isHidden } = useSectionVisibility(sectionKey);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <h2
            className={cn(
              'text-2xl font-semibold',
              isHidden && 'text-muted-foreground'
            )}
          >
            {title}
          </h2>
          <SectionToggleButton sectionKey={sectionKey} />
          {isHidden && (
            <span className='text-muted-foreground text-xs'>
              Hidden from resume
            </span>
          )}
        </div>
        {action}
      </div>
      <div className={cn(isHidden && 'pointer-events-none opacity-50')}>
        {children}
      </div>
    </div>
  );
}
