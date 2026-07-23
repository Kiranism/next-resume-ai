import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { RichText } from './rich-text';

const tw = createTw({
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#1e40af',
        accent: '#3b82f6',
        muted: '#64748b'
      }
    }
  }
});

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

type Item = {
  name: string;
};

// "2021-01-01 – 2023-05-01", "2021-01-01 – Present", or a single date.
const dateRange = (start?: string, end?: string) => {
  if (start && !end) return `${start} – Present`;
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
};

const BulletedList = ({ items }: { items: Item[] }) => (
  <View style={tw('flex flex-col gap-1')}>
    {items.map((item, index) => (
      <View style={tw('flex flex-row items-baseline gap-1.5')} key={index}>
        <Text style={tw('text-accent text-[9px]')}>•</Text>
        <Text style={tw('text-[10px] leading-snug')}>{item.name}</Text>
      </View>
    ))}
  </View>
);

const HeaderSection = () => <View fixed style={tw('h-4 w-full bg-primary')} />;

export default function ResumeTemplateTwo({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  return (
    <Document>
      <Page size='A4' style={tw('p-8')}>
        <HeaderSection />

        {/* Header */}
        <View style={tw('mt-5 text-center mb-6')}>
          <Text style={tw('text-3xl font-bold text-primary leading-none')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          <View style={tw('flex flex-row flex-wrap justify-center gap-3 mt-2')}>
            {pd?.email ? (
              <Text style={tw('text-xs text-muted')}>{pd.email}</Text>
            ) : null}
            {pd?.phone ? (
              <Text style={tw('text-xs text-muted')}>{pd.phone}</Text>
            ) : null}
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-muted')}>
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
            {pd?.linkedin ? (
              <Text style={tw('text-xs text-muted')}>{pd.linkedin}</Text>
            ) : null}
            {pd?.github ? (
              <Text style={tw('text-xs text-muted')}>{pd.github}</Text>
            ) : null}
            {pd?.website ? (
              <Text style={tw('text-xs text-muted')}>{pd.website}</Text>
            ) : null}
          </View>
        </View>

        {/* Summary */}
        {!hidden.includes('summary') && pd?.summary ? (
          <View style={tw('mb-5')}>
            <Text style={tw('text-lg font-bold text-primary mb-2')}>
              Professional Summary
            </Text>
            <RichText
              content={pd.summary}
              textStyle={tw('text-[10px] leading-relaxed')}
              gap={tw('mb-0.5')}
            />
          </View>
        ) : null}

        {/* Two Column */}
        <View style={tw('flex flex-row')}>
          {/* Left */}
          <View style={tw('w-2/3 pr-5')}>
            {!hidden.includes('experience') && jobs.length > 0 ? (
              <View style={tw('mb-5')}>
                <Text style={tw('text-[13px] font-bold text-primary mb-1.5')}>
                  Work Experience
                </Text>
                <View>
                  {jobs.map((job, index) => (
                    <View wrap={false} key={index} style={tw('mb-3')}>
                      <Text style={tw('text-[12px] font-bold text-primary')}>
                        {job?.jobTitle ?? ''}
                      </Text>
                      <Text style={tw('text-[9px] text-muted mt-0.5')}>
                        {job?.employer ?? ''}
                        {job?.startDate || job?.endDate
                          ? `   ·   ${dateRange(job?.startDate, job?.endDate)}`
                          : ''}
                      </Text>
                      {job?.description ? (
                        <View style={tw('mt-1')}>
                          <RichText
                            content={job.description}
                            textStyle={tw('text-[10px] leading-relaxed')}
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
              <View style={tw('mb-5')}>
                <Text style={tw('text-[13px] font-bold text-primary mb-1.5')}>
                  Projects
                </Text>
                <View>
                  {projects.map((proj, index) => (
                    <View wrap={false} key={index} style={tw('mb-3')}>
                      <Text style={tw('text-[12px] font-bold text-primary')}>
                        {proj?.name ?? ''}
                      </Text>
                      {proj?.link ? (
                        <Text style={tw('text-xs text-muted mt-0.5')}>
                          {proj.link}
                        </Text>
                      ) : null}
                      {proj?.description ? (
                        <View style={tw('mt-1')}>
                          <RichText
                            content={proj.description}
                            textStyle={tw('text-[10px] leading-relaxed')}
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
              <View style={tw('mb-5')}>
                <Text style={tw('text-[13px] font-bold text-primary mb-1.5')}>
                  Education
                </Text>
                <View>
                  {educations.map((edu, index) => (
                    <View key={index} wrap={false} style={tw('mb-3')}>
                      <Text style={tw('text-[12px] font-bold text-primary')}>
                        {edu?.degree ?? ''}
                        {edu?.field ? ` in ${edu.field}` : ''}
                      </Text>
                      <Text style={tw('text-[9px] text-muted mt-0.5')}>
                        {edu?.school ?? ''}
                        {edu?.startDate || edu?.endDate
                          ? `   ·   ${dateRange(edu?.startDate, edu?.endDate)}`
                          : ''}
                      </Text>
                      {edu?.description ? (
                        <View style={tw('mt-1')}>
                          <RichText
                            content={edu.description}
                            textStyle={tw('text-[10px] leading-relaxed')}
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

          {/* Right */}
          <View style={tw('w-1/3 pl-5 border-l border-[#e5e7eb]')}>
            {!hidden.includes('skills') && skills.length > 0 ? (
              <View style={tw('mb-5')}>
                <Text style={tw('text-[13px] font-bold text-primary mb-1.5')}>
                  Skills
                </Text>
                <BulletedList
                  items={skills.map((s) => ({ name: s.skill_name }))}
                />
              </View>
            ) : null}
            {!hidden.includes('tools') && tools.length > 0 ? (
              <View style={tw('mb-5')}>
                <Text style={tw('text-[13px] font-bold text-primary mb-1.5')}>
                  Tools
                </Text>
                <BulletedList
                  items={tools.map((t) => ({ name: t.tool_name }))}
                />
              </View>
            ) : null}
            {!hidden.includes('languages') && languages.length > 0 ? (
              <View style={tw('mb-5')}>
                <Text style={tw('text-[13px] font-bold text-primary mb-1.5')}>
                  Languages
                </Text>
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
