import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext
} from 'react-hook-form';

import { cn } from '@/lib/utils';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

// FormItem renders a Field so every RHF field gets the same label -> control ->
// message rhythm (Field = flex flex-col gap-2). No ad-hoc margins.
function FormItem({ className, ...props }: React.ComponentProps<typeof Field>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <Field className={className} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof FieldLabel>) {
  const { error, formItemId } = useFormField();

  return (
    <FieldLabel
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

// Base UI's useRender replaces Radix Slot: it merges the field's a11y wiring
// (id/aria-*) onto whatever single element is passed as children, so consumers
// keep the `<FormControl><Input /></FormControl>` API unchanged.
function FormControl({ children, ...props }: React.ComponentProps<'input'>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return useRender({
    render: children as React.ReactElement,
    props: mergeProps<'input'>(
      {
        id: formItemId,
        'aria-describedby': !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`,
        'aria-invalid': !!error
      },
      props
    )
  });
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return (
    <FieldDescription id={formDescriptionId} className={className} {...props} />
  );
}

function FormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <FieldError id={formMessageId} className={className} {...props}>
      {body}
    </FieldError>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField
};
