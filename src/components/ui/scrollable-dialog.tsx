import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DialogProps {
  trigger?: React.ReactNode;
  title: string;
  description: string;
  open: boolean;
  authTitle?: string;
  authDescription?: string;
  onOpenChange: (val: boolean) => void;
  children?: React.ReactNode;
}

export function Modal({
  title,
  trigger,
  description,
  open,
  onOpenChange,
  authTitle,
  authDescription,
  children
}: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : null}
      <DialogContent className='flex h-[min(640px,80vh)] flex-col gap-0 p-0 sm:max-w-2xl [&>button:last-child]:hidden'>
        <ScrollArea className='flex max-h-full flex-col'>
          <DialogHeader className='contents space-y-0 text-left'>
            <DialogTitle className='px-6 pt-6'>{title}</DialogTitle>
            <DialogDescription className='sr-only'>
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className='p-6'>{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
