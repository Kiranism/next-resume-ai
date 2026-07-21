import { ComponentType } from 'react';
import { Font } from '@react-pdf/renderer';
import { TResumeEditFormValues } from '../utils/form-schema';
import TemplateOne from './templateOne';

// Disable hyphenation across all resume PDFs — mid-word hyphens (and stray
// hyphens where separators wrap) look unprofessional on a resume. Words wrap
// whole instead. Runs once when the registry (and thus the renderer) loads.
Font.registerHyphenationCallback((word) => [word]);
import TemplateTwo from './templateTwo';
import TemplateThree from './templateThree';
import TemplateFour from './templateFour';
import TemplateFive from './templateFive';

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

const templateRegistry: Record<string, TemplateConfig> = {
  'template-one': {
    id: 'template-one',
    name: 'Professional Split',
    thumbnail: '/templates/template-one.png',
    description: 'Classic two-column layout with a professional look',
    component: TemplateOne
  },
  'template-two': {
    id: 'template-two',
    name: 'Modern Clean',
    thumbnail: '/templates/template-two.png',
    description: 'Modern single-column design with clean typography',
    component: TemplateTwo
  },
  'template-three': {
    id: 'template-three',
    name: 'Minimalist',
    thumbnail: '/templates/template-three.png',
    description: 'Clean and minimal design with subtle accents',
    component: TemplateThree
  },
  'template-four': {
    id: 'template-four',
    name: 'Creative Professional',
    thumbnail: '/templates/template-four.png',
    description: 'Modern design with creative layout and color accents',
    component: TemplateFour
  },
  'template-five': {
    id: 'template-five',
    name: 'ATS Friendly',
    thumbnail: '/templates/template-five.png',
    description:
      'Single-column, parser-safe layout optimized for ATS keyword scanning',
    component: TemplateFive
  }
};

export const getTemplate = (templateId: string): TemplateConfig => {
  return templateRegistry[templateId];
};

export const getAllTemplates = (): TemplateConfig[] => {
  return Object.values(templateRegistry);
};
