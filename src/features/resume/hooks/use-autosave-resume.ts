'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { type TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import { useUpdateResume } from '../api';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

const DATA_DEBOUNCE_MS = 1000;

// Background auto-save for the resume editor. Watches the form and persists
// changes after a short debounce; manual edits and AI-driven edits (which go
// through form.reset) both flow through here. `saveNow` forces an immediate
// save (used right after an AI edit or an Undo so the change lands instantly).
//
// NOTE: saving is intentionally NOT gated on strict form validity. The resume
// is stored as loose jsonb, and normal resumes are "invalid" per the strict
// form schema (e.g. a current job with an empty endDate, a blank city). Gating
// on validity silently dropped every save. The strict schema drives field-level
// UX only; the update endpoint accepts a lenient shape.
export function useAutosaveResume(
  form: UseFormReturn<TResumeEditFormValues, any, undefined>
) {
  const { mutateAsync: updateResume } = useUpdateResume();

  const [state, setState] = useState<AutosaveState>('idle');

  const lastSavedRef = useRef<string | null>(null);
  const dataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // In-flight guard: never let two saves race (a slow save could otherwise land
  // AFTER a newer one and clobber it). If a change arrives mid-save, remember it
  // and re-run once the current save settles.
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  // Writes the current form values (skips only if unchanged since last save).
  const persist = async () => {
    const values = form.getValues();
    if (!values.resume_id) return;

    const key = JSON.stringify(values);
    if (key === lastSavedRef.current) return; // nothing changed since last save

    if (inFlightRef.current) {
      pendingRef.current = true; // save the latest state after this one finishes
      return;
    }

    inFlightRef.current = true;
    setState('saving');
    // Retry a few times so a transient network/DB blip doesn't SILENTLY drop a
    // change — the failure mode where a deleted item reappears on refresh
    // because its save never landed.
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await updateResume({ id: values.resume_id, ...values });
          lastSavedRef.current = key;
          setState('saved');
          break;
        } catch (error) {
          if (attempt === 2) {
            console.error('Autosave failed after 3 attempts:', error);
            setState('error');
          } else {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }
    } finally {
      inFlightRef.current = false;
    }

    // A change (e.g. another delete) landed while we were saving — persist the
    // latest values now so nothing is left unsaved.
    if (pendingRef.current) {
      pendingRef.current = false;
      void persist();
    }
  };
  // Latest-closure ref so the once-only watch subscription always runs current
  // logic without re-subscribing.
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Immediate save (AI edit / undo) — persist right away.
  const saveNow = useCallback(() => {
    if (dataTimerRef.current) clearTimeout(dataTimerRef.current);
    persistRef.current();
  }, []);

  // Seed the baseline so the initial (already-saved) state doesn't re-save, then
  // subscribe once to form changes and debounce a save.
  useEffect(() => {
    lastSavedRef.current = JSON.stringify(form.getValues());

    const subscription = form.watch(() => {
      if (dataTimerRef.current) clearTimeout(dataTimerRef.current);
      dataTimerRef.current = setTimeout(() => {
        persistRef.current();
      }, DATA_DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (dataTimerRef.current) clearTimeout(dataTimerRef.current);
    };
  }, [form]);

  return { autosaveState: state, saveNow };
}
