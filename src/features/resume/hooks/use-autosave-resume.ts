'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { type TResumeEditFormValues } from '@/features/resume/utils/form-schema';
import { useUpdateResume, useUploadPreviewImage } from '../api';
import { capturePreviewBase64 } from '../utils/capture-preview';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

const DATA_DEBOUNCE_MS = 1000;
const PREVIEW_DEBOUNCE_MS = 3000;

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
  const { mutateAsync: uploadPreviewImage } = useUploadPreviewImage();

  const [state, setState] = useState<AutosaveState>('idle');

  const lastSavedRef = useRef<string | null>(null);
  const dataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePreview = useCallback(
    (resumeId: string) => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(async () => {
        const image = await capturePreviewBase64();
        if (image) {
          uploadPreviewImage({ resumeId, image }).catch(() => {
            // Thumbnail refresh is best-effort; data is already saved.
          });
        }
      }, PREVIEW_DEBOUNCE_MS);
    },
    [uploadPreviewImage]
  );

  // Writes the current form values (skips only if unchanged since last save).
  const persist = async () => {
    const values = form.getValues();
    if (!values.resume_id) return;

    const key = JSON.stringify(values);
    if (key === lastSavedRef.current) return; // nothing changed since last save

    setState('saving');
    try {
      await updateResume({ id: values.resume_id, ...values });
      lastSavedRef.current = key;
      setState('saved');
      schedulePreview(values.resume_id);
    } catch (error) {
      console.error('Autosave failed:', error);
      setState('error');
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
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [form]);

  return { autosaveState: state, saveNow };
}
