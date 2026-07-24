'use client';

import { Form } from '@/components/ui/form';
import { type TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import { UseFormReturn } from 'react-hook-form';
import { SaveNowProvider } from '@/features/resume/hooks/use-resume-section';
import { Education } from './education';
import { Languages } from './languages';
import { PersonalDetails } from './personal-details';
import { Projects } from './projects';
import { Skills } from './skills';
import { Tools } from './tools';
import { WorkExperience } from './work-experience';

interface EditResumeFormProps {
  form: UseFormReturn<TResumeEditFormValues, any, undefined>;
  saveNow: () => void;
}

// Changes persist automatically (see useAutosaveResume), so there is no manual
// save button — the autosave status shows in the editor top bar. SaveNowProvider
// lets each section persist add/delete/undo immediately instead of on the debounce.
export const EditResumeForm = ({ form, saveNow }: EditResumeFormProps) => {
  return (
    <Form {...form}>
      <SaveNowProvider saveNow={saveNow}>
        <div className='flex flex-col gap-8'>
          <PersonalDetails control={form.control} />
          <WorkExperience control={form.control} />
          <Education control={form.control} />
          <Projects control={form.control} />
          <Skills control={form.control} />
          <Tools control={form.control} />
          <Languages control={form.control} />
        </div>
      </SaveNowProvider>
    </Form>
  );
};
