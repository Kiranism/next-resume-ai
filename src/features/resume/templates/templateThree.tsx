import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

const tw = createTw({
  theme: {
    extend: {
      colors: {
        primary: '#334155',
        secondary: '#94a3b8',
        accent: '#0ea5e9',
        muted: '#64748b',
        background: '#f8fafc'
      }
    }
  }
});

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

const BulletedList = ({ items }: { items: { name: string }[] }) => (
  <View style={tw('flex flex-col gap-1.5')}>
    {items.map((item, index) => (
      <View
        style={tw('flex flex-row flex-wrap items-center gap-1.5')}
        key={index}
      >
        <Text style={tw('text-accent text-xs')}>{'━'}</Text>
        <Text style={tw('text-sm')}>{item.name}</Text>
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

  return (
    <Document>
      <Page size='A4' style={tw('p-10 bg-background')}>
        {/* Header */}
        <View style={tw('border-b border-secondary pb-3 mb-5')}>
          <Text style={tw('text-3xl font-bold text-primary leading-none')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          <View style={tw('flex flex-row flex-wrap gap-1.5 mt-1.5')}>
            {pd?.email ? (
              <Text style={tw('text-xs text-muted')}>{pd.email}</Text>
            ) : null}
            {pd?.phone ? (
              <Text style={tw('text-xs text-muted')}>{'·  ' + pd.phone}</Text>
            ) : null}
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-muted')}>
                {'·  '}
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
            {pd?.linkedin ? (
              <Text style={tw('text-xs text-muted')}>
                {'·  ' + pd.linkedin}
              </Text>
            ) : null}
            {pd?.github ? (
              <Text style={tw('text-xs text-muted')}>{'·  ' + pd.github}</Text>
            ) : null}
            {pd?.website ? (
              <Text style={tw('text-xs text-muted')}>{'·  ' + pd.website}</Text>
            ) : null}
          </View>
        </View>

        {/* Main */}
        <View style={tw('flex flex-row gap-8')}>
          {/* Left column - 70% */}
          <View style={tw('flex flex-[0.7] flex-col gap-5')}>
            {pd?.summary ? (
              <View>
                <Text style={tw('text-lg font-bold text-accent mb-2')}>
                  Professional Summary
                </Text>
                <Text style={tw('text-sm leading-relaxed')}>{pd.summary}</Text>
              </View>
            ) : null}

            {jobs.length > 0 ? (
              <View>
                <Text style={tw('text-lg font-bold text-accent mb-2')}>
                  Work Experience
                </Text>
                <View style={tw('flex flex-col gap-3')}>
                  {jobs.map((job, i) => (
                    <View key={i} wrap={false}>
                      <View
                        style={tw(
                          'flex flex-row justify-between items-baseline'
                        )}
                      >
                        <Text style={tw('text-base font-bold text-primary')}>
                          {job?.jobTitle ?? ''}
                          {job?.employer ? ` · ${job.employer}` : ''}
                        </Text>
                        {job?.startDate || job?.endDate ? (
                          <Text style={tw('text-xs text-muted')}>
                            {job?.startDate ?? ''} – {job?.endDate ?? ''}
                          </Text>
                        ) : null}
                      </View>
                      {job?.description ? (
                        <Text style={tw('text-sm mt-1 leading-relaxed')}>
                          {job.description}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {educations.length > 0 ? (
              <View>
                <Text style={tw('text-lg font-bold text-accent mb-2')}>
                  Education
                </Text>
                <View style={tw('flex flex-col gap-3')}>
                  {educations.map((edu, i) => (
                    <View key={i}>
                      <View
                        style={tw(
                          'flex flex-row justify-between items-baseline'
                        )}
                      >
                        <Text style={tw('text-base font-bold text-primary')}>
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
                        <Text style={tw('text-xs text-muted mt-0.5')}>
                          {edu.school}
                        </Text>
                      ) : null}
                      {edu?.description ? (
                        <Text style={tw('text-sm mt-1 leading-relaxed')}>
                          {edu.description}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* Right column - 30% */}
          <View style={tw('flex flex-[0.3] flex-col gap-5')}>
            {skills.length > 0 ? (
              <View>
                <Text style={tw('text-lg font-bold text-accent mb-2')}>
                  Skills
                </Text>
                <BulletedList
                  items={skills.map((s) => ({ name: s.skill_name }))}
                />
              </View>
            ) : null}
            {tools.length > 0 ? (
              <View>
                <Text style={tw('text-lg font-bold text-accent mb-2')}>
                  Tools
                </Text>
                <BulletedList
                  items={tools.map((t) => ({ name: t.tool_name }))}
                />
              </View>
            ) : null}
            {languages.length > 0 ? (
              <View>
                <Text style={tw('text-lg font-bold text-accent mb-2')}>
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
