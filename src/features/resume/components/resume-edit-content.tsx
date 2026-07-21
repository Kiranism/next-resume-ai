'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/ui/sidebar';
import { EditResumeForm } from '@/features/resume/components/edit-resume-form';
import { ModeToggle } from '@/features/resume/components/mode-toggle';
import PdfRenderer from '@/features/resume/components/pdf-renderer';
import { ResumeChat } from '@/features/resume/components/resume-chat';
import { AutosaveIndicator } from '@/features/resume/components/autosave-indicator';
import { TemplateSelection } from '@/features/resume/components/template-selection';
import { useAutosaveResume } from '@/features/resume/hooks/use-autosave-resume';
import { useApplyResumeTemplate } from '@/features/resume/api';
import { useTemplateStore } from '@/features/resume/store/use-template-store';
import {
  resumeEditFormSchema,
  TResumeEditFormValues
} from '@/features/resume/utils/form-schema';
import { Resume } from '@/server/db/schema/resumes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ResumeEditContentProps {
  resume: Resume;
}

export function ResumeEditContent({ resume }: ResumeEditContentProps) {
  const [mode, setMode] = useState<
    'edit' | 'template' | 'chat' | 'preview' | 'zen'
  >('edit');

  const {
    selectedTemplate,
    currentTemplate,
    setSelectedTemplate,
    setCurrentTemplate,
    applyTemplate
  } = useTemplateStore();

  const { mutate: persistTemplate } = useApplyResumeTemplate();

  // Seed the template state from THIS resume's saved template so the preview and
  // the "applied" marker reflect the resume being edited (not the last one).
  useEffect(() => {
    const saved = resume?.templateId ?? 'template-one';
    setCurrentTemplate(saved);
    setSelectedTemplate(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume?.id]);

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
    projects: resume?.projects as TResumeEditFormValues['projects'],
    skills: resume?.skills as TResumeEditFormValues['skills'],
    tools: resume?.tools as TResumeEditFormValues['tools'],
    languages: resume?.languages as TResumeEditFormValues['languages'],
    hiddenSections: (resume?.hiddenSections as string[] | null) ?? []
  };

  const form = useForm<TResumeEditFormValues>({
    resolver: zodResolver(resumeEditFormSchema),
    defaultValues: initalData,
    mode: 'onChange',
    shouldFocusError: false
  });

  const formData = form.watch();

  // Background auto-save: debounced on manual edits, immediate (via saveNow) on
  // AI edits / undo triggered from the chat panel.
  const { autosaveState, saveNow } = useAutosaveResume(form);

  // The edit page hides the dashboard header (which holds the sidebar toggle),
  // so collapse the sidebar here for more room; restore it on the way out.
  const { setOpen, open } = useSidebar();
  const initialSidebarOpen = useRef(open);
  useEffect(() => {
    const restore = initialSidebarOpen.current;
    setOpen(false);
    return () => setOpen(restore);
  }, [setOpen]);

  const handleApplyTemplate = (templateId: string) => {
    applyTemplate(templateId);
    // Persist the applied template so the dashboard cover reflects it.
    persistTemplate({ id: resume.id, templateId });
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
              {mode === 'chat' ? (
                <div className='h-[calc(100vh-120px)]'>
                  <ResumeChat
                    form={form}
                    resumeId={resume.id}
                    saveNow={saveNow}
                    autosaveState={autosaveState}
                  />
                </div>
              ) : (
                <ScrollArea className='h-[calc(100vh-120px)] pr-10'>
                  {renderContent()}
                </ScrollArea>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={55} minSize={45}>
            <div className='h-full w-full'>
              <PdfRenderer
                formData={formData}
                templateId={selectedTemplate}
                actions={<AutosaveIndicator state={autosaveState} />}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className='block h-full md:hidden'>
        <div className='h-full w-full rounded-lg border'>
          <div className='h-full w-full p-4'>
            {mode === 'chat' ? (
              <div className='h-[calc(100vh-150px)]'>
                <ResumeChat
                  form={form}
                  resumeId={resume.id}
                  saveNow={saveNow}
                  autosaveState={autosaveState}
                />
              </div>
            ) : mode === 'preview' ? (
              <div className='h-[calc(100vh-150px)]'>
                <PdfRenderer
                  formData={formData}
                  templateId={selectedTemplate}
                />
              </div>
            ) : (
              <ScrollArea className='h-[calc(100vh-150px)]'>
                {renderContent()}
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
