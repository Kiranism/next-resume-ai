import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TemplateState {
  selectedTemplate: string;
  currentTemplate: string;
  setSelectedTemplate: (template: string) => void;
  setCurrentTemplate: (template: string) => void;
  applyTemplate: (template: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      selectedTemplate: 'template-five',
      currentTemplate: 'template-five',
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setCurrentTemplate: (template) => set({ currentTemplate: template }),
      applyTemplate: (template) =>
        set({ selectedTemplate: template, currentTemplate: template })
    }),
    {
      name: 'template-storage'
    }
  )
);
