import { Control, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type TResumeEditFormValues } from '../utils/form-schema';
import { PlusCircle, Trash2 } from 'lucide-react';
import { SectionShell } from './section-shell';

interface ProjectsProps {
  control: Control<TResumeEditFormValues>;
}

export function Projects({ control }: ProjectsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'projects'
  });

  return (
    <SectionShell
      title='Projects'
      sectionKey='projects'
      action={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => append({ name: '', description: '', link: '' })}
        >
          <PlusCircle className='mr-2 h-4 w-4' />
          Add Project
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
                onClick={() => remove(index)}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FormField
                control={control}
                name={`projects.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`projects.${index}.link`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://…'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name={`projects.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className='min-h-[100px]'
                      {...field}
                      value={field.value ?? ''}
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
