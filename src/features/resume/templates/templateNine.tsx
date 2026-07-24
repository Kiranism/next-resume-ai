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

const TEAL = '#2b96a8';
const HEAD = '#1a1a1a';
const INK = '#2f2f2f';
const MUTED = '#6b6b6b';
const RULE = '#bdbdbd';
const BOLD = 'Helvetica-Bold';
const OBLIQUE = 'Helvetica-Oblique';

// Uppercase for the small-caps look this design uses on roles/subtitles.
const caps = (s?: string | null) => (s || '').toUpperCase();

type TResumeTemplateProps = { formData: TResumeEditFormValues };

// Section header (bold title + hairline rule) glued to the FIRST block inside
// a wrap={false} View so it can never sit orphaned at the bottom of a page.
// When the first block is too tall to be atomic (firstWraps), it flows and the
// header row falls back to its minPresenceAhead. NOTE: the presence hint must
// stay on the header ROW — putting it on the section container sends
// react-pdf's paginator into an infinite loop once a child flows across pages.
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
    <View style={tw('flex flex-row items-center mb-3')} minPresenceAhead={40}>
      <Text style={[tw('text-[15px]'), { fontFamily: BOLD, color: HEAD }]}>
        {title}
      </Text>
      <View
        style={[tw('flex-1 ml-3'), { borderTopWidth: 1, borderColor: RULE }]}
      />
    </View>
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

// Left-bold / right-teal-italic header row used by every entry. When
// `rightHref` is set the right side is a clickable link (e.g. project URLs).
const EntryHead = ({
  left,
  right,
  rightHref
}: {
  left: string;
  right?: string | null;
  rightHref?: string;
}) => {
  const rightStyle = [
    tw('text-[9px] shrink-0'),
    { fontFamily: OBLIQUE, color: TEAL }
  ];
  return (
    <View style={tw('flex flex-row justify-between items-baseline')}>
      <Text
        style={[
          tw('text-[11px] flex-1 pr-3'),
          { fontFamily: BOLD, color: HEAD }
        ]}
      >
        {left}
      </Text>
      {right ? (
        rightHref ? (
          <LinkText href={rightHref} style={rightStyle}>
            {right}
          </LinkText>
        ) : (
          <Text style={rightStyle}>{right}</Text>
        )
      ) : null}
    </View>
  );
};

// Small-caps subrow: role/degree on the left, italic dates on the right.
const SubRow = ({ left, right }: { left: string; right?: string }) => (
  <View style={tw('flex flex-row justify-between items-baseline mb-2')}>
    <Text
      style={[
        tw('text-[9px] flex-1 pr-3'),
        { color: MUTED, letterSpacing: 0.4 }
      ]}
    >
      {left}
    </Text>
    {right ? (
      <Text
        style={[
          tw('text-[9px] shrink-0'),
          { fontFamily: OBLIQUE, color: MUTED }
        ]}
      >
        {right}
      </Text>
    ) : null}
  </View>
);

const SkillRow = ({ label, value }: { label: string; value: string }) => (
  <View style={tw('flex flex-row mb-1')}>
    <Text
      style={[
        tw('w-[52px] text-[10px] pr-1'),
        { fontFamily: BOLD, color: HEAD }
      ]}
    >
      {label}
    </Text>
    <Text
      style={[tw('flex-1 pl-1 text-[10px] leading-relaxed'), { color: INK }]}
    >
      {value}
    </Text>
  </View>
);

export default function ResumeTemplateNine({ formData }: TResumeTemplateProps) {
  const pd = formData?.personal_details;
  const summary = pd?.summary;
  const skills = formData?.skills ?? [];
  const tools = formData?.tools ?? [];
  const languages = formData?.languages ?? [];
  const jobs = formData?.jobs ?? [];
  const educations = formData?.educations ?? [];
  const projects = formData?.projects ?? [];
  const hidden = formData?.hiddenSections ?? [];

  const fullName = `${pd?.fname ?? 'First Name'} ${pd?.lname ?? 'Last Name'}`;

  // Teal subtitle: the job role only.
  const subtitle = pd?.resume_job_title ?? '';

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
  const hasTechSkills =
    (!hidden.includes('skills') && skillsList) ||
    (!hidden.includes('tools') && toolsList) ||
    (!hidden.includes('languages') && languagesList);

  const bodyStyle = [tw('text-[10px] leading-relaxed'), { color: INK }];

  const renderJob = (job: (typeof jobs)[number], key: number) => {
    const oversized = isOversizedDescription(job?.description);
    return (
      <View key={key} style={tw('mb-2.5')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <EntryHead left={caps(job?.employer)} right={job?.city} />
          <SubRow
            left={caps(job?.jobTitle)}
            right={formatDateRange(job?.startDate, job?.endDate, 'short')}
          />
        </View>
        <RichText
          content={job?.description}
          textStyle={bodyStyle}
          gap={tw('mb-0.5')}
        />
      </View>
    );
  };

  const renderProject = (proj: (typeof projects)[number], key: number) => {
    const oversized = isOversizedDescription(proj?.description);
    return (
      <View key={key} style={tw('mb-2.5')} wrap={oversized}>
        <View wrap={false} minPresenceAhead={oversized ? 40 : undefined}>
          <EntryHead
            left={proj?.name ?? ''}
            right={proj?.link || ''}
            rightHref={proj?.link || undefined}
          />
        </View>
        <View style={tw('mt-2')}>
          <RichText
            content={proj?.description}
            textStyle={bodyStyle}
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
          <EntryHead left={edu?.school ?? ''} right={edu?.city} />
          <SubRow
            left={caps([edu?.degree, edu?.field].filter(Boolean).join(' in '))}
            right={formatDateRange(edu?.startDate, edu?.endDate, 'short')}
          />
        </View>
        {edu?.description ? (
          <RichText
            content={edu.description}
            textStyle={bodyStyle}
            gap={tw('mb-0.5')}
          />
        ) : null}
      </View>
    );
  };

  return (
    <Document {...docMeta(pd)}>
      <Page size='A4' style={[tw('px-12 pt-12 pb-14'), { color: INK }]}>
        {/* Centered header */}
        <View style={tw('items-center mb-5')}>
          <Text style={[tw('text-[32px] leading-none'), { color: '#4a4a4a' }]}>
            {fullName}
          </Text>
          {subtitle ? (
            <Text
              style={[
                tw('text-[9px] text-center mt-2'),
                { color: TEAL, fontFamily: BOLD, letterSpacing: 0.6 }
              ]}
            >
              {caps(subtitle)}
            </Text>
          ) : null}
          <ContactLine
            items={[
              plain(pd?.phone),
              mail(pd?.email),
              url(pd?.website),
              url(pd?.github),
              url(pd?.linkedin)
            ]}
            separator='|'
            style={[tw('text-[9px] text-center mt-2'), { color: MUTED }]}
          />
        </View>

        {!hidden.includes('summary') && summary ? (
          <Section
            title='Summary'
            first={
              <RichText
                content={summary}
                textStyle={bodyStyle}
                gap={tw('mb-0.5')}
              />
            }
            firstWraps={isOversizedDescription(summary)}
          />
        ) : null}

        {hasTechSkills ? (
          <Section
            title='Technical Skills'
            first={
              <>
                {!hidden.includes('skills') && skillsList ? (
                  <SkillRow label='Skills' value={skillsList} />
                ) : null}
                {!hidden.includes('tools') && toolsList ? (
                  <SkillRow label='Tools' value={toolsList} />
                ) : null}
                {!hidden.includes('languages') && languagesList ? (
                  <SkillRow label='Languages' value={languagesList} />
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

        {!hidden.includes('education') && educations.length > 0 ? (
          <Section
            title='Education'
            first={renderEducation(educations[0], 0)}
            firstWraps={isOversizedDescription(educations[0]?.description)}
          >
            {educations.slice(1).map((edu, i) => renderEducation(edu, i + 1))}
          </Section>
        ) : null}

        {/* Footer: name · Résumé · page (repeats on every page) */}
        <Text
          fixed
          style={[
            tw('absolute bottom-6 left-0 right-0 text-center text-[8px]'),
            { color: MUTED, letterSpacing: 0.5 }
          ]}
          render={({ pageNumber }) =>
            caps(`${fullName}  ·  Résumé  ·  ${pageNumber}`)
          }
        />
      </Page>
    </Document>
  );
}
