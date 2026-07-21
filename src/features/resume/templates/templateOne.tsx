import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

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

const BulletedList = ({ items }: { items: Item[] }) => (
  <View style={tw('flex flex-col gap-1.5')}>
    {items.map((item, index) => (
      <View
        style={tw('flex flex-row flex-wrap items-center gap-2')}
        key={index}
      >
        <Text style={tw('text-[#94a3b8] text-xs')}>{'•'}</Text>
        <Text style={tw('text-sm')}>{item.name}</Text>
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

  return (
    <Document>
      <Page size='A4' style={tw('flex flex-row')}>
        {/* Black sidebar */}
        <View
          style={tw(
            'w-[32%] min-h-full flex flex-col gap-4 text-white bg-black p-6'
          )}
        >
          <Text style={tw('text-2xl font-bold leading-none')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>

          <View style={tw('flex flex-col gap-1')}>
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
          </View>

          {skills.length > 0 ? (
            <View>
              <Text style={tw('text-sm font-bold text-white mb-1.5')}>
                Skills
              </Text>
              <BulletedList
                items={skills.map((s) => ({ name: s.skill_name }))}
              />
            </View>
          ) : null}
          {tools.length > 0 ? (
            <View>
              <Text style={tw('text-sm font-bold text-white mb-1.5')}>
                Tools
              </Text>
              <BulletedList items={tools.map((t) => ({ name: t.tool_name }))} />
            </View>
          ) : null}
          {languages.length > 0 ? (
            <View>
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
        <View style={tw('w-[68%] flex flex-col gap-5 bg-white p-6')}>
          {pd?.summary ? (
            <View>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Summary
              </Text>
              <Text style={tw('text-sm leading-relaxed')}>{pd.summary}</Text>
            </View>
          ) : null}

          {educations.length > 0 ? (
            <View>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Education
              </Text>
              <View style={tw('flex flex-col gap-2.5')}>
                {educations.map((edu, i) => (
                  <View key={i}>
                    <View
                      style={tw('flex flex-row justify-between items-baseline')}
                    >
                      <Text style={tw('text-sm font-bold')}>
                        {edu?.degree ?? ''}
                        {edu?.field ? ` in ${edu.field}` : ''}
                        {edu?.school ? ` · ${edu.school}` : ''}
                      </Text>
                      {edu?.startDate || edu?.endDate ? (
                        <Text style={tw('text-xs text-[#7f7f7f]')}>
                          {edu?.startDate ?? ''} – {edu?.endDate ?? ''}
                        </Text>
                      ) : null}
                    </View>
                    {edu?.description ? (
                      <Text style={tw('text-sm mt-0.5 leading-relaxed')}>
                        {edu.description}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {jobs.length > 0 ? (
            <View>
              <Text style={tw('text-base font-bold text-[#111827] mb-1.5')}>
                Employment History
              </Text>
              <View style={tw('flex flex-col gap-3')}>
                {jobs.map((job, i) => (
                  <View key={i} wrap={false}>
                    <View
                      style={tw('flex flex-row justify-between items-baseline')}
                    >
                      <Text style={tw('text-sm font-bold')}>
                        {job?.jobTitle ?? ''}
                        {job?.employer ? ` · ${job.employer}` : ''}
                      </Text>
                      {job?.startDate || job?.endDate ? (
                        <Text style={tw('text-xs text-[#7f7f7f]')}>
                          {job?.startDate ?? ''} – {job?.endDate ?? ''}
                        </Text>
                      ) : null}
                    </View>
                    {job?.description ? (
                      <Text style={tw('text-sm mt-0.5 leading-relaxed')}>
                        {job.description}
                      </Text>
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
