'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ProfileWithRelations } from '@/server/routers/profile-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useCreateProfile, useUpdateProfile } from '../api';
import { profileSchema, TProfileFormValues } from '../utils/form-schema';

interface CreateProfileFormProps {
  profile?: ProfileWithRelations;
}

const transformProfileToFormValues = (
  profile?: ProfileWithRelations
): TProfileFormValues => {
  if (!profile) {
    return {
      email: '',
      firstname: '',
      lastname: '',
      contactno: '',
      country: '',
      city: '',
      linkedin: '',
      github: '',
      website: '',
      jobs: [],
      educations: []
    };
  }

  return {
    email: profile.email,
    firstname: profile.firstname,
    lastname: profile.lastname,
    contactno: profile.contactno,
    country: profile.country,
    city: profile.city,
    linkedin: profile.linkedin || '',
    github: profile.github || '',
    website: profile.website || '',
    jobs: profile.jobs.map((job) => ({
      jobTitle: job.jobTitle || '',
      employer: job.employer || '',
      city: job.city || '',
      startDate: job.startDate || '',
      endDate: job.endDate || '',
      description: job.description || '',
      id: job.id
    })),
    educations:
      profile.educations?.map((edu) => ({
        school: edu.school || '',
        degree: edu.degree || '',
        field: edu.field || '',
        description: edu.description || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        city: edu.city || '',
        id: edu.id
      })) || []
  };
};

export default function CreateProfileForm({ profile }: CreateProfileFormProps) {
  const { mutateAsync: createProfile, isPending: isCreating } =
    useCreateProfile();
  const { mutateAsync: updateProfile, isPending: isUpdating } =
    useUpdateProfile();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isReviewStep, setIsReviewStep] = useState(false);

  const form = useForm<TProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: transformProfileToFormValues(profile)
  });

  const {
    fields: jobFields,
    append: appendJob,
    remove: removeJob
  } = useFieldArray({
    control: form.control,
    name: 'jobs'
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation
  } = useFieldArray({
    control: form.control,
    name: 'educations'
  });

  const onSubmit: SubmitHandler<TProfileFormValues> = async (data) => {
    try {
      if (profile) {
        await updateProfile({ id: profile.id, ...data });
        toast.success('Profile updated successfully');
      } else {
        await createProfile(data);
        toast.success('Profile created successfully');
      }
      router.push('/dashboard/profile');
      router.refresh();
    } catch (error) {
      console.error('Profile submission error:', error);
      toast.error('Failed to submit profile. Please try again.');
    }
  };

  const steps = [
    {
      title: 'Basic Information',
      fields: ['email', 'firstname', 'lastname', 'contactno', 'country', 'city']
    },
    {
      title: 'Work Experience',
      fields: ['jobs']
    },
    {
      title: 'Education',
      fields: ['educations']
    },
    {
      title: 'Review',
      fields: []
    }
  ];

  const validateStep = () => {
    const currentStepFields = steps[step - 1].fields;
    const isValid = currentStepFields.every((field) => {
      if (field === 'jobs') {
        if (jobFields.length === 0) {
          toast.error('Please add at least one job experience');
          return false;
        }
        return true;
      }
      if (field === 'educations') {
        if (educationFields.length === 0) {
          toast.error('Please add at least one education entry');
          return false;
        }
        return true;
      }

      const fieldError = form.getFieldState(
        field as keyof TProfileFormValues
      ).error;
      if (fieldError) {
        // Get the field label
        const fieldLabel =
          {
            email: 'Email',
            firstname: 'First Name',
            lastname: 'Last Name',
            contactno: 'Phone Number',
            country: 'Country',
            city: 'City'
          }[field] || field;

        toast.error(`Please enter a valid ${fieldLabel}`);
        return false;
      }
      return true;
    });
    return isValid;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      if (step === steps.length - 1) {
        setIsReviewStep(true);
      }
      setStep((prev) => Math.min(prev + 1, steps.length));
    } else {
      form.trigger(steps[step - 1].fields as any);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setIsReviewStep(false);
  };

  const handleFinish = () => {
    // Validate all previous steps
    const isValid = steps.slice(0, -1).every((stepConfig, index) => {
      if (stepConfig.fields.includes('jobs') && jobFields.length === 0) {
        toast.error('Please add at least one job experience');
        return false;
      }
      if (
        stepConfig.fields.includes('educations') &&
        educationFields.length === 0
      ) {
        toast.error('Please add at least one education entry');
        return false;
      }

      const stepFields = stepConfig.fields.filter(
        (field) => field !== 'jobs' && field !== 'educations'
      );

      const fieldsValid = stepFields.every((field) => {
        const fieldError = form.getFieldState(
          field as keyof TProfileFormValues
        ).error;
        if (fieldError) {
          // Get the field label
          const fieldLabel =
            {
              email: 'Email',
              firstname: 'First Name',
              lastname: 'Last Name',
              contactno: 'Phone Number',
              country: 'Country',
              city: 'City'
            }[field] || field;

          toast.error(`Please enter a valid ${fieldLabel}`);
          return false;
        }
        return true;
      });

      return fieldsValid;
    });

    if (isValid) {
      form.handleSubmit(onSubmit)();
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className='flex flex-col gap-4'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter email' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='firstname'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter first name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='lastname'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter last name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='contactno'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Enter phone number'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='country'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter country' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter city' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='linkedin'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='linkedin.com/in/you'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='github'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='github.com/you'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='website'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio / Website (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='yoursite.com'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case 2:
        return (
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold'>Work Experience</h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  appendJob({
                    jobTitle: '',
                    employer: '',
                    city: '',
                    startDate: '',
                    endDate: '',
                    description: ''
                  })
                }
                className='flex items-center gap-2'
              >
                <PlusCircle className='h-4 w-4' /> Add Job
              </Button>
            </div>
            {jobFields.length === 0 ? (
              <div className='text-muted-foreground py-4 text-center'>
                No work experience added yet
              </div>
            ) : (
              jobFields.map((field, index) => (
                <div
                  key={field.id}
                  className='bg-background relative flex flex-col gap-3 rounded-lg border p-4'
                >
                  <Button
                    type='button'
                    variant='destructive'
                    size='icon'
                    className='absolute top-2 right-2 h-8 w-8'
                    onClick={() => removeJob(index)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name={`jobs.${index}.jobTitle`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Enter job title'
                              {...inputField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`jobs.${index}.employer`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Employer</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Enter employer'
                              {...inputField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`jobs.${index}.city`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder='Enter city' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`jobs.${index}.startDate`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type='date' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`jobs.${index}.endDate`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type='date' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`jobs.${index}.description`}
                      render={({ field: inputField }) => (
                        <FormItem className='md:col-span-2'>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Enter job description'
                              {...inputField}
                              className='min-h-[100px]'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 3:
        return (
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold'>Education</h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  appendEducation({
                    school: '',
                    degree: '',
                    field: '',
                    startDate: '',
                    endDate: '',
                    city: '',
                    description: ''
                  })
                }
                className='flex items-center gap-2'
              >
                <PlusCircle className='h-4 w-4' /> Add Education
              </Button>
            </div>
            {educationFields.length === 0 ? (
              <div className='text-muted-foreground py-4 text-center'>
                No education added yet
              </div>
            ) : (
              educationFields.map((field, index) => (
                <div
                  key={field.id}
                  className='bg-background relative flex flex-col gap-3 rounded-lg border p-4'
                >
                  <Button
                    type='button'
                    variant='destructive'
                    size='icon'
                    className='absolute top-2 right-2 h-8 w-8'
                    onClick={() => removeEducation(index)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name={`educations.${index}.school`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>School</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Enter school name'
                              {...inputField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`educations.${index}.degree`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Degree</FormLabel>
                          <FormControl>
                            <Input placeholder='Enter degree' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`educations.${index}.field`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Field of Study</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Enter field of study'
                              {...inputField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`educations.${index}.startDate`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type='date' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`educations.${index}.endDate`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type='date' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`educations.${index}.city`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder='Enter city' {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`educations.${index}.description`}
                      render={({ field: inputField }) => (
                        <FormItem className='md:col-span-2'>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Enter education description'
                              {...inputField}
                              className='min-h-[100px]'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 4:
        return (
          <div className='flex flex-col gap-4'>
            <h3 className='text-lg font-semibold'>Review Your Information</h3>
            <div className='bg-muted/50 rounded-lg p-4'>
              <h4 className='mb-2 font-semibold'>Basic Information</h4>
              <p>
                Name: {form.getValues('firstname')} {form.getValues('lastname')}
              </p>
              <p>Email: {form.getValues('email')}</p>
              <p>Phone: {form.getValues('contactno')}</p>
              <p>
                Location: {form.getValues('city')}, {form.getValues('country')}
              </p>

              <h4 className='mt-4 mb-2 font-semibold'>Work Experience</h4>
              {jobFields.map((job, index) => (
                <div key={job.id} className='mb-2'>
                  <p>
                    {form.getValues(`jobs.${index}.jobTitle`)} at{' '}
                    {form.getValues(`jobs.${index}.employer`)}
                  </p>
                </div>
              ))}

              <h4 className='mt-4 mb-2 font-semibold'>Education</h4>
              {educationFields.map((edu, index) => (
                <div key={edu.id} className='mb-2'>
                  <p>
                    {form.getValues(`educations.${index}.degree`)} from{' '}
                    {form.getValues(`educations.${index}.school`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-6'
      >
        {/* Stepper Indicators */}
        <div className='mb-4 flex justify-center gap-2'>
          {steps.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 w-8 rounded-full',
                index + 1 === step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className='min-h-[300px]'>{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className='flex justify-between'>
          {step > 1 && (
            <Button type='button' variant='outline' onClick={handlePrevStep}>
              <ArrowLeft className='mr-2' /> Previous
            </Button>
          )}

          {step < steps.length - 1 ? (
            <Button type='button' onClick={handleNextStep} className='ml-auto'>
              Next <ArrowRight className='ml-2' />
            </Button>
          ) : (
            <Button
              type='button'
              onClick={handleFinish}
              disabled={isCreating || isUpdating}
              className='ml-auto'
            >
              Finish <Check className='ml-2' />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
