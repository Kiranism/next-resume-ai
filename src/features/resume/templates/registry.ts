import { ComponentType } from 'react';
import { TResumeEditFormValues } from '../utils/form-schema';
import TemplateOne from './templateOne';
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
    thumbnail: '/templates/templateone.png',
    description: 'Classic two-column layout with a professional look',
    component: TemplateOne
  },
  'template-two': {
    id: 'template-two',
    name: 'Modern Clean',
    thumbnail: '/templates/templatetwo.png',
    description: 'Modern single-column design with clean typography',
    component: TemplateTwo
  },
  'template-three': {
    id: 'template-three',
    name: 'Minimalist',
    thumbnail: '/templates/default.png',
    description: 'Clean and minimal design with subtle accents',
    component: TemplateThree
  },
  'template-four': {
    id: 'template-four',
    name: 'Creative Professional',
    thumbnail: '/templates/default.png',
    description: 'Modern design with creative layout and color accents',
    component: TemplateFour
  },
  'template-five': {
    id: 'template-five',
    name: 'ATS Friendly',
    thumbnail: '/templates/default.png',
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
