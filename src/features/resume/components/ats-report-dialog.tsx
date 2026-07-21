'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useAtsReport } from '../api';

export function AtsReportDialog({ resumeId }: { resumeId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useAtsReport(resumeId, open);
  const report = data && !('error' in data) ? data : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant='outline' size='sm' />}>
        ATS Score
      </DialogTrigger>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>ATS Match Report</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className='text-muted-foreground flex items-center gap-2 py-8 text-sm'>
            <Loader2 className='h-4 w-4 animate-spin' /> Analyzing against the
            job description…
          </div>
        )}

        {isError && (
          <p className='text-destructive py-8 text-sm'>
            Could not analyze this resume. Please try again.
          </p>
        )}

        {report && (
          <div className='flex flex-col gap-4'>
            <div className='flex items-baseline gap-2'>
              <span className='text-4xl font-bold'>{report.score}</span>
              <span className='text-muted-foreground'>
                / 100 ATS match (estimate)
              </span>
            </div>

            {report.rationale && <p className='text-sm'>{report.rationale}</p>}

            {report.matchedKeywords.length > 0 && (
              <div>
                <p className='mb-1 text-sm font-semibold'>Matched keywords</p>
                <div className='flex flex-wrap gap-1'>
                  {report.matchedKeywords.map((k, i) => (
                    <Badge key={i} variant='secondary'>
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {report.missingKeywords.length > 0 && (
              <div>
                <p className='mb-1 text-sm font-semibold'>Missing keywords</p>
                <div className='flex flex-wrap gap-1'>
                  {report.missingKeywords.map((k, i) => (
                    <Badge key={i} variant='destructive'>
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {report.suggestions.length > 0 && (
              <div>
                <p className='mb-1 text-sm font-semibold'>Suggestions</p>
                <ul className='list-disc space-y-1 pl-5 text-sm'>
                  {report.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className='text-muted-foreground text-xs'>
              This is an AI estimate of keyword alignment, not a guarantee of
              how any specific ATS will parse your resume.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
