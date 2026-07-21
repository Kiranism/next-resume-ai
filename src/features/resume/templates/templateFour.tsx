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
  // minPresenceAhead keeps a header from being orphaned at the bottom of a page.
  <View style={tw('border-b border-accent mb-2 pb-1')} minPresenceAhead={24}>
    <Text style={tw('text-base font-bold text-primary')}>{children}</Text>
  </View>
);

const BulletPoint = ({ text }: { text: string }) => (
  <View style={tw('flex flex-row items-start gap-2')}>
    <Text style={tw('text-accent text-[9px]')}>•</Text>
    <Text style={tw('text-[10px] flex-1 leading-relaxed text-secondary')}>
      {text}
    </Text>
  </View>
);

// "2021-01-01 – 2023-05-01", "2021-01-01 – Present", or a single date.
const dateRange = (start?: string, end?: string) => {
  if (start && !end) return `${start} – Present`;
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
};

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
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactItems = [
    pd?.phone,
    pd?.email,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size='A4' style={tw('px-12 py-10')}>
        {/* Header */}
        <View style={tw('mb-5 text-center')}>
          <Text style={tw('text-[26px] font-bold text-primary leading-none')}>
            {pd?.fname ?? ''} {pd?.lname ?? ''}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-[11px] text-secondary mt-1.5')}>
              {pd.resume_job_title}
            </Text>
          ) : null}
          {contactItems.length > 0 ? (
            <View
              style={tw(
                'flex flex-row flex-wrap justify-center gap-x-2 gap-y-1 mt-1.5'
              )}
            >
              {contactItems.map((item, i) => (
                <Text key={i} style={tw('text-[9px] text-muted')}>
                  {i > 0 ? '·  ' : ''}
                  {item}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {!hidden.includes('skills') && skills.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Technical Skills</SectionTitle>
            <Text style={tw('text-[10px] leading-relaxed text-secondary')}>
              {skills.join(', ')}
            </Text>
          </View>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Work Experience</SectionTitle>
            <View>
              {jobs.map((job, index) => (
                <View key={index} wrap={false} style={tw('mb-3')}>
                  <View style={tw('flex flex-row items-baseline gap-3')}>
                    <Text
                      style={tw('flex-1 text-[11px] font-bold text-primary')}
                    >
                      {job?.employer ?? ''}
                    </Text>
                    {job?.startDate || job?.endDate ? (
                      <Text style={tw('shrink-0 text-[9px] text-muted')}>
                        {dateRange(job?.startDate, job?.endDate)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={tw('text-[10px] font-medium text-secondary')}>
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

        {!hidden.includes('projects') && projects.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Projects</SectionTitle>
            <View>
              {projects.map((proj, index) => (
                <View key={index} wrap={false} style={tw('mb-3')}>
                  <View style={tw('flex flex-row items-baseline gap-3')}>
                    <Text
                      style={tw('flex-1 text-[11px] font-bold text-primary')}
                    >
                      {proj?.name ?? ''}
                    </Text>
                    {proj?.link ? (
                      <Text style={tw('shrink-0 text-[9px] text-muted')}>
                        {proj.link}
                      </Text>
                    ) : null}
                  </View>
                  {proj?.description ? (
                    <View style={tw('mt-1')}>
                      <BulletPoint text={proj.description} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Tools</SectionTitle>
            <Text style={tw('text-[10px] leading-relaxed text-secondary')}>
              {tools.join(', ')}
            </Text>
          </View>
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Education</SectionTitle>
            <View>
              {educations.map((edu, index) => (
                <View key={index} wrap={false} style={tw('mb-2')}>
                  <View style={tw('flex flex-row items-baseline gap-3')}>
                    <Text
                      style={tw('flex-1 text-[11px] font-bold text-primary')}
                    >
                      {edu?.degree ?? ''}
                      {edu?.field ? ` in ${edu.field}` : ''}
                    </Text>
                    {edu?.startDate || edu?.endDate ? (
                      <Text style={tw('shrink-0 text-[9px] text-muted')}>
                        {dateRange(edu?.startDate, edu?.endDate)}
                      </Text>
                    ) : null}
                  </View>
                  {edu?.school ? (
                    <Text style={tw('text-[9px] text-muted mt-0.5')}>
                      {edu.school}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <View style={tw('mb-5')}>
            <SectionTitle>Languages</SectionTitle>
            <Text style={tw('text-[10px] leading-relaxed text-secondary')}>
              {languages.join(', ')}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
