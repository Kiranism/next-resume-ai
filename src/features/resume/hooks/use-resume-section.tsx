'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useFieldArray,
  useFormContext,
  type ArrayPath,
  type FieldArray
} from 'react-hook-form';
import { toast } from 'sonner';
import { type TResumeEditFormValues } from '../utils/form-schema';

// `saveNow` comes from the autosave hook up in ResumeEditContent. Sections read
// it from context so structural edits (add / delete / undo) can persist
// IMMEDIATELY, instead of riding the 1s text-edit debounce — a debounced delete
// is silently lost if you navigate away or refresh inside that window.
const SaveNowContext = createContext<(() => void) | null>(null);

export function SaveNowProvider({
  saveNow,
  children
}: {
  saveNow: () => void;
  children: ReactNode;
}) {
  return (
    <SaveNowContext.Provider value={saveNow}>
      {children}
    </SaveNowContext.Provider>
  );
}

// Shared field-array behaviour for every resume section. Wraps useFieldArray so:
//  - add() appends an empty item and saves right away.
//  - removeItem() removes optimistically, saves right away, and shows an Undo
//    toast that restores the item (and re-saves).
// Delete is deliberate, so it saves now rather than on the text debounce; Undo
// beats a confirm dialog for low-stakes list items.
export function useResumeSection<
  TName extends ArrayPath<TResumeEditFormValues>
>(
  name: TName,
  label: string,
  makeEmpty: () => FieldArray<TResumeEditFormValues, TName>
) {
  const { control, getValues, setValue } =
    useFormContext<TResumeEditFormValues>();
  const saveNow = useContext(SaveNowContext);
  const { fields, append, replace } = useFieldArray({ control, name });

  // setValue is generically typed to a leaf path; the array-path call needs a
  // loose signature. Cast once here rather than at each call site.
  const setArrayValue = setValue as unknown as (
    n: string,
    v: unknown,
    o?: { shouldDirty?: boolean }
  ) => void;

  // Write the whole array to BOTH the rendered list (replace → keeps
  // useFieldArray's `fields` in sync) AND the form values (setValue → the source
  // the preview and autosave read). In this form, useFieldArray's own remove/
  // replace updated the visible list but left getValues()/watch() stale, so a
  // deleted item survived into the preview and the save. setValue writes the
  // values directly, so both stay consistent.
  const setArray = (arr: FieldArray<TResumeEditFormValues, TName>[]) => {
    replace(arr);
    setArrayValue(name, arr, { shouldDirty: true });
  };

  const add = () => {
    append(makeEmpty());
    saveNow?.();
  };

  const removeItem = (index: number) => {
    const current = (getValues(name) ?? []) as FieldArray<
      TResumeEditFormValues,
      TName
    >[];
    const next = current.filter((_, i) => i !== index);

    setArray(next);
    saveNow?.();
    toast(`${label} removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setArray(current); // restore the full pre-delete array
          saveNow?.();
        }
      }
    });
  };

  return { fields, add, removeItem };
}
