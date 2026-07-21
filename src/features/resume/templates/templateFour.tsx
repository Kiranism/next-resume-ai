import { ReactNode } from 'react';
import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

const tw = createTw({
  theme: {
    extend: {
      colors: {
        primary: '#1a1a1a',
        secondary: '#4a4a4a',
        accent: '#666666',
        muted: '#808080',
        surface: '#f5f5f5'
      }
    }
  }
});

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <View style={tw('border-b border-accent mb-2 pb-1')}>
    <Text style={tw('text-base font-bold text-primary')}>{children}</Text>
  </View>
);

const BulletPoint = ({ text }: { text: string }) => (
  <View style={tw('flex flex-row items-start gap-2')}>
    <Text style={tw('text-accent text-xs')}>•</Text>
    <Text style={tw('text-sm flex-1 leading-relaxed')}>{text}</Text>
  </View>
);

export default function TemplateFour({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const skills = (formData?.skills ?? [])
    .map((s) => s.skill_name)
    .filter(Boolean);
  const tools = (formData?.tools ?? []).map((t) => t.tool_name).filter(Boolean);
  const languages = (formData?.languages ?? [])
    .map((l) => l.lang_name)
    .filter(Boolean);
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];

  const contact = [
    pd?.phone,
    pd?.email,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ]
    .filter(Boolean)
    .join('   ·   ');

  return (
    <Document>
      <Page size='A4' style={tw('p-10')}>
        {/* Header */}
        <View style={tw('mb-6 text-center')}>
          <Text style={tw('text-3xl font-bold leading-none')}>
            {pd?.fname ?? ''} {pd?.lname ?? ''}
          </Text>
          {contact ? (
            <Text style={tw('text-xs text-muted mt-2')}>{contact}</Text>
          ) : null}
        </View>

        {skills.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Technical Skills</SectionTitle>
            <Text style={tw('text-sm leading-relaxed')}>
              {skills.join(', ')}
            </Text>
          </View>
        ) : null}

        {jobs.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Work Experience</SectionTitle>
            <View style={tw('flex flex-col gap-3')}>
              {jobs.map((job, index) => (
                <View key={index} wrap={false}>
                  <View
                    style={tw('flex flex-row justify-between items-baseline')}
                  >
                    <Text style={tw('text-sm font-bold text-primary')}>
                      {job?.employer ?? ''}
                    </Text>
                    {job?.startDate || job?.endDate ? (
                      <Text style={tw('text-xs text-muted')}>
                        {job?.startDate ?? ''} – {job?.endDate ?? ''}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={tw('text-sm font-bold text-secondary')}>
                    {job?.jobTitle ?? ''}
                  </Text>
                  {job?.description ? (
                    <View style={tw('mt-1')}>
                      <BulletPoint text={job.description} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {tools.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Tools</SectionTitle>
            <Text style={tw('text-sm leading-relaxed')}>
              {tools.join(', ')}
            </Text>
          </View>
        ) : null}

        {educations.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Education</SectionTitle>
            <View style={tw('flex flex-col gap-2')}>
              {educations.map((edu, index) => (
                <View key={index}>
                  <View
                    style={tw('flex flex-row justify-between items-baseline')}
                  >
                    <Text style={tw('text-sm font-bold text-primary')}>
                      {edu?.degree ?? ''}
                      {edu?.field ? ` in ${edu.field}` : ''}
                    </Text>
                    {edu?.startDate || edu?.endDate ? (
                      <Text style={tw('text-xs text-muted')}>
                        {edu?.startDate ?? ''} – {edu?.endDate ?? ''}
                      </Text>
                    ) : null}
                  </View>
                  {edu?.school ? (
                    <Text style={tw('text-xs text-muted')}>{edu.school}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {languages.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Languages</SectionTitle>
            <Text style={tw('text-sm leading-relaxed')}>
              {languages.join(', ')}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
