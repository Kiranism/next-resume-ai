import * as React from 'react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// shadcn/ui Field primitives, implemented in this project's inline-utility style
// (matching the existing base-nova components) rather than the cn-* class variant,
// so spacing is self-contained and consistent everywhere.
//
// Spacing contract (single source of truth for label/input rhythm):
// - Field (vertical): gap-2 between label -> control -> description/error
// - FieldGroup:       gap-6 between fields
// - FieldSet:         gap-4 inside a grouped set

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-group'
      className={cn('flex w-full flex-col gap-6', className)}
      {...props}
    />
  );
}

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal';
}) {
  return (
    <div
      data-slot='field'
      data-orientation={orientation}
      className={cn(
        'group/field data-[invalid=true]:text-destructive flex w-full gap-2',
        orientation === 'vertical' && 'flex-col',
        orientation === 'horizontal' && 'flex-row items-center justify-between',
        className
      )}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot='field-label'
      className={cn(
        'group-data-[invalid=true]/field:text-destructive',
        className
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='field-description'
      className={cn(
        'text-muted-foreground text-sm leading-normal font-normal',
        className
      )}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='field-error'
      className={cn('text-destructive text-sm font-medium', className)}
      {...props}
    />
  );
}

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot='field-set'
      className={cn('flex w-full flex-col gap-4', className)}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot='field-legend'
      data-variant={variant}
      className={cn(
        'font-medium',
        variant === 'legend' && 'text-base',
        variant === 'label' && 'text-sm',
        className
      )}
      {...props}
    />
  );
}

function FieldSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-separator'
      className={cn('bg-border h-px w-full', className)}
      {...props}
    />
  );
}

export {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
  FieldSeparator
};
