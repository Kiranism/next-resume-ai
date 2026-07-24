import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { ReactNode } from 'react';
import { RichText } from './rich-text';

const tw = createTw({ theme: { extend: {} } });

const TEAL = '#2b96a8';
const HEAD = '#1a1a1a';
const INK = '#2f2f2f';
const MUTED = '#6b6b6b';
const RULE = '#bdbdbd';
const BOLD = 'Helvetica-Bold';
const OBLIQUE = 'Helvetica-Oblique';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const fmt = (iso?: string) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]}. ${m[1]}`;
};

const range = (start?: string, end?: string) => {
  const a = fmt(start);
  const b = end ? fmt(end) : start ? 'Present' : '';
  if (a && b) return `${a} - ${b}`;
  return a || b || '';
};

// Uppercase for the small-caps look this design uses on roles/subtitles.
const caps = (s?: string | null) => (s || '').toUpperCase();

type TResumeTemplateProps = { formData: TResumeEditFormValues };

// Section header: bold title followed by a hairline rule to the right margin.
const Section = ({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={tw('mb-4')} minPresenceAhead={40}>
    <View style={tw('flex flex-row items-center mb-3')}>
      <Text style={[tw('text-[15px]'), { fontFamily: BOLD, color: HEAD }]}>
        {title}
      </Text>
      <View
        style={[tw('flex-1 ml-3'), { borderTopWidth: 1, borderColor: RULE }]}
      />
    </View>
    {children}
  </View>
);

// Left-bold / right-teal-italic header row used by every entry.
const EntryHead = ({
  left,
  right
}: {
  left: string;
  right?: string | null;
}) => (
  <View style={tw('flex flex-row justify-between items-baseline')}>
    <Text
      style={[tw('text-[11px] flex-1 pr-3'), { fontFamily: BOLD, color: HEAD }]}
    >
      {left}
    </Text>
    {right ? (
      <Text
        style={[
          tw('text-[9px] shrink-0'),
          { fontFamily: OBLIQUE, color: TEAL }
        ]}
      >
        {right}
      </Text>
    ) : null}
  </View>
);

// Small-caps subrow: role/degree on the left, italic dates on the right.
const SubRow = ({ left, right }: { left: string; right?: string }) => (
  <View style={tw('flex flex-row justify-between items-baseline mb-2')}>
    <Text
      style={[
        tw('text-[8.5px] flex-1 pr-3'),
        { color: MUTED, letterSpacing: 0.4 }
      ]}
    >
      {left}
    </Text>
    {right ? (
      <Text
        style={[
          tw('text-[8.5px] shrink-0'),
          { fontFamily: OBLIQUE, color: MUTED }
        ]}
      >
        {right}
      </Text>
    ) : null}
  </View>
);

const SkillRow = ({ label, value }: { label: string; value: string }) => (
  <View style={tw('flex flex-row mb-1')}>
    <Text
      style={[
        tw('w-[52px] text-[10px] pr-1'),
        { fontFamily: BOLD, color: HEAD }
      ]}
    >
      {label}
    </Text>
    <Text
      style={[tw('flex-1 pl-1 text-[10px] leading-relaxed'), { color: INK }]}
    >
      {value}
    </Text>
  </View>
);

export default function ResumeTemplateNine({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const fullName = `${pd?.fname ?? 'First Name'} ${pd?.lname ?? 'Last Name'}`;

  // Teal subtitle: the job role only.
  const subtitle = pd?.resume_job_title ?? '';

  const contactLine = [
    pd?.phone,
    pd?.email,
    pd?.website,
    pd?.github,
    pd?.linkedin
  ]
    .filter(Boolean)
    .join('    |    ');

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
  const hasTechSkills =
    (!hidden.includes('skills') && skillsList) ||
    (!hidden.includes('tools') && toolsList) ||
    (!hidden.includes('languages') && languagesList);

  const bodyStyle = [tw('text-[10px] leading-relaxed'), { color: INK }];

  return (
    <Document>
      <Page size='A4' style={[tw('px-12 pt-10 pb-14'), { color: INK }]}>
        {/* Centered header */}
        <View style={tw('items-center mb-5')}>
          <Text style={[tw('text-[32px] leading-none'), { color: '#4a4a4a' }]}>
            {fullName}
          </Text>
          {subtitle ? (
            <Text
              style={[
                tw('text-[9px] text-center mt-2'),
                { color: TEAL, fontFamily: BOLD, letterSpacing: 0.6 }
              ]}
            >
              {caps(subtitle)}
            </Text>
          ) : null}
          {contactLine ? (
            <Text style={[tw('text-[9px] text-center mt-2'), { color: MUTED }]}>
              {contactLine}
            </Text>
          ) : null}
        </View>

        {!hidden.includes('summary') && summary ? (
          <Section title='Summary'>
            <Text style={bodyStyle}>{summary}</Text>
          </Section>
        ) : null}

        {hasTechSkills ? (
          <Section title='Technical Skills'>
            {!hidden.includes('skills') && skillsList ? (
              <SkillRow label='Skills' value={skillsList} />
            ) : null}
            {!hidden.includes('tools') && toolsList ? (
              <SkillRow label='Tools' value={toolsList} />
            ) : null}
            {!hidden.includes('languages') && languagesList ? (
              <SkillRow label='Languages' value={languagesList} />
            ) : null}
          </Section>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section title='Work Experience'>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-2.5')} wrap={false}>
                <EntryHead left={caps(job?.employer)} right={job?.city} />
                <SubRow
                  left={caps(job?.jobTitle)}
                  right={range(job?.startDate, job?.endDate)}
                />
                <RichText
                  content={job?.description}
                  textStyle={bodyStyle}
                  gap={tw('mb-0.5')}
                />
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('projects') && projects.length > 0 ? (
          <Section title='Projects'>
            {projects.map((proj, i) => (
              <View key={i} style={tw('mb-2.5')} wrap={false}>
                <EntryHead
                  left={proj?.name ?? ''}
                  right={proj?.link ? 'View Project' : ''}
                />
                <View style={tw('mt-2')}>
                  <RichText
                    content={proj?.description}
                    textStyle={bodyStyle}
                    gap={tw('mb-0.5')}
                  />
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section title='Education'>
            {educations.map((edu, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <EntryHead left={edu?.school ?? ''} right={edu?.city} />
                <SubRow
                  left={caps(
                    [edu?.degree, edu?.field].filter(Boolean).join(' in ')
                  )}
                  right={range(edu?.startDate, edu?.endDate)}
                />
                {edu?.description ? (
                  <RichText
                    content={edu.description}
                    textStyle={bodyStyle}
                    gap={tw('mb-0.5')}
                  />
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {/* Footer: name · Résumé · page (repeats on every page) */}
        <Text
          fixed
          style={[
            tw('absolute bottom-6 left-0 right-0 text-center text-[8px]'),
            { color: MUTED, letterSpacing: 0.5 }
          ]}
          render={({ pageNumber }) =>
            caps(`${fullName}  ·  Résumé  ·  ${pageNumber}`)
          }
        />
      </Page>
    </Document>
  );
}
