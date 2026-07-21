import { Button } from '@/components/ui/button';
import AnimatedButton from '@/components/ui/animated-button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { IconSparkles } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ModeToggleProps {
  mode: 'edit' | 'template' | 'chat' | 'preview' | 'zen';
  onModeChange: (
    mode: 'edit' | 'template' | 'chat' | 'preview' | 'zen'
  ) => void;
  isMobile?: boolean;
}

export function ModeToggle({
  mode,
  onModeChange,
  isMobile = false
}: ModeToggleProps) {
  const router = useRouter();

  const modes = isMobile
    ? [
        { value: 'edit', label: 'Form' },
        { value: 'template', label: 'Template' },
        { value: 'chat', label: 'Chat' },
        { value: 'preview', label: 'Preview' }
      ]
    : [
        { value: 'edit', label: 'Form' },
        { value: 'template', label: 'Template' },
        { value: 'chat', label: 'Chat' }
      ];

  return (
    <div className='mb-4 flex items-center gap-2'>
      <Button
        variant='outline'
        onClick={() => router.push('/dashboard/resume')}
        size={isMobile ? 'sm' : 'default'}
      >
        <Icons.chevronLeft />
        Exit
      </Button>

      {modes.map(({ value, label }) => {
        // The Chat mode gets a standout animated button with a sparkle icon.
        if (value === 'chat') {
          return (
            <AnimatedButton
              key={value}
              type='button'
              onClick={() => onModeChange('chat')}
              className={cn(
                isMobile ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
                mode === 'chat' &&
                  'ring-primary ring-offset-background ring-2 ring-offset-1'
              )}
            >
              <IconSparkles className='text-primary size-4' />
              {label}
            </AnimatedButton>
          );
        }

        return (
          <Button
            key={value}
            variant={mode === value ? 'default' : 'outline'}
            onClick={() => onModeChange(value as typeof mode)}
            size={isMobile ? 'sm' : 'default'}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
