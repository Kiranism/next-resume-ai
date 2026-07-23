import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { ReactNode } from 'react';

const tw = createTw({ theme: { extend: {} } });

// Standard built-in PDF serif fonts — no external font file, so the text layer
// stays selectable and ATS-parseable.
const SERIF = 'Times-Roman';
const SERIF_BOLD = 'Times-Bold';
const INK = '#1a1a1a';
const MUTED = '#4a4a4a';

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

const fmt = (iso?: string) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const range = (start?: string, end?: string) => {
  const a = fmt(start);
  const b = end ? fmt(end) : start ? 'Present' : '';
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
};

const bullets = (text?: string | null) =>
  (text || '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

type TResumeTemplateProps = { formData: TResumeEditFormValues };

const Section = ({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={tw('mb-3')}>
    <Text
      style={[
        tw('text-[13px] pb-1 mb-2'),
        { fontFamily: SERIF_BOLD, borderBottomWidth: 1, borderColor: INK }
      ]}
      minPresenceAhead={30}
    >
      {title}
    </Text>
    {children}
  </View>
);

const Bullet = ({ text }: { text: string }) => (
  <View style={tw('flex flex-row mb-0.5 pl-3')}>
    <Text style={tw('text-[10px] w-3')}>•</Text>
    <Text style={tw('text-[10px] flex-1 leading-relaxed')}>{text}</Text>
  </View>
);

// A "label: value" row, e.g. "Skills:  React, Node, ...".
const ProficiencyRow = ({ label, value }: { label: string; value: string }) => (
  <View style={tw('flex flex-row mb-1.5')}>
    <Text
      style={[tw('w-[110px] text-[10px] pr-2'), { fontFamily: SERIF_BOLD }]}
    >
      {label}
    </Text>
    <Text style={tw('flex-1 text-[10px] leading-relaxed')}>{value}</Text>
  </View>
);

export default function ResumeTemplateEight({
  formData
}: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactLine1 = [
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.phone
  ]
    .filter(Boolean)
    .join('  •  ');
  const contactLine2 = [pd?.email, pd?.linkedin, pd?.github, pd?.website]
    .filter(Boolean)
    .join('  •  ');

  const skillsList = skills
    .map((s) => s.skill_name)
    .filter(Boolean)
    .join(', ');
  const toolsList = tools
    .map((t) => t.tool_name)
    .filter(Boolean)
    .join(', ');
  const languagesList = languages
    .map((l) =>
      l.proficiency_level
        ? `${l.lang_name} (${l.proficiency_level})`
        : l.lang_name
    )
    .filter(Boolean)
    .join(', ');

  const hasProficiencies =
    (!hidden.includes('skills') && skillsList) ||
    (!hidden.includes('tools') && toolsList) ||
    (!hidden.includes('languages') && languagesList);

  return (
    <Document>
      <Page
        size='A4'
        style={[tw('px-12 py-10'), { fontFamily: SERIF, color: INK }]}
      >
        {/* Header */}
        <View style={tw('flex flex-row justify-between items-start mb-4')}>
          <View style={tw('w-[56%] pr-3')}>
            <Text style={[tw('text-[20px]'), { fontFamily: SERIF_BOLD }]}>
              {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
            </Text>
            {pd?.resume_job_title ? (
              <Text style={tw('text-[14px] mt-1')}>{pd.resume_job_title}</Text>
            ) : null}
          </View>
          <View style={tw('flex flex-col items-end w-[44%]')}>
            {contactLine1 ? (
              <Text style={[tw('text-[9px] text-right'), { color: MUTED }]}>
                {contactLine1}
              </Text>
            ) : null}
            {contactLine2 ? (
              <Text
                style={[tw('text-[9px] text-right mt-0.5'), { color: MUTED }]}
              >
                {contactLine2}
              </Text>
            ) : null}
          </View>
        </View>

        {!hidden.includes('summary') && summary ? (
          <Text style={tw('text-[10px] leading-relaxed mb-4')}>{summary}</Text>
        ) : null}

        {hasProficiencies ? (
          <Section title='Technical Proficiencies'>
            {!hidden.includes('skills') && skillsList ? (
              <ProficiencyRow label='Skills:' value={skillsList} />
            ) : null}
            {!hidden.includes('tools') && toolsList ? (
              <ProficiencyRow label='Tools:' value={toolsList} />
            ) : null}
            {!hidden.includes('languages') && languagesList ? (
              <ProficiencyRow label='Languages:' value={languagesList} />
            ) : null}
          </Section>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section title='Professional Experience'>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-3')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text
                    style={[
                      tw('text-[11px] flex-1 pr-3'),
                      { fontFamily: SERIF_BOLD }
                    ]}
                  >
                    {job?.employer ?? ''}
                    {job?.city ? `, ${job.city}` : ''}
                  </Text>
                  {range(job?.startDate, job?.endDate) ? (
                    <Text
                      style={[tw('text-[10px] shrink-0'), { color: MUTED }]}
                    >
                      {range(job?.startDate, job?.endDate)}
                    </Text>
                  ) : null}
                </View>
                {job?.jobTitle ? (
                  <Text
                    style={[tw('text-[10px] mb-1'), { fontFamily: SERIF_BOLD }]}
                  >
                    {job.jobTitle}
                  </Text>
                ) : null}
                {bullets(job?.description).map((b, j) => (
                  <Bullet key={j} text={b} />
                ))}
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
                    style={[
                      tw('text-[11px] flex-1 pr-3'),
                      { fontFamily: SERIF_BOLD }
                    ]}
                  >
                    {proj?.name ?? ''}
                  </Text>
                  {proj?.link ? (
                    <Text style={[tw('text-[9px] shrink-0'), { color: MUTED }]}>
                      {proj.link}
                    </Text>
                  ) : null}
                </View>
                {bullets(proj?.description).map((b, j) => (
                  <Bullet key={j} text={b} />
                ))}
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
                    style={[
                      tw('text-[11px] flex-1 pr-3'),
                      { fontFamily: SERIF_BOLD }
                    ]}
                  >
                    {edu?.degree ?? ''}
                    {edu?.field ? ` in ${edu.field}` : ''}
                  </Text>
                  {range(edu?.startDate, edu?.endDate) ? (
                    <Text
                      style={[tw('text-[10px] shrink-0'), { color: MUTED }]}
                    >
                      {range(edu?.startDate, edu?.endDate)}
                    </Text>
                  ) : null}
                </View>
                <Text style={tw('text-[10px]')}>
                  {edu?.school ?? ''}
                  {edu?.city ? `, ${edu.city}` : ''}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
