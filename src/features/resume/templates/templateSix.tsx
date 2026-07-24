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

// Muted corporate blue used for the name, headings, titles and bullet markers.
const BLUE = '#2f6bb5';
const INK = '#333333';
const MUTED = '#5b5b5b';

type TResumeTemplateProps = { formData: TResumeEditFormValues };

// The title and the FIRST block are glued inside a wrap={false} View so a
// section header can never sit orphaned at the bottom of a page. When the
// first block is too tall to be atomic (firstWraps), it flows instead and the
// title falls back to its minPresenceAhead.
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
      style={[tw('text-[15px] mb-2'), { color: BLUE }]}
      minPresenceAhead={40}
    >
      {title}
    </Text>
  );
  return (
    <View style={tw('mb-4')}>
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

export default function ResumeTemplateSix({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactStyle = [tw('text-[9px] text-right mt-0.5'), { color: BLUE }];
  const bodyText = [tw('text-[10px] leading-relaxed'), { color: INK }];
  const bulletMark = [tw('text-[10px]'), { color: BLUE }];

  const skillNames = skills.map((s) => s.skill_name).filter(Boolean);
  // ~13pt per grid row of three — atomic unless the grid alone would outgrow
  // a page (only with a pathological number of skills).
  const skillsGridWraps = Math.ceil(skillNames.length / 3) * 13 > 700;

  const renderJob = (job: (typeof jobs)[number], key: number) => {
    const oversized = isOversizedDescription(job?.description);
    return (
      <View key={key} style={tw('mb-3')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row justify-between items-baseline')}>
            <Text style={[tw('text-[10px] flex-1 pr-3'), { color: BLUE }]}>
              {job?.employer ?? ''}
              {job?.city ? `, ${job.city}` : ''}
            </Text>
            {formatDateRange(job?.startDate, job?.endDate) ? (
              <Text style={[tw('text-[10px] shrink-0'), { color: BLUE }]}>
                {formatDateRange(job?.startDate, job?.endDate)}
              </Text>
            ) : null}
          </View>
          {job?.jobTitle ? (
            <Text style={[tw('text-[10px] mb-1'), { color: BLUE }]}>
              {job.jobTitle}
            </Text>
          ) : null}
        </View>
        <RichText
          content={job?.description}
          textStyle={bodyText}
          bulletStyle={bulletMark}
          gap={tw('mb-0.5')}
        />
      </View>
    );
  };

  const renderProject = (proj: (typeof projects)[number], key: number) => {
    const oversized = isOversizedDescription(proj?.description);
    return (
      <View key={key} style={tw('mb-3')} wrap={oversized}>
        <View
          wrap={false}
          minPresenceAhead={oversized ? 40 : undefined}
          style={tw('flex flex-row justify-between items-baseline')}
        >
          <Text style={[tw('text-[10px] flex-1 pr-3'), { color: BLUE }]}>
            {proj?.name ?? ''}
          </Text>
          {proj?.link ? (
            <LinkText
              href={proj.link}
              style={[tw('text-[9px] shrink-0'), { color: MUTED }]}
            >
              {proj.link}
            </LinkText>
          ) : null}
        </View>
        <RichText
          content={proj?.description}
          textStyle={bodyText}
          bulletStyle={bulletMark}
          gap={tw('mb-0.5')}
        />
      </View>
    );
  };

  const renderEducation = (edu: (typeof educations)[number], key: number) => {
    const oversized = isOversizedDescription(edu?.description);
    return (
      <View key={key} style={tw('mb-2')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row justify-between items-baseline')}>
            <Text style={[tw('text-[10px] flex-1 pr-3'), { color: BLUE }]}>
              {edu?.degree ?? ''}
              {edu?.field ? ` in ${edu.field}` : ''}
            </Text>
            {formatDateRange(edu?.startDate, edu?.endDate) ? (
              <Text style={[tw('text-[10px] shrink-0'), { color: BLUE }]}>
                {formatDateRange(edu?.startDate, edu?.endDate)}
              </Text>
            ) : null}
          </View>
          <Text style={[tw('text-[10px]'), { color: INK }]}>
            {edu?.school ?? ''}
            {edu?.city ? `, ${edu.city}` : ''}
          </Text>
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

  const skillsGrid = (
    <View style={tw('flex flex-row flex-wrap')}>
      {skillNames.map((name, i) => {
        // A single unbreakable token wider than a third-width cell would
        // overprint the next column — give it the full row instead.
        const wide = name.split(/\s+/).some((word) => word.length > 26);
        return (
          <View
            key={i}
            style={tw(`flex flex-row ${wide ? 'w-full' : 'w-1/3'} pr-2 mb-1`)}
          >
            <Text style={[tw('text-[10px] w-3'), { color: BLUE }]}>•</Text>
            <Text style={[tw('text-[10px] flex-1'), { color: INK }]}>
              {name}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <Document {...docMeta(pd)}>
      <Page size='A4' style={[tw('px-12 py-12'), { color: INK }]}>
        {/* Header */}
        <View style={tw('flex flex-row justify-between items-start mb-4')}>
          <View style={tw('flex-1 pr-4')}>
            <Text style={[tw('text-[23px] leading-tight'), { color: BLUE }]}>
              {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
            </Text>
            {pd?.resume_job_title ? (
              <Text style={[tw('text-[12px] mt-1'), { color: BLUE }]}>
                {pd.resume_job_title}
              </Text>
            ) : null}
          </View>
          <View style={tw('flex flex-col items-end max-w-[55%]')}>
            <ContactLine
              items={[mail(pd?.email), plain(pd?.phone)]}
              separator='•'
              style={contactStyle}
            />
            <ContactLine
              items={[
                plain([pd?.city, pd?.country].filter(Boolean).join(', '))
              ]}
              separator='•'
              style={contactStyle}
            />
            <ContactLine
              items={[url(pd?.linkedin), url(pd?.github), url(pd?.website)]}
              separator='•'
              style={contactStyle}
            />
          </View>
        </View>

        {!hidden.includes('summary') && summary ? (
          <View style={tw('mb-4')}>
            <RichText
              content={summary}
              textStyle={bodyText}
              gap={tw('mb-0.5')}
            />
          </View>
        ) : null}

        {!hidden.includes('experience') && jobs.length > 0 ? (
          <Section
            title='Professional Experience'
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

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section
            title='Education'
            first={renderEducation(educations[0], 0)}
            firstWraps={isOversizedDescription(educations[0]?.description)}
          >
            {educations.slice(1).map((edu, i) => renderEducation(edu, i + 1))}
          </Section>
        ) : null}

        {!hidden.includes('skills') && skillNames.length > 0 ? (
          <Section
            title='Areas of Expertise'
            first={skillsGrid}
            firstWraps={skillsGridWraps}
          />
        ) : null}

        {!hidden.includes('tools') && tools.length > 0 ? (
          <Section
            title='Tools & Technologies'
            first={
              <Text style={[tw('text-[10px] leading-relaxed'), { color: INK }]}>
                {tools
                  .map((t) => t.tool_name)
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            }
          />
        ) : null}

        {!hidden.includes('languages') && languages.length > 0 ? (
          <Section
            title='Languages'
            first={
              <Text style={[tw('text-[10px] leading-relaxed'), { color: INK }]}>
                {languages
                  .map((l) =>
                    l.proficiency_level
                      ? `${l.lang_name} (${l.proficiency_level})`
                      : l.lang_name
                  )
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            }
          />
        ) : null}
      </Page>
    </Document>
  );
}
