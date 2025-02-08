import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

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

const BulletedList = ({ items }: { items: Item[] }) => (
  <View>
    {items.map((item, index) => (
      <View
        style={tw('flex flex-row flex-wrap items-center gap-1')}
        key={index}
      >
        <Text style={tw('text-accent')}>•</Text>
        <Text style={tw('text-sm')}>{item.name}</Text>
      </View>
    ))}
  </View>
);

const HeaderSection = () => <View fixed style={tw('h-4 w-full bg-primary')} />;

export default function ResumeTemplateTwo({ formData }: TResumeTemplateProps) {
  const hasSkills = formData?.skills?.length ?? 0 > 0;
  const hasTools = formData?.tools?.length ?? 0 > 0;
  const hasLanguages = formData?.languages?.length ?? 0 > 0;
  const hasEducation = formData?.education?.length ?? 0 > 0;
  const hasJobs = formData?.jobs?.length ?? 0 > 0;
  const hasSummary = formData?.personal_details?.summary;

  return (
    <Document>
      <Page size='A4' style={tw('p-6')}>
        <HeaderSection />

        {/* Header Section */}
        <View style={tw('mt-6 text-center mb-6')}>
          <Text style={tw('text-3xl font-bold text-primary')}>
            {formData?.personal_details?.fname ?? ''}{' '}
            {formData?.personal_details?.lname ?? ''}
          </Text>
          <View style={tw('flex flex-row justify-center gap-4 mt-2')}>
            {formData?.personal_details?.email && (
              <Text style={tw('text-sm text-muted')}>
                {formData.personal_details.email}
              </Text>
            )}
            {formData?.personal_details?.phone && (
              <Text style={tw('text-sm text-muted')}>
                {formData.personal_details.phone}
              </Text>
            )}
            {(formData?.personal_details?.city ||
              formData?.personal_details?.country) && (
              <Text style={tw('text-sm text-muted')}>
                {formData?.personal_details?.city}
                {formData?.personal_details?.city &&
                  formData?.personal_details?.country &&
                  ', '}
                {formData?.personal_details?.country}
              </Text>
            )}
          </View>
        </View>

        {/* Summary Section */}
        {hasSummary && (
          <View style={tw('mb-6')}>
            <Text style={tw('text-lg font-bold text-primary mb-2')}>
              Professional Summary
            </Text>
            <Text style={tw('text-sm')}>
              {formData?.personal_details?.summary ?? ''}
            </Text>
          </View>
        )}

        {/* Two Column Layout */}
        <View style={tw('flex flex-row')}>
          {/* Left Column */}
          <View style={tw('w-2/3 pr-4')}>
            {/* Work Experience */}
            {hasJobs && (
              <View style={tw('mb-6')}>
                <Text style={tw('text-lg font-bold text-primary mb-2')}>
                  Work Experience
                </Text>
                <View style={tw('flex flex-col gap-4')}>
                  {formData?.jobs?.map((job, index) => (
                    <View wrap={false} key={index}>
                      <Text style={tw('font-bold')}>
                        {job?.job_title ?? ''}
                      </Text>
                      <Text style={tw('text-sm text-muted')}>
                        {job?.employer && `${job.employer}`}
                        {(job?.start_date || job?.end_date) && ' | '}
                        {job?.start_date ?? ''} - {job?.end_date ?? ''}
                      </Text>
                      {job?.description && (
                        <Text style={tw('text-sm mt-1')}>
                          {job.description}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Education */}
            {hasEducation && (
              <View style={tw('mb-6')}>
                <Text style={tw('text-lg font-bold text-primary mb-2')}>
                  Education
                </Text>
                <View style={tw('flex flex-col gap-4')}>
                  {formData?.education?.map((edu, index) => (
                    <View key={index}>
                      <Text style={tw('font-bold')}>
                        {edu?.degree ?? ''} {edu?.field && `in ${edu.field}`}
                      </Text>
                      <Text style={tw('text-sm text-muted')}>
                        {edu?.school && `${edu.school}`}
                        {(edu?.start_date || edu?.end_date) && ' | '}
                        {edu?.start_date ?? ''} - {edu?.end_date ?? ''}
                      </Text>
                      {edu?.description && (
                        <Text style={tw('text-sm mt-1')}>
                          {edu.description}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Right Column */}
          <View style={tw('w-1/3 pl-4 border-l')}>
            {/* Skills Section */}
            {hasSkills && (
              <View style={tw('mb-6')}>
                <Text style={tw('text-lg font-bold text-primary mb-2')}>
                  Skills
                </Text>
                <BulletedList
                  items={
                    formData?.skills?.map((skill) => ({
                      name: skill.skill_name
                    })) ?? []
                  }
                />
              </View>
            )}

            {/* Tools Section */}
            {hasTools && (
              <View style={tw('mb-6')}>
                <Text style={tw('text-lg font-bold text-primary mb-2')}>
                  Tools
                </Text>
                <BulletedList
                  items={
                    formData?.tools?.map((tool) => ({
                      name: tool.tool_name
                    })) ?? []
                  }
                />
              </View>
            )}

            {/* Languages Section */}
            {hasLanguages && (
              <View style={tw('mb-6')}>
                <Text style={tw('text-lg font-bold text-primary mb-2')}>
                  Languages
                </Text>
                <BulletedList
                  items={
                    formData?.languages?.map((lang) => ({
                      name: lang.lang_name
                    })) ?? []
                  }
                />
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
