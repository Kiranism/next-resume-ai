import { ReactNode } from 'react';
import { TResumeEditFormValues } from '../utils/form-schema';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
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

const tw = createTw({
  theme: {
    extend: {
      colors: {
        primary: '#1a1a1a',
        secondary: '#4a4a4a',
        accent: '#666666',
        muted: '#808080',
        surface: '#f5f5f5'
      }
    }
  }
});

const BOLD = 'Helvetica-Bold';

type TResumeTemplateProps = {
  formData: TResumeEditFormValues;
};

const SectionTitle = ({ children }: { children: ReactNode }) => (
  // minPresenceAhead keeps a header from being orphaned at the bottom of a
  // page when the section's first block flows (oversized) instead of being
  // glued to the header.
  <View style={tw('border-b border-accent mb-2 pb-1')} minPresenceAhead={40}>
    <Text style={[tw('text-base text-primary'), { fontFamily: BOLD }]}>
      {children}
    </Text>
  </View>
);

// The title and the FIRST block are glued inside a wrap={false} View so a
// section header can never sit orphaned at the bottom of a page. When the
// first block is too tall to be atomic (firstWraps), it flows instead.
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
}) => (
  <View style={tw('mb-5')}>
    {first != null ? (
      <>
        <View wrap={firstWraps}>
          <SectionTitle>{title}</SectionTitle>
          {first}
        </View>
        {children}
      </>
    ) : (
      <>
        <SectionTitle>{title}</SectionTitle>
        {children}
      </>
    )}
  </View>
);

export default function TemplateFour({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = (formData?.skills ?? [])
    .map((s) => s.skill_name)
    .filter(Boolean);
  const tools = (formData?.tools ?? []).map((t) => t.tool_name).filter(Boolean);
  const languages = (formData?.languages ?? [])
    .map((l) =>
      l.proficiency_level
        ? `${l.lang_name} (${l.proficiency_level})`
        : l.lang_name
    )
    .filter(Boolean);
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const bodyText = tw('text-[10px] leading-relaxed text-secondary');
  const bulletMark = tw('text-accent text-[9px]');

  const renderJob = (job: (typeof jobs)[number], key: number) => {
    const oversized = isOversizedDescription(job?.description);
    return (
      <View key={key} wrap={oversized} style={tw('mb-3')}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row items-baseline gap-3')}>
            <Text
              style={[
                tw('flex-1 text-[11px] text-primary'),
                { fontFamily: BOLD }
              ]}
            >
              {job?.employer ?? ''}
              {job?.city ? `, ${job.city}` : ''}
            </Text>
            {job?.startDate || job?.endDate ? (
              <Text style={tw('shrink-0 text-[9px] text-muted')}>
                {formatDateRange(job?.startDate, job?.endDate, 'short')}
              </Text>
            ) : null}
          </View>
          <Text style={tw('text-[10px] font-medium text-secondary')}>
            {job?.jobTitle ?? ''}
          </Text>
        </View>
        {job?.description ? (
          <View style={tw('mt-1')}>
            <RichText
              content={job.description}
              textStyle={bodyText}
              bulletStyle={bulletMark}
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
      <View key={key} wrap={oversized} style={tw('mb-3')}>
        <View
          wrap={false}
          minPresenceAhead={oversized ? 40 : undefined}
          style={tw('flex flex-row items-baseline gap-3')}
        >
          <Text
            style={[
              tw('flex-1 text-[11px] text-primary'),
              { fontFamily: BOLD }
            ]}
          >
            {proj?.name ?? ''}
          </Text>
          {proj?.link ? (
            <LinkText
              href={proj.link}
              style={tw('shrink-0 text-[9px] text-muted')}
            >
              {proj.link}
            </LinkText>
          ) : null}
        </View>
        {proj?.description ? (
          <View style={tw('mt-1')}>
            <RichText
              content={proj.description}
              textStyle={bodyText}
              bulletStyle={bulletMark}
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
      <View key={key} wrap={oversized} style={tw('mb-2')}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
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
                {formatDateRange(edu?.startDate, edu?.endDate, 'short')}
              </Text>
            ) : null}
          </View>
          {edu?.school || edu?.city ? (
            <Text style={tw('text-[9px] text-muted mt-0.5')}>
              {edu?.school ?? ''}
              {edu?.school && edu?.city ? ', ' : ''}
              {edu?.city ?? ''}
            </Text>
          ) : null}
        </View>
        {edu?.description ? (
          <View style={tw('mt-1')}>
            <RichText
              content={edu.description}
              textStyle={bodyText}
              bulletStyle={bulletMark}
              gap={tw('mb-0.5')}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Document {...docMeta(pd)}>
      <Page size='A4' style={tw('px-12 py-12')}>
        {/* Header */}
        <View style={tw('mb-5 text-center')}>
          <Text
            style={[
              tw('text-[26px] text-primary leading-none'),
              { fontFamily: BOLD }
            ]}
          >
            {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
          </Text>
          {pd?.resume_job_title ? (
            <Text style={tw('text-[11px] text-secondary mt-1.5')}>
              {pd.resume_job_title}
            </Text>
          ) : null}
          <ContactLine
            items={[
              plain(pd?.phone),
              mail(pd?.email),
              plain([pd?.city, pd?.country].filter(Boolean).join(', ')),
              url(pd?.linkedin),
              url(pd?.github),
              url(pd?.website)
            ]}
            separator='·'
            style={tw('text-[9px] text-muted text-center mt-1.5')}
          />
        </View>

        {!hidden.includes('summary') && summary ? (
          <Section
            title='Summary'
            first={
              <RichText
                content={summary}
                textStyle={bodyText}
                bulletStyle={bulletMark}
                gap={tw('mb-0.5')}
              />
            }
            firstWraps={isOversizedDescription(summary)}
          />
        ) : null}

        {!hidden.includes('skills') && skills.length > 0 ? (
          <Section
            title='Technical Skills'
            first={<Text style={bodyText}>{skills.join(', ')}</Text>}
            firstWraps={isOversizedDescription(skills.join(', '))}
          />
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section
            title='Work Experience'
            first={renderJob(jobs[0], 0)}
            firstWraps={isOversizedDescription(jobs[0]?.description)}
          >
            {jobs.slice(1).map((job, i) => renderJob(job, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('projects') && projects.length > 0 ? (
          <Section
            title='Projects'
            first={renderProject(projects[0], 0)}
            firstWraps={isOversizedDescription(projects[0]?.description)}
          >
            {projects.slice(1).map((proj, i) => renderProject(proj, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <Section
            title='Tools'
            first={<Text style={bodyText}>{tools.join(', ')}</Text>}
            firstWraps={isOversizedDescription(tools.join(', '))}
          />
        ) : null}

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section
            title='Education'
            first={renderEducation(educations[0], 0)}
            firstWraps={isOversizedDescription(educations[0]?.description)}
          >
            {educations.slice(1).map((edu, i) => renderEducation(edu, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <Section
            title='Languages'
            first={<Text style={bodyText}>{languages.join(', ')}</Text>}
            firstWraps={isOversizedDescription(languages.join(', '))}
          />
        ) : null}
      </Page>
    </Document>
  );
}
