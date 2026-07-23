import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { RichText } from './rich-text';

const tw = createTw({
  theme: {
    extend: {
      colors: {
        custom: 'cornflowerblue',
        h2: '#7f7f7f',
        muted: '#7f7f7f'
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
      <View style={tw('flex flex-row items-baseline gap-2')} key={index}>
        <Text style={tw('text-[#94a3b8] text-[9px]')}>{'•'}</Text>
        <Text style={tw('text-[10px] text-[#e2e8f0] leading-snug')}>
          {item.name}
        </Text>
      </View>
    ))}
  </View>
);

export default function ResumeTemplate({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const educations = formData?.educations ?? [];
  const jobs = formData?.jobs ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  return (
    <Document>
      <Page size='A4' style={tw('flex flex-row')}>
        {/* Black sidebar */}
        <View
          style={tw('w-[32%] min-h-full flex flex-col text-white bg-black p-6')}
        >
          <Text style={tw('text-2xl font-bold leading-none mb-4')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>

          <View style={tw('flex flex-col gap-1 mb-4')}>
            {pd?.email ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.email}</Text>
            ) : null}
            {pd?.phone ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.phone}</Text>
            ) : null}
            {pd?.city || pd?.country ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>
                {pd?.city}
                {pd?.city && pd?.country ? ', ' : ''}
                {pd?.country}
              </Text>
            ) : null}
            {pd?.linkedin ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.linkedin}</Text>
            ) : null}
            {pd?.github ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.github}</Text>
            ) : null}
            {pd?.website ? (
              <Text style={tw('text-xs text-[#cbd5e1]')}>{pd.website}</Text>
            ) : null}
          </View>

          {!hidden.includes('skills') && skills.length > 0 ? (
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-bold text-white mb-1.5')}>
                Skills
              </Text>
              <BulletedList
                items={skills.map((s) => ({ name: s.skill_name }))}
              />
            </View>
          ) : null}
          {!hidden.includes('tools') && tools.length > 0 ? (
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-bold text-white mb-1.5')}>
                Tools
              </Text>
              <BulletedList items={tools.map((t) => ({ name: t.tool_name }))} />
            </View>
          ) : null}
          {!hidden.includes('languages') && languages.length > 0 ? (
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-bold text-white mb-1.5')}>
                Languages
              </Text>
              <BulletedList
                items={languages.map((l) => ({ name: l.lang_name }))}
              />
            </View>
          ) : null}
        </View>

        {/* White main */}
        <View style={tw('w-[68%] flex flex-col bg-white p-6')}>
          {!hidden.includes('summary') && pd?.summary ? (
            <View style={tw('mb-5')}>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Summary
              </Text>
              <RichText
                content={pd.summary}
                textStyle={tw('text-sm leading-relaxed')}
                gap={tw('mb-0.5')}
              />
            </View>
          ) : null}

          {!hidden.includes('education') && educations.length > 0 ? (
            <View style={tw('mb-5')}>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Education
              </Text>
              <View>
                {educations.map((edu, i) => (
                  <View key={i} wrap={false} style={tw('mb-2.5')}>
                    <View style={tw('flex flex-row items-baseline gap-3')}>
                      <Text style={tw('flex-1 text-[11px] font-bold')}>
                        {edu?.degree ?? ''}
                        {edu?.field ? ` in ${edu.field}` : ''}
                        {edu?.school ? ` · ${edu.school}` : ''}
                      </Text>
                      {edu?.startDate || edu?.endDate ? (
                        <Text style={tw('shrink-0 text-[9px] text-[#6b7280]')}>
                          {dateRange(edu?.startDate, edu?.endDate)}
                        </Text>
                      ) : null}
                    </View>
                    {edu?.description ? (
                      <View style={tw('mt-0.5')}>
                        <RichText
                          content={edu.description}
                          textStyle={tw(
                            'text-[10px] leading-relaxed text-[#374151]'
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

          {!hidden.includes('experience') && jobs.length > 0 ? (
            <View style={tw('mb-5')}>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Employment History
              </Text>
              <View>
                {jobs.map((job, i) => (
                  <View key={i} wrap={false} style={tw('mb-2.5')}>
                    <View style={tw('flex flex-row items-baseline gap-3')}>
                      <Text style={tw('flex-1 text-[11px] font-bold')}>
                        {job?.jobTitle ?? ''}
                        {job?.employer ? ` · ${job.employer}` : ''}
                      </Text>
                      {job?.startDate || job?.endDate ? (
                        <Text style={tw('shrink-0 text-[9px] text-[#6b7280]')}>
                          {dateRange(job?.startDate, job?.endDate)}
                        </Text>
                      ) : null}
                    </View>
                    {job?.description ? (
                      <View style={tw('mt-0.5')}>
                        <RichText
                          content={job.description}
                          textStyle={tw(
                            'text-[10px] leading-relaxed text-[#374151]'
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
            <View style={tw('mb-5')}>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Projects
              </Text>
              <View>
                {projects.map((proj, i) => (
                  <View key={i} wrap={false} style={tw('mb-2.5')}>
                    <View style={tw('flex flex-row items-baseline gap-3')}>
                      <Text style={tw('flex-1 text-[11px] font-bold')}>
                        {proj?.name ?? ''}
                      </Text>
                      {proj?.link ? (
                        <Text style={tw('shrink-0 text-[9px] text-[#6b7280]')}>
                          {proj.link}
                        </Text>
                      ) : null}
                    </View>
                    {proj?.description ? (
                      <View style={tw('mt-0.5')}>
                        <RichText
                          content={proj.description}
                          textStyle={tw(
                            'text-[10px] leading-relaxed text-[#374151]'
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
      </Page>
    </Document>
  );
}
