'use client';

import { Form } from '@/components/ui/form';
import { type TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import { UseFormReturn } from 'react-hook-form';
import { Education } from './education';
import { Languages } from './languages';
import { PersonalDetails } from './personal-details';
import { Projects } from './projects';
import { Skills } from './skills';
import { Tools } from './tools';
import { WorkExperience } from './work-experience';

interface EditResumeFormProps {
  form: UseFormReturn<TResumeEditFormValues, any, undefined>;
}

// Changes persist automatically (see useAutosaveResume), so there is no manual
// save button — the autosave status shows in the editor top bar.
export const EditResumeForm = ({ form }: EditResumeFormProps) => {
  return (
    <Form {...form}>
      <div className='flex flex-col gap-8'>
        <PersonalDetails control={form.control} />
        <WorkExperience control={form.control} />
        <Education control={form.control} />
        <Projects control={form.control} />
        <Skills control={form.control} />
        <Tools control={form.control} />
        <Languages control={form.control} />
      </div>
    </Form>
  );
};
