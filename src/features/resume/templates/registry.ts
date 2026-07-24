import { ComponentType } from 'react';
import { Font } from '@react-pdf/renderer';
import { TResumeEditFormValues } from '../utils/form-schema';
import TemplateNine from './templateNine';
import TemplateFour from './templateFour';
import TemplateFive from './templateFive';
import TemplateSix from './templateSix';
import TemplateEight from './templateEight';

// Disable hyphenation across all resume PDFs — mid-word hyphens (and stray
// hyphens where separators wrap) look unprofessional on a resume. Words wrap
// whole instead. Runs once when the registry (and thus the renderer) loads.
Font.registerHyphenationCallback((word) => [word]);

export type ResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

export type TemplateConfig = {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  component: ComponentType<ResumeTemplateProps>;
};

// Only ATS-friendly single-column layouts are offered. Order here is the order
// shown in the picker (getAllTemplates = Object.values). ATS Friendly is first
// and is the default.
const DEFAULT_TEMPLATE_ID = 'template-five';

const templateRegistry: Record<string, TemplateConfig> = {
  'template-five': {
    id: 'template-five',
    name: 'ATS Friendly',
    thumbnail: '/templates/template-five.png',
    description:
      'Single-column, parser-safe layout optimized for ATS keyword scanning',
    component: TemplateFive
  },
  'template-nine': {
    id: 'template-nine',
    name: 'Modern Teal',
    thumbnail: '/templates/template-nine.png',
    description:
      'Centered header with teal accents, ruled section headers, and label-value skills',
    component: TemplateNine
  },
  'template-six': {
    id: 'template-six',
    name: 'Executive Blue',
    thumbnail: '/templates/template-six.png',
    description:
      'Single-column with blue accent headings, ideal for senior roles',
    component: TemplateSix
  },
  'template-eight': {
    id: 'template-eight',
    name: 'Elegant Serif',
    thumbnail: '/templates/template-eight.png',
    description: 'Refined serif typography with underlined section headings',
    component: TemplateEight
  },
  'template-four': {
    id: 'template-four',
    name: 'Creative Professional',
    thumbnail: '/templates/template-four.png',
    description: 'Modern design with creative layout and color accents',
    component: TemplateFour
  }
};

// Falls back to the default (ATS Friendly) for unknown ids — e.g. a resume saved
// with a template that has since been removed still renders instead of crashing.
export const getTemplate = (templateId: string): TemplateConfig => {
  return templateRegistry[templateId] ?? templateRegistry[DEFAULT_TEMPLATE_ID];
};

export const getAllTemplates = (): TemplateConfig[] => {
  return Object.values(templateRegistry);
};
