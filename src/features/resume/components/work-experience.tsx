import { Control } from 'react-hook-form';
import { useResumeSection } from '../hooks/use-resume-section';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { type TResumeEditFormValues } from '../utils/form-schema';
import { PlusCircle, Trash2 } from 'lucide-react';
import { SectionShell } from './section-shell';

interface WorkExperienceProps {
  control: Control<TResumeEditFormValues>;
}

export function WorkExperience({ control }: WorkExperienceProps) {
  const { fields, add, removeItem } = useResumeSection(
    'jobs',
    'Experience',
    () => ({
      jobTitle: '',
      employer: '',
      description: '',
      startDate: '',
      endDate: '',
      city: ''
    })
  );

  return (
    <SectionShell
      title='Work Experience'
      sectionKey='experience'
      action={
        <Button type='button' variant='outline' size='sm' onClick={add}>
          <PlusCircle className='mr-2 h-4 w-4' />
          Add Experience
        </Button>
      }
    >
      <div className='flex flex-col gap-6'>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className='flex flex-col gap-4 rounded-lg border p-4'
          >
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => removeItem(index)}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FormField
                control={control}
                name={`jobs.${index}.jobTitle`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`jobs.${index}.employer`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`jobs.${index}.startDate`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`jobs.${index}.endDate`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`jobs.${index}.city`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name={`jobs.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
