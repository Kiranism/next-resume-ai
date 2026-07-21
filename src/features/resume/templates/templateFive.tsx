import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

const tw = createTw({ theme: { extend: {} } });

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

export default function ResumeTemplateFive({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactLine = [
    pd?.email,
    pd?.phone,
    [pd?.city, pd?.country].filter(Boolean).join(', '),
    pd?.linkedin,
    pd?.github,
    pd?.website
  ]
    .filter(Boolean)
    .join('  |  ');

  return (
    <Document>
      <Page size='A4' style={tw('p-10 text-black')}>
        <View style={tw('mb-4')}>
          <Text style={tw('text-2xl font-bold')}>
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-sm')}>{pd.resume_job_title}</Text>
          ) : null}
          {contactLine ? (
            <Text style={tw('text-xs mt-1')}>{contactLine}</Text>
          ) : null}
        </View>

        {!hidden.includes('summary') && summary ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              SUMMARY
            </Text>
            <Text style={tw('text-xs leading-relaxed')}>{summary}</Text>
          </View>
        ) : null}

        {!hidden.includes('skills') && skills.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              SKILLS
            </Text>
            <Text style={tw('text-xs')}>
              {skills
                .map((s) => s.skill_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              EXPERIENCE
            </Text>
            {jobs.map((job, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <Text style={tw('text-xs font-bold')}>
                  {job?.jobTitle ?? ''}
                  {job?.employer ? `, ${job.employer}` : ''}
                </Text>
                {job?.startDate || job?.endDate || job?.city ? (
                  <Text style={tw('text-xs')}>
                    {[
                      job?.city,
                      [job?.startDate, job?.endDate].filter(Boolean).join(' - ')
                    ]
                      .filter(Boolean)
                      .join('  |  ')}
                  </Text>
                ) : null}
                {job?.description ? (
                  <Text style={tw('text-xs mt-1')}>{job.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {!hidden.includes('projects') && projects.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              PROJECTS
            </Text>
            {projects.map((proj, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <Text style={tw('text-xs font-bold')}>{proj?.name ?? ''}</Text>
                {proj?.link ? (
                  <Text style={tw('text-xs')}>{proj.link}</Text>
                ) : null}
                {proj?.description ? (
                  <Text style={tw('text-xs mt-1')}>{proj.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              EDUCATION
            </Text>
            {educations.map((edu, i) => (
              <View key={i} style={tw('mb-2')} wrap={false}>
                <Text style={tw('text-xs font-bold')}>
                  {edu?.degree ?? ''}
                  {edu?.field ? ` in ${edu.field}` : ''}
                  {edu?.school ? `, ${edu.school}` : ''}
                </Text>
                {edu?.startDate || edu?.endDate ? (
                  <Text style={tw('text-xs')}>
                    {[edu?.startDate, edu?.endDate].filter(Boolean).join(' - ')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              TOOLS
            </Text>
            <Text style={tw('text-xs')}>
              {tools
                .map((t) => t.tool_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <View style={tw('mb-4')}>
            <Text style={tw('text-sm font-bold border-b border-black mb-1')}>
              LANGUAGES
            </Text>
            <Text style={tw('text-xs')}>
              {languages
                .map((l) => l.lang_name)
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
