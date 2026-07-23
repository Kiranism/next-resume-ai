import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { ReactNode } from 'react';

const tw = createTw({ theme: { extend: {} } });

const INK = '#1a1a1a';
const MUTED = '#555555';
const RULE = '#111111';

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

// Letter-spaced caps label used down the left column of every section.
const spaced = (label: string) => label.toUpperCase().split('').join(' ');

type TResumeTemplateProps = { formData: TResumeEditFormValues };

// A section is a two-column row: fixed-width label on the left, content right,
// with a hairline rule above it.
const Section = ({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) => (
  <View minPresenceAhead={40}>
    <View style={[tw('mt-3 mb-2'), { borderTopWidth: 1, borderColor: RULE }]} />
    <View style={tw('flex flex-row')}>
      <Text style={[tw('w-[92px] text-[7px] pt-0.5 pr-2'), { color: INK }]}>
        {spaced(label)}
      </Text>
      <View style={tw('flex-1')}>{children}</View>
    </View>
  </View>
);

const Bullet = ({ text }: { text: string }) => (
  <View style={tw('flex flex-row mb-0.5')}>
    <Text style={[tw('text-[9.5px] w-3'), { color: MUTED }]}>•</Text>
    <Text style={[tw('text-[9.5px] flex-1 leading-relaxed'), { color: INK }]}>
      {text}
    </Text>
  </View>
);

export default function ResumeTemplateSeven({
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

  const fullName = `${pd?.fname ?? 'First Name'} ${pd?.lname ?? 'Last Name'}`;
  const contactLine = [
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.phone,
    pd?.email
  ]
    .filter(Boolean)
    .join(', ');
  const linksLine = [pd?.linkedin, pd?.github, pd?.website]
    .filter(Boolean)
    .join(', ');

  return (
    <Document>
      <Page size='A4' style={[tw('px-14 py-10'), { color: INK }]}>
        {/* Centered header */}
        <View style={tw('mb-1 items-center')}>
          <Text style={tw('text-[19px] text-center')}>
            {fullName}
            {pd?.resume_job_title ? `, ${pd.resume_job_title}` : ''}
          </Text>
          {contactLine ? (
            <Text
              style={[tw('text-[9px] text-center mt-1.5'), { color: MUTED }]}
            >
              {contactLine}
            </Text>
          ) : null}
          {linksLine ? (
            <Text
              style={[tw('text-[9px] text-center mt-0.5'), { color: MUTED }]}
            >
              {linksLine}
            </Text>
          ) : null}
        </View>

        {!hidden.includes('summary') && summary ? (
          <Section label='Profile'>
            <Text style={tw('text-[9.5px] leading-relaxed')}>{summary}</Text>
          </Section>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section label='Experience'>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-2.5')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text style={tw('text-[11px] flex-1 pr-2')}>
                    {job?.jobTitle ?? ''}
                    {job?.employer ? `  —  ${job.employer}` : ''}
                  </Text>
                  {job?.city ? (
                    <Text style={[tw('text-[8px] shrink-0'), { color: MUTED }]}>
                      {job.city}
                    </Text>
                  ) : null}
                </View>
                {range(job?.startDate, job?.endDate) ? (
                  <Text style={[tw('text-[8px] mb-1'), { color: MUTED }]}>
                    {range(job?.startDate, job?.endDate)}
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
          <Section label='Projects'>
            {projects.map((proj, i) => (
              <View key={i} style={tw('mb-2.5')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text style={tw('text-[11px] flex-1 pr-2')}>
                    {proj?.name ?? ''}
                  </Text>
                  {proj?.link ? (
                    <Text style={[tw('text-[8px] shrink-0'), { color: MUTED }]}>
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
          <Section label='Education'>
            {educations.map((edu, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <View
                  style={tw('flex flex-row justify-between items-baseline')}
                >
                  <Text style={tw('text-[11px] flex-1 pr-2')}>
                    {edu?.degree ?? ''}
                    {edu?.field ? ` in ${edu.field}` : ''}
                    {edu?.school ? `  —  ${edu.school}` : ''}
                  </Text>
                  {range(edu?.startDate, edu?.endDate) ? (
                    <Text style={[tw('text-[8px] shrink-0'), { color: MUTED }]}>
                      {range(edu?.startDate, edu?.endDate)}
                    </Text>
                  ) : null}
                </View>
                {bullets(edu?.description).map((b, j) => (
                  <Bullet key={j} text={b} />
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {!hidden.includes('skills') && skills.length > 0 ? (
          <Section label='Skills'>
            <Text style={tw('text-[9.5px] leading-relaxed')}>
              {skills
                .map((s) => s.skill_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Section>
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <Section label='Tools'>
            <Text style={tw('text-[9.5px] leading-relaxed')}>
              {tools
                .map((t) => t.tool_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Section>
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <Section label='Languages'>
            <View style={tw('flex flex-row flex-wrap')}>
              {languages.map((l, i) => (
                <View key={i} style={tw('flex flex-row w-1/2 pr-3 mb-0.5')}>
                  <Text style={tw('text-[9.5px] flex-1')}>{l.lang_name}</Text>
                  {l.proficiency_level ? (
                    <Text
                      style={[tw('text-[9.5px] shrink-0'), { color: MUTED }]}
                    >
                      {l.proficiency_level}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
