import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { RichText } from './rich-text';

const tw = createTw({
  theme: {
    extend: {
      colors: {
        primary: '#1e293b',
        secondary: '#94a3b8',
        accent: '#0ea5e9',
        muted: '#64748b',
        background: '#ffffff'
      }
    }
  }
});

const BOLD = 'Helvetica-Bold';

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

// "2021-01-01 – 2023-05-01", "2021-01-01 – Present", or a single date.
const dateRange = (start?: string, end?: string) => {
  if (start && !end) return `${start} – Present`;
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
};

const Heading = ({ children }: { children: string }) => (
  <Text
    style={[
      tw('text-[11px] text-accent uppercase tracking-[1px] mb-2'),
      { fontFamily: BOLD }
    ]}
    minPresenceAhead={28}
  >
    {children}
  </Text>
);

const BulletedList = ({ items }: { items: { name: string }[] }) => (
  <View>
    {items.map((item, index) => (
      <View style={tw('flex flex-row items-baseline gap-1.5 mb-1')} key={index}>
        <Text style={tw('text-accent text-[9px]')}>{'•'}</Text>
        <Text style={tw('text-[10px] text-primary leading-snug')}>
          {item.name}
        </Text>
      </View>
    ))}
  </View>
);

export default function ResumeTemplateThree({
  formData
}: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactBits = [
    pd?.email,
    pd?.phone,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ].filter(Boolean);

  return (
    <Document>
      <Page size='A4' style={tw('px-10 py-9 bg-background text-primary')}>
        {/* Header */}
        <View style={tw('border-b border-secondary pb-3 mb-4')}>
          <Text
            style={[
              tw('text-[26px] text-primary leading-none'),
              { fontFamily: BOLD }
            ]}
          >
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-[11px] text-accent mt-1.5')}>
              {pd.resume_job_title}
            </Text>
          ) : null}
          {contactBits.length > 0 ? (
            <View style={tw('flex flex-row flex-wrap gap-x-2 gap-y-1 mt-1.5')}>
              {contactBits.map((item, i) => (
                <Text key={i} style={tw('text-[9px] text-muted')}>
                  {i > 0 ? '·  ' : ''}
                  {item}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* Main */}
        <View style={tw('flex flex-row gap-7')}>
          {/* Left column - 70% */}
          <View style={tw('flex flex-[0.68] flex-col')}>
            {!hidden.includes('summary') && pd?.summary ? (
              <View style={tw('mb-4')}>
                <Heading>Summary</Heading>
                <RichText
                  content={pd.summary}
                  textStyle={tw('text-[10px] leading-relaxed text-primary')}
                  gap={tw('mb-0.5')}
                />
              </View>
            ) : null}

            {!hidden.includes('experience') && jobs.length > 0 ? (
              <View style={tw('mb-4')}>
                <Heading>Experience</Heading>
                <View>
                  {jobs.map((job, i) => (
                    <View key={i} wrap={false} style={tw('mb-2.5')}>
                      <View style={tw('flex flex-row items-baseline gap-3')}>
                        <Text
                          style={[
                            tw('flex-1 text-[11px] text-primary'),
                            { fontFamily: BOLD }
                          ]}
                        >
                          {job?.jobTitle ?? ''}
                          {job?.employer ? ` · ${job.employer}` : ''}
                        </Text>
                        {job?.startDate || job?.endDate ? (
                          <Text style={tw('shrink-0 text-[9px] text-muted')}>
                            {dateRange(job?.startDate, job?.endDate)}
                          </Text>
                        ) : null}
                      </View>
                      {job?.description ? (
                        <View style={tw('mt-1')}>
                          <RichText
                            content={job.description}
                            textStyle={tw(
                              'text-[10px] leading-relaxed text-primary'
                            )}
                            gap={tw('mb-0.5')}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {!hidden.includes('projects') && projects.length > 0 ? (
              <View style={tw('mb-4')}>
                <Heading>Projects</Heading>
                <View>
                  {projects.map((proj, i) => (
                    <View key={i} wrap={false} style={tw('mb-2.5')}>
                      <View style={tw('flex flex-row items-baseline gap-3')}>
                        <Text
                          style={[
                            tw('flex-1 text-[11px] text-primary'),
                            { fontFamily: BOLD }
                          ]}
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
                          <RichText
                            content={proj.description}
                            textStyle={tw(
                              'text-[10px] leading-relaxed text-primary'
                            )}
                            gap={tw('mb-0.5')}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {!hidden.includes('education') && educations.length > 0 ? (
              <View style={tw('mb-4')}>
                <Heading>Education</Heading>
                <View>
                  {educations.map((edu, i) => (
                    <View key={i} wrap={false} style={tw('mb-2.5')}>
                      <View style={tw('flex flex-row items-baseline gap-3')}>
                        <Text
                          style={[
                            tw('flex-1 text-[11px] text-primary'),
                            { fontFamily: BOLD }
                          ]}
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
                      {edu?.description ? (
                        <View style={tw('mt-1')}>
                          <RichText
                            content={edu.description}
                            textStyle={tw(
                              'text-[10px] leading-relaxed text-primary'
                            )}
                            gap={tw('mb-0.5')}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* Right column - 30% */}
          <View style={tw('flex flex-[0.32] flex-col')}>
            {!hidden.includes('skills') && skills.length > 0 ? (
              <View style={tw('mb-4')}>
                <Heading>Skills</Heading>
                <BulletedList
                  items={skills.map((s) => ({ name: s.skill_name }))}
                />
              </View>
            ) : null}
            {!hidden.includes('tools') && tools.length > 0 ? (
              <View style={tw('mb-4')}>
                <Heading>Tools</Heading>
                <BulletedList
                  items={tools.map((t) => ({ name: t.tool_name }))}
                />
              </View>
            ) : null}
            {!hidden.includes('languages') && languages.length > 0 ? (
              <View style={tw('mb-4')}>
                <Heading>Languages</Heading>
                <BulletedList
                  items={languages.map((l) => ({ name: l.lang_name }))}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
