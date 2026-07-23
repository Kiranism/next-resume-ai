import { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';
import { type TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import { SectionToggleButton, useSectionVisibility } from './section-shell';

interface PersonalDetailsProps {
  control: Control<TResumeEditFormValues>;
}

export function PersonalDetails({ control }: PersonalDetailsProps) {
  const summary = useSectionVisibility('summary');
  return (
    <div className='flex flex-col gap-6'>
      <h2 className='text-2xl font-semibold'>Personal Details</h2>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <FormField
          control={control}
          name='personal_details.fname'
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.lname'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type='email' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type='tel' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.linkedin'
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.github'
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.website'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio / Website</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.country'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name='personal_details.city'
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
        name='personal_details.summary'
        render={({ field }) => (
          <FormItem>
            <div className='flex items-center gap-1.5'>
              <FormLabel>Professional Summary</FormLabel>
              <SectionToggleButton sectionKey='summary' />
              {summary.isHidden && (
                <span className='text-muted-foreground text-xs'>
                  Hidden from resume
                </span>
              )}
            </div>
            <FormControl>
              <RichTextEditor
                className={cn(summary.isHidden && 'opacity-50')}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
