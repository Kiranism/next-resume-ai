'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditResumeForm } from '@/features/resume/components/edit-resume-form';
import { ModeToggle } from '@/features/resume/components/mode-toggle';
import PdfRenderer from '@/features/resume/components/pdf-renderer';
import { AtsReportDialog } from '@/features/resume/components/ats-report-dialog';
import { ResumeActions } from '@/features/resume/components/resume-actions';
import { TemplateSelection } from '@/features/resume/components/template-selection';
import { useTemplateStore } from '@/features/resume/store/use-template-store';
import {
  resumeEditFormSchema,
  TResumeEditFormValues
} from '@/features/resume/utils/form-schema';
import { Resume } from '@/server/db/schema/resumes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ResumeEditContentProps {
  resume: Resume;
}

export function ResumeEditContent({ resume }: ResumeEditContentProps) {
  const [mode, setMode] = useState<'edit' | 'template' | 'preview' | 'zen'>(
    'edit'
  );

  const {
    selectedTemplate,
    currentTemplate,
    setSelectedTemplate,
    applyTemplate
  } = useTemplateStore();

  useEffect(() => {
    if (mode === 'edit') {
      setSelectedTemplate(currentTemplate);
    }
  }, [mode, currentTemplate, setSelectedTemplate]);

  const initalData: TResumeEditFormValues = {
    resume_id: resume?.id || '',
    personal_details:
      resume?.personalDetails as TResumeEditFormValues['personal_details'],
    jobs: resume?.jobs as TResumeEditFormValues['jobs'],
    educations: resume?.education as TResumeEditFormValues['educations'],
    skills: resume?.skills as TResumeEditFormValues['skills'],
    tools: resume?.tools as TResumeEditFormValues['tools'],
    languages: resume?.languages as TResumeEditFormValues['languages']
  };

  const form = useForm<TResumeEditFormValues>({
    resolver: zodResolver(resumeEditFormSchema),
    defaultValues: initalData,
    mode: 'onChange',
    shouldFocusError: false
  });

  const formData = form.watch();

  const handleApplyTemplate = (templateId: string) => {
    applyTemplate(templateId);
    setMode('edit');
  };

  // Extract content rendering logic
  const renderContent = () => {
    if (mode === 'edit') {
      return <EditResumeForm form={form} />;
    }
    if (mode === 'template') {
      return (
        <TemplateSelection
          selectedTemplate={selectedTemplate}
          onTemplateSelect={setSelectedTemplate}
          onApplyTemplate={handleApplyTemplate}
          currentTemplate={currentTemplate}
        />
      );
    }
    if (mode === 'preview') {
      return (
        <div className='relative flex h-full justify-center bg-accent pt-4'>
          <div className='origin-top scale-75'>
            <PdfRenderer formData={formData} templateId={selectedTemplate} />
          </div>
        </div>
      );
    }
  };

  return (
    <div className='h-full p-4'>
      {/* Mode Toggle */}

      <div className='block md:hidden'>
        <ModeToggle mode={mode} onModeChange={setMode} isMobile={true} />
      </div>

      {/* Desktop Layout */}
      <div className='hidden h-full md:block'>
        <ResizablePanelGroup
          direction='horizontal'
          className='h-full w-full rounded-lg border'
        >
          <ResizablePanel defaultSize={45}>
            <div className='h-full w-full p-8'>
              <div className='hidden md:block'>
                <ModeToggle mode={mode} onModeChange={setMode} />
              </div>
              <ScrollArea className='h-[calc(100vh-120px)] pr-10'>
                {mode !== 'preview' && renderContent()}
              </ScrollArea>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={55} minSize={45}>
            <div className='h-full w-full'>
              <div className='flex justify-end gap-2 p-2'>
                <ResumeActions resumeId={resume.id} />
                <AtsReportDialog resumeId={resume.id} />
              </div>
              <ScrollArea className='h-[calc(100vh-56px)]'>
                <div className='relative flex h-full justify-center bg-accent pt-2'>
                  <div className='origin-top scale-90'>
                    <PdfRenderer
                      formData={formData}
                      templateId={selectedTemplate}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className='block h-full md:hidden'>
        <div className='h-full w-full rounded-lg border'>
          <div className='h-full w-full p-4'>
            <ScrollArea className='h-[calc(100vh-150px)]'>
              {renderContent()}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
