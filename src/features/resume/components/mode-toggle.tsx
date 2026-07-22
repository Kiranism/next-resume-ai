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
  const btnSize = isMobile ? 'sm' : 'default';

  return (
    <div className='mb-4 flex flex-wrap items-center gap-2'>
      <Button
        variant='outline'
        onClick={() => router.push('/dashboard/resume')}
        size={btnSize}
      >
        <Icons.chevronLeft />
        Exit
      </Button>

      {/* Two ways to edit the same resume — kept together as one choice. */}
      <div className='flex items-center gap-1'>
        <Button
          variant={mode === 'edit' ? 'default' : 'outline'}
          onClick={() => onModeChange('edit')}
          size={btnSize}
        >
          Manual
        </Button>
        <AnimatedButton
          type='button'
          onClick={() => onModeChange('chat')}
          className={cn(
            isMobile ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
            mode === 'chat' &&
              'ring-primary ring-offset-background ring-2 ring-offset-1'
          )}
        >
          <IconSparkles className='text-primary size-4' />
          AI Chat
        </AnimatedButton>
      </div>

      {/* Templates is a separate concern — divide it off. */}
      <div className='bg-border mx-1 hidden h-6 w-px sm:block' />

      <Button
        variant={mode === 'template' ? 'default' : 'outline'}
        onClick={() => onModeChange('template')}
        size={btnSize}
      >
        Template
      </Button>

      {isMobile && (
        <Button
          variant={mode === 'preview' ? 'default' : 'outline'}
          onClick={() => onModeChange('preview')}
          size={btnSize}
        >
          Preview
        </Button>
      )}
    </div>
  );
}
