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
import TemplateSix from './templateSix';
import TemplateSeven from './templateSeven';
import TemplateEight from './templateEight';

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

// Order here is the order shown in the picker (getAllTemplates = Object.values).
// ATS Friendly is first and is the default; ids are unchanged so saved resumes
// keep pointing at the right template.
const templateRegistry: Record<string, TemplateConfig> = {
  'template-five': {
    id: 'template-five',
    name: 'ATS Friendly',
    thumbnail: '/templates/template-five.png',
    description:
      'Single-column, parser-safe layout optimized for ATS keyword scanning',
    component: TemplateFive
  },
  'template-six': {
    id: 'template-six',
    name: 'Executive Blue',
    thumbnail: '/templates/template-six.png',
    description:
      'Single-column with blue accent headings, ideal for senior roles',
    component: TemplateSix
  },
  'template-seven': {
    id: 'template-seven',
    name: 'Classic Timeline',
    thumbnail: '/templates/template-seven.png',
    description: 'Centered header with a left label column and ruled sections',
    component: TemplateSeven
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
  },
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
  }
};

export const getTemplate = (templateId: string): TemplateConfig => {
  return templateRegistry[templateId];
};

export const getAllTemplates = (): TemplateConfig[] => {
  return Object.values(templateRegistry);
};
