import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { ReactNode } from 'react';
import { RichText } from './rich-text';

const tw = createTw({ theme: { extend: {} } });

// Muted corporate blue used for the name, headings, titles and bullet markers.
const BLUE = '#2f6bb5';
const INK = '#333333';
const MUTED = '#5b5b5b';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

// "2013-01-01" -> "January 2013". Leaves non-ISO strings untouched.
const fmt = (iso?: string) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const range = (start?: string, end?: string) => {
  const a = fmt(start);
  const b = end ? fmt(end) : start ? 'Present' : '';
  if (a && b) return `${a} — ${b}`;
  return a || b || '';
};

type TResumeTemplateProps = { formData: TResumeEditFormValues };

const Section = ({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={tw('mb-4')}>
    <Text
      style={[tw('text-[15px] mb-2'), { color: BLUE }]}
      minPresenceAhead={30}
    >
      {title}
    </Text>
    {children}
  </View>
);

export default function ResumeTemplateSix({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactLines = [
    [pd?.email, pd?.phone].filter(Boolean).join('  •  '),
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    [pd?.linkedin, pd?.github, pd?.website].filter(Boolean).join('  •  ')
  ].filter(Boolean);

  return (
    <Document>
      <Page size='A4' style={[tw('px-12 py-10'), { color: INK }]}>
        {/* Header */}
        <View style={tw('flex flex-row justify-between items-start mb-4')}>
          <View style={tw('flex-1 pr-4')}>
            <Text style={[tw('text-[23px] leading-tight'), { color: BLUE }]}>
              {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
            </Text>
            {pd?.resume_job_title ? (
              <Text style={[tw('text-[12px] mt-1'), { color: BLUE }]}>
                {pd.resume_job_title}
              </Text>
            ) : null}
          </View>
          {contactLines.length > 0 ? (
            <View style={tw('flex flex-col items-end')}>
              {contactLines.map((line, i) => (
                <Text
                  key={i}
                  style={[tw('text-[9px] text-right mt-0.5'), { color: BLUE }]}
                >
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {!hidden.includes('summary') && summary ? (
          <View style={tw('mb-4')}>
            <RichText
              content={summary}
              textStyle={[tw('text-[10px] leading-relaxed'), { color: INK }]}
              gap={tw('mb-0.5')}
            />
          </View>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section title='Professional Experience'>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-3')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text
                    style={[tw('text-[10px] flex-1 pr-3'), { color: BLUE }]}
                  >
                    {job?.employer ?? ''}
                    {job?.city ? `, ${job.city}` : ''}
                  </Text>
                  {range(job?.startDate, job?.endDate) ? (
                    <Text style={[tw('text-[10px] shrink-0'), { color: BLUE }]}>
                      {range(job?.startDate, job?.endDate)}
                    </Text>
                  ) : null}
                </View>
                {job?.jobTitle ? (
                  <Text style={[tw('text-[10px] mb-1'), { color: BLUE }]}>
                    {job.jobTitle}
                  </Text>
                ) : null}
                <RichText
                  content={job?.description}
                  textStyle={[
                    tw('text-[10px] leading-relaxed'),
                    { color: INK }
                  ]}
                  bulletStyle={[tw('text-[10px]'), { color: BLUE }]}
                  gap={tw('mb-0.5')}
                />
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('projects') && projects.length > 0 ? (
          <Section title='Projects'>
            {projects.map((proj, i) => (
              <View key={i} style={tw('mb-3')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text
                    style={[tw('text-[10px] flex-1 pr-3'), { color: BLUE }]}
                  >
                    {proj?.name ?? ''}
                  </Text>
                  {proj?.link ? (
                    <Text style={[tw('text-[9px] shrink-0'), { color: MUTED }]}>
                      {proj.link}
                    </Text>
                  ) : null}
                </View>
                <RichText
                  content={proj?.description}
                  textStyle={[
                    tw('text-[10px] leading-relaxed'),
                    { color: INK }
                  ]}
                  bulletStyle={[tw('text-[10px]'), { color: BLUE }]}
                  gap={tw('mb-0.5')}
                />
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section title='Education'>
            {educations.map((edu, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text
                    style={[tw('text-[10px] flex-1 pr-3'), { color: BLUE }]}
                  >
                    {edu?.degree ?? ''}
                    {edu?.field ? ` in ${edu.field}` : ''}
                  </Text>
                  {range(edu?.startDate, edu?.endDate) ? (
                    <Text style={[tw('text-[10px] shrink-0'), { color: BLUE }]}>
                      {range(edu?.startDate, edu?.endDate)}
                    </Text>
                  ) : null}
                </View>
                <Text style={[tw('text-[10px]'), { color: INK }]}>
                  {edu?.school ?? ''}
                  {edu?.city ? `, ${edu.city}` : ''}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('skills') && skills.length > 0 ? (
          <Section title='Areas of Expertise'>
            <View style={tw('flex flex-row flex-wrap')}>
              {skills
                .map((s) => s.skill_name)
                .filter(Boolean)
                .map((name, i) => (
                  <View key={i} style={tw('flex flex-row w-1/3 pr-2 mb-1')}>
                    <Text style={[tw('text-[10px] w-3'), { color: BLUE }]}>
                      •
                    </Text>
                    <Text style={[tw('text-[10px] flex-1'), { color: INK }]}>
                      {name}
                    </Text>
                  </View>
                ))}
            </View>
          </Section>
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <Section title='Tools & Technologies'>
            <Text style={[tw('text-[10px] leading-relaxed'), { color: INK }]}>
              {tools
                .map((t) => t.tool_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Section>
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <Section title='Languages'>
            <Text style={[tw('text-[10px] leading-relaxed'), { color: INK }]}>
              {languages
                .map((l) =>
                  l.proficiency_level
                    ? `${l.lang_name} (${l.proficiency_level})`
                    : l.lang_name
                )
                .filter(Boolean)
                .join(',  ')}
            </Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
