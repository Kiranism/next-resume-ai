import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { ReactNode } from 'react';
import { RichText } from './rich-text';
import {
  ContactLine,
  LinkText,
  docMeta,
  formatDateRange,
  isOversizedDescription,
  mail,
  plain,
  url
} from './shared';

const tw = createTw({ theme: { extend: {} } });

const BOLD = 'Helvetica-Bold';

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

// The heading and the FIRST block are glued inside a wrap={false} View so a
// section header can never sit orphaned at the bottom of a page. When the
// first block is too tall to be atomic (firstWraps), it flows instead and the
// heading falls back to its minPresenceAhead.
const Section = ({
  title,
  first,
  firstWraps = false,
  children
}: {
  title: string;
  first?: ReactNode;
  firstWraps?: boolean;
  children?: ReactNode;
}) => {
  const heading = (
    <Text
      style={[
        tw(
          'text-[10px] tracking-[1.5px] text-[#111827] border-b border-[#9ca3af] pb-1 mb-2'
        ),
        { fontFamily: BOLD }
      ]}
      minPresenceAhead={40}
    >
      {title}
    </Text>
  );
  return (
    <View style={tw('mb-3.5')}>
      {first != null ? (
        <>
          <View wrap={firstWraps}>
            {heading}
            {first}
          </View>
          {children}
        </>
      ) : (
        <>
          {heading}
          {children}
        </>
      )}
    </View>
  );
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

  const skillsText = skills
    .map((s) => s.skill_name)
    .filter(Boolean)
    .join(', ');
  const toolsText = tools
    .map((t) => t.tool_name)
    .filter(Boolean)
    .join(', ');
  const languagesText = languages
    .map((l) =>
      l.proficiency_level
        ? `${l.lang_name} (${l.proficiency_level})`
        : l.lang_name
    )
    .filter(Boolean)
    .join(', ');

  const renderJob = (job: (typeof jobs)[number], key: number) => {
    const oversized = isOversizedDescription(job?.description);
    return (
      <View key={key} style={tw('mb-2.5')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row items-baseline gap-3')}>
            <Text
              style={[
                tw('flex-1 text-[11px] text-[#111827]'),
                { fontFamily: BOLD }
              ]}
            >
              {job?.jobTitle ?? ''}
              {job?.employer ? `, ${job.employer}` : ''}
            </Text>
            {job?.startDate || job?.endDate ? (
              <Text style={tw('shrink-0 text-[9px] text-[#4b5563]')}>
                {formatDateRange(job?.startDate, job?.endDate, 'short')}
              </Text>
            ) : null}
          </View>
          {job?.city ? (
            <Text style={tw('text-[9px] text-[#6b7280] mt-0.5')}>
              {job.city}
            </Text>
          ) : null}
        </View>
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
    );
  };

  const renderProject = (proj: (typeof projects)[number], key: number) => {
    const oversized = isOversizedDescription(proj?.description);
    return (
      <View key={key} style={tw('mb-2.5')} wrap={oversized}>
        <View
          wrap={false}
          minPresenceAhead={oversized ? 40 : undefined}
          style={tw('flex flex-row items-baseline gap-3')}
        >
          <Text
            style={[
              tw('flex-1 text-[11px] text-[#111827]'),
              { fontFamily: BOLD }
            ]}
          >
            {proj?.name ?? ''}
          </Text>
          {proj?.link ? (
            <LinkText
              href={proj.link}
              style={tw('shrink-0 text-[9px] text-[#4b5563]')}
            >
              {proj.link}
            </LinkText>
          ) : null}
        </View>
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
    );
  };

  const renderEducation = (edu: (typeof educations)[number], key: number) => {
    const oversized = isOversizedDescription(edu?.description);
    return (
      <View key={key} style={tw('mb-2')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row items-baseline gap-3')}>
            <Text
              style={[
                tw('flex-1 text-[11px] text-[#111827]'),
                { fontFamily: BOLD }
              ]}
            >
              {edu?.degree ?? ''}
              {edu?.field ? ` in ${edu.field}` : ''}
              {edu?.school ? `, ${edu.school}` : ''}
            </Text>
            {edu?.startDate || edu?.endDate ? (
              <Text style={tw('shrink-0 text-[9px] text-[#4b5563]')}>
                {formatDateRange(edu?.startDate, edu?.endDate, 'short')}
              </Text>
            ) : null}
          </View>
          {edu?.city ? (
            <Text style={tw('text-[9px] text-[#6b7280] mt-0.5')}>
              {edu.city}
            </Text>
          ) : null}
        </View>
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
    );
  };

  return (
    <Document {...docMeta(pd)}>
      <Page size='A4' style={tw('px-12 py-12 text-[#1f2937]')}>
        {/* Header */}
        <View style={tw('mb-4')}>
          <Text
            style={[
              tw('text-[24px] text-[#111827] leading-none'),
              { fontFamily: BOLD }
            ]}
          >
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-[11px] text-[#374151] mt-1.5')}>
              {pd.resume_job_title}
            </Text>
          ) : null}
          <ContactLine
            items={[
              mail(pd?.email),
              plain(pd?.phone),
              plain([pd?.city, pd?.country].filter(Boolean).join(', ')),
              url(pd?.linkedin),
              url(pd?.github),
              url(pd?.website)
            ]}
            separator='|'
            style={tw('text-[9px] text-[#4b5563] mt-1.5')}
          />
        </View>

        {!hidden.includes('summary') && summary ? (
          <Section
            title='SUMMARY'
            first={
              <RichText
                content={summary}
                textStyle={tw('text-[10px] leading-relaxed')}
                gap={tw('mb-0.5')}
              />
            }
            firstWraps={isOversizedDescription(summary)}
          />
        ) : null}

        {!hidden.includes('skills') && skillsText ? (
          <Section
            title='SKILLS'
            first={
              <Text style={tw('text-[10px] leading-relaxed')}>
                {skillsText}
              </Text>
            }
            firstWraps={isOversizedDescription(skillsText)}
          />
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section
            title='EXPERIENCE'
            first={renderJob(jobs[0], 0)}
            firstWraps={isOversizedDescription(jobs[0]?.description)}
          >
            {jobs.slice(1).map((job, i) => renderJob(job, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('projects') && projects.length > 0 ? (
          <Section
            title='PROJECTS'
            first={renderProject(projects[0], 0)}
            firstWraps={isOversizedDescription(projects[0]?.description)}
          >
            {projects.slice(1).map((proj, i) => renderProject(proj, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section
            title='EDUCATION'
            first={renderEducation(educations[0], 0)}
            firstWraps={isOversizedDescription(educations[0]?.description)}
          >
            {educations.slice(1).map((edu, i) => renderEducation(edu, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('tools') && toolsText ? (
          <Section
            title='TOOLS'
            first={
              <Text style={tw('text-[10px] leading-relaxed')}>{toolsText}</Text>
            }
            firstWraps={isOversizedDescription(toolsText)}
          />
        ) : null}

        {!hidden.includes('languages') && languagesText ? (
          <Section
            title='LANGUAGES'
            first={
              <Text style={tw('text-[10px] leading-relaxed')}>
                {languagesText}
              </Text>
            }
            firstWraps={isOversizedDescription(languagesText)}
          />
        ) : null}
      </Page>
    </Document>
  );
}
