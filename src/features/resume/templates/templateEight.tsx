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

// Standard built-in PDF serif fonts — no external font file, so the text layer
// stays selectable and ATS-parseable.
const SERIF = 'Times-Roman';
const SERIF_BOLD = 'Times-Bold';
const INK = '#1a1a1a';
const MUTED = '#4a4a4a';

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
      style={[
        tw('text-[13px] pb-1 mb-2'),
        { fontFamily: SERIF_BOLD, borderBottomWidth: 1, borderColor: INK }
      ]}
      minPresenceAhead={40}
    >
      {title}
    </Text>
  );
  return (
    <View style={tw('mb-3')}>
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

// A "label: value" row, e.g. "Skills:  React, Node, ...".
const ProficiencyRow = ({ label, value }: { label: string; value: string }) => (
  <View style={tw('flex flex-row mb-1.5')}>
    <Text
      style={[tw('w-[110px] text-[10px] pr-2'), { fontFamily: SERIF_BOLD }]}
    >
      {label}
    </Text>
    <Text style={tw('flex-1 text-[10px] leading-relaxed')}>{value}</Text>
  </View>
);

export default function ResumeTemplateEight({
  formData
}: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const contactStyle = [tw('text-[9px] text-right mt-0.5'), { color: MUTED }];

  const skillsList = skills
    .map((s) => s.skill_name)
    .filter(Boolean)
    .join(', ');
  const toolsList = tools
    .map((t) => t.tool_name)
    .filter(Boolean)
    .join(', ');
  const languagesList = languages
    .map((l) =>
      l.proficiency_level
        ? `${l.lang_name} (${l.proficiency_level})`
        : l.lang_name
    )
    .filter(Boolean)
    .join(', ');

  const hasProficiencies =
    (!hidden.includes('skills') && skillsList) ||
    (!hidden.includes('tools') && toolsList) ||
    (!hidden.includes('languages') && languagesList);

  const renderJob = (job: (typeof jobs)[number], key: number) => {
    const oversized = isOversizedDescription(job?.description);
    return (
      <View key={key} style={tw('mb-3')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row justify-between items-baseline')}>
            <Text
              style={[
                tw('text-[11px] flex-1 pr-3'),
                { fontFamily: SERIF_BOLD }
              ]}
            >
              {job?.employer ?? ''}
              {job?.city ? `, ${job.city}` : ''}
            </Text>
            {formatDateRange(job?.startDate, job?.endDate) ? (
              <Text style={[tw('text-[10px] shrink-0'), { color: MUTED }]}>
                {formatDateRange(job?.startDate, job?.endDate)}
              </Text>
            ) : null}
          </View>
          {job?.jobTitle ? (
            <Text style={[tw('text-[10px] mb-1'), { fontFamily: SERIF_BOLD }]}>
              {job.jobTitle}
            </Text>
          ) : null}
        </View>
        <View style={tw('pl-3')}>
          <RichText
            content={job?.description}
            textStyle={tw('text-[10px] leading-relaxed')}
            boldStyle={{ fontFamily: SERIF_BOLD }}
            gap={tw('mb-0.5')}
          />
        </View>
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
          <Text
            style={[tw('text-[11px] flex-1 pr-3'), { fontFamily: SERIF_BOLD }]}
          >
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
        <View style={tw('pl-3')}>
          <RichText
            content={proj?.description}
            textStyle={tw('text-[10px] leading-relaxed')}
            boldStyle={{ fontFamily: SERIF_BOLD }}
            gap={tw('mb-0.5')}
          />
        </View>
      </View>
    );
  };

  const renderEducation = (edu: (typeof educations)[number], key: number) => {
    const oversized = isOversizedDescription(edu?.description);
    return (
      <View key={key} style={tw('mb-2')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <View style={tw('flex flex-row justify-between items-baseline')}>
            <Text
              style={[
                tw('text-[11px] flex-1 pr-3'),
                { fontFamily: SERIF_BOLD }
              ]}
            >
              {edu?.degree ?? ''}
              {edu?.field ? ` in ${edu.field}` : ''}
            </Text>
            {formatDateRange(edu?.startDate, edu?.endDate) ? (
              <Text style={[tw('text-[10px] shrink-0'), { color: MUTED }]}>
                {formatDateRange(edu?.startDate, edu?.endDate)}
              </Text>
            ) : null}
          </View>
          <Text style={tw('text-[10px]')}>
            {edu?.school ?? ''}
            {edu?.city ? `, ${edu.city}` : ''}
          </Text>
        </View>
        {edu?.description ? (
          <View style={tw('mt-1 pl-3')}>
            <RichText
              content={edu.description}
              textStyle={tw('text-[10px] leading-relaxed')}
              boldStyle={{ fontFamily: SERIF_BOLD }}
              gap={tw('mb-0.5')}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Document {...docMeta(pd)}>
      <Page
        size='A4'
        style={[tw('px-12 py-12'), { fontFamily: SERIF, color: INK }]}
      >
        {/* Header */}
        <View style={tw('flex flex-row justify-between items-start mb-4')}>
          <View style={tw('w-[56%] pr-3')}>
            <Text style={[tw('text-[20px]'), { fontFamily: SERIF_BOLD }]}>
              {pd?.fname ?? 'First Name'} {pd?.lname ?? 'Last Name'}
            </Text>
            {pd?.resume_job_title ? (
              <Text style={tw('text-[14px] mt-1')}>{pd.resume_job_title}</Text>
            ) : null}
          </View>
          <View style={tw('flex flex-col items-end w-[44%]')}>
            <ContactLine
              items={[
                plain([pd?.city, pd?.country].filter(Boolean).join(', ')),
                plain(pd?.phone)
              ]}
              separator='•'
              style={contactStyle}
            />
            <ContactLine
              items={[
                mail(pd?.email),
                url(pd?.linkedin),
                url(pd?.github),
                url(pd?.website)
              ]}
              separator='•'
              style={contactStyle}
            />
          </View>
        </View>

        {!hidden.includes('summary') && summary ? (
          <View style={tw('mb-4')}>
            <RichText
              content={summary}
              textStyle={tw('text-[10px] leading-relaxed')}
              boldStyle={{ fontFamily: SERIF_BOLD }}
              gap={tw('mb-0.5')}
            />
          </View>
        ) : null}

        {hasProficiencies ? (
          <Section
            title='Technical Proficiencies'
            first={
              <>
                {!hidden.includes('skills') && skillsList ? (
                  <ProficiencyRow label='Skills:' value={skillsList} />
                ) : null}
                {!hidden.includes('tools') && toolsList ? (
                  <ProficiencyRow label='Tools:' value={toolsList} />
                ) : null}
                {!hidden.includes('languages') && languagesList ? (
                  <ProficiencyRow label='Languages:' value={languagesList} />
                ) : null}
              </>
            }
            firstWraps={isOversizedDescription(
              [skillsList, toolsList, languagesList].join(', ')
            )}
          />
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
      </Page>
    </Document>
  );
}
