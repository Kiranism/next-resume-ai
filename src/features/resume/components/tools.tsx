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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { type TResumeEditFormValues } from '../utils/form-schema';
import { PlusCircle, Trash2 } from 'lucide-react';
import { SectionShell } from './section-shell';

interface ToolsProps {
  control: Control<TResumeEditFormValues>;
}

export const Tools = ({ control }: ToolsProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tools'
  });

  return (
    <SectionShell
      title='Tools & Software'
      sectionKey='tools'
      action={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() =>
            append({
              tool_name: '',
              proficiency_level: 'beginner'
            })
          }
        >
          <PlusCircle className='mr-2 h-4 w-4' />
          Add Tool
        </Button>
      }
    >
      <div className='grid gap-4'>
        {fields.map((field, index) => (
          <div key={field.id} className='flex items-end gap-4'>
            <FormField
              control={control}
              name={`tools.${index}.tool_name`}
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>Tool Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='e.g. Adobe Photoshop' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tools.${index}.proficiency_level`}
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>Proficiency Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select level' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='beginner'>Beginner</SelectItem>
                      <SelectItem value='intermediate'>Intermediate</SelectItem>
                      <SelectItem value='advanced'>Advanced</SelectItem>
                      <SelectItem value='expert'>Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => remove(index)}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};
