'use client';

import { useRouter } from 'next/navigation';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useDeleteResume, useDuplicateResume } from '../api';

export function ResumeActions({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const { mutateAsync: deleteResume, isPending: isDeleting } =
    useDeleteResume();
  const { mutateAsync: duplicateResume, isPending: isDuplicating } =
    useDuplicateResume();

  const handleDuplicate = async () => {
    try {
      const result = await duplicateResume(resumeId);
      if (result && 'id' in result && result.id) {
        toast.success('Resume duplicated');
        router.push(`/dashboard/resume/edit/${result.id}`);
      } else {
        toast.error('Could not duplicate resume');
      }
    } catch {
      toast.error('Could not duplicate resume');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResume(resumeId);
      toast.success('Resume deleted');
      router.push('/dashboard/resume');
    } catch {
      toast.error('Could not delete resume');
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={handleDuplicate}
        disabled={isDuplicating}
      >
        {isDuplicating ? (
          <Loader2 className='mr-1 h-4 w-4 animate-spin' />
        ) : (
          <Copy className='mr-1 h-4 w-4' />
        )}
        Duplicate
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant='destructive' size='sm' disabled={isDeleting}>
            <Trash2 className='mr-1 h-4 w-4' /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The resume will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
