import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { ReactNode } from 'react';

const tw = createTw({ theme: { extend: {} } });

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

// "2021-01-01 – 2023-05-01", "2021-01-01 – Present", or a single date.
const dateRange = (start?: string, end?: string) => {
  if (start && !end) return `${start} – Present`;
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
};

const Section = ({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={tw('mb-3.5')}>
    <Text
      style={tw(
        'text-[10px] font-bold tracking-[1.5px] text-[#111827] border-b border-[#9ca3af] pb-1 mb-2'
      )}
      minPresenceAhead={28}
    >
      {title}
    </Text>
    {children}
  </View>
);

export default function ResumeTemplateFive({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactItems = [
    pd?.email,
    pd?.phone,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size='A4' style={tw('px-12 py-10 text-[#1f2937]')}>
        {/* Header */}
        <View style={tw('mb-4')}>
          <Text style={tw('text-[24px] font-bold text-[#111827] leading-none')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-[11px] text-[#374151] mt-1.5')}>
              {pd.resume_job_title}
            </Text>
          ) : null}
          {contactItems.length > 0 ? (
            <View style={tw('flex flex-row flex-wrap gap-x-2 gap-y-1 mt-1.5')}>
              {contactItems.map((item, i) => (
                <Text key={i} style={tw('text-[9px] text-[#4b5563]')}>
                  {i > 0 ? '|  ' : ''}
                  {item}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {!hidden.includes('summary') && summary ? (
          <Section title='SUMMARY'>
            <Text style={tw('text-[10px] leading-relaxed')}>{summary}</Text>
          </Section>
        ) : null}

        {!hidden.includes('skills') && skills.length > 0 ? (
          <Section title='SKILLS'>
            <Text style={tw('text-[10px] leading-relaxed')}>
              {skills
                .map((s) => s.skill_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Section>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section title='EXPERIENCE'>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-2.5')} wrap={false}>
                <View style={tw('flex flex-row items-baseline gap-3')}>
                  <Text
                    style={tw('flex-1 text-[11px] font-bold text-[#111827]')}
                  >
                    {job?.jobTitle ?? ''}
                    {job?.employer ? `, ${job.employer}` : ''}
                  </Text>
                  {job?.startDate || job?.endDate ? (
                    <Text style={tw('shrink-0 text-[9px] text-[#4b5563]')}>
                      {dateRange(job?.startDate, job?.endDate)}
                    </Text>
                  ) : null}
                </View>
                {job?.city ? (
                  <Text style={tw('text-[9px] text-[#6b7280] mt-0.5')}>
                    {job.city}
                  </Text>
                ) : null}
                {job?.description ? (
                  <Text style={tw('text-[10px] mt-1 leading-relaxed')}>
                    {job.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('projects') && projects.length > 0 ? (
          <Section title='PROJECTS'>
            {projects.map((proj, i) => (
              <View key={i} style={tw('mb-2.5')} wrap={false}>
                <View style={tw('flex flex-row items-baseline gap-3')}>
                  <Text
                    style={tw('flex-1 text-[11px] font-bold text-[#111827]')}
                  >
                    {proj?.name ?? ''}
                  </Text>
                  {proj?.link ? (
                    <Text style={tw('shrink-0 text-[9px] text-[#4b5563]')}>
                      {proj.link}
                    </Text>
                  ) : null}
                </View>
                {proj?.description ? (
                  <Text style={tw('text-[10px] mt-1 leading-relaxed')}>
                    {proj.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section title='EDUCATION'>
            {educations.map((edu, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <View style={tw('flex flex-row items-baseline gap-3')}>
                  <Text
                    style={tw('flex-1 text-[11px] font-bold text-[#111827]')}
                  >
                    {edu?.degree ?? ''}
                    {edu?.field ? ` in ${edu.field}` : ''}
                    {edu?.school ? `, ${edu.school}` : ''}
                  </Text>
                  {edu?.startDate || edu?.endDate ? (
                    <Text style={tw('shrink-0 text-[9px] text-[#4b5563]')}>
                      {dateRange(edu?.startDate, edu?.endDate)}
                    </Text>
                  ) : null}
                </View>
                {edu?.description ? (
                  <Text style={tw('text-[10px] mt-1 leading-relaxed')}>
                    {edu.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <Section title='TOOLS'>
            <Text style={tw('text-[10px] leading-relaxed')}>
              {tools
                .map((t) => t.tool_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Section>
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <Section title='LANGUAGES'>
            <Text style={tw('text-[10px] leading-relaxed')}>
              {languages
                .map((l) => l.lang_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
