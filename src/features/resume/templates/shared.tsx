import { Fragment, ReactNode } from 'react';
import { Link, Text } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { parseRichText } from '../utils/rich-text';
import { TResumeEditFormValues } from '../utils/form-schema';

// Same Style-type derivation trick as rich-text.tsx: `@react-pdf/types` isn't
// hoisted to the project root, so derive the style type from createTw.
const tw = createTw({ theme: { extend: {} } });
type Style = ReturnType<typeof tw>;
type StyleProp = Style | Style[];

const flat = (...styles: Array<StyleProp | undefined>): Style[] =>
  styles.flatMap((s) => (s === undefined ? [] : Array.isArray(s) ? s : [s]));

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

export type DateStyle = 'long' | 'short';

// "2021-01-15" -> "January 2021" (long) / "Jan 2021" (short).
// Non-ISO or out-of-range input is passed through untouched.
const formatMonthYear = (iso: string, style: DateStyle): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return iso;
  const names = style === 'long' ? MONTHS_LONG : MONTHS_SHORT;
  return `${names[month - 1]} ${m[1]}`;
};

// "Jan 2021 – Jan 2025", "Jan 2021 – Present", or a single date. A start date
// with no end date means the position is current.
export const formatDateRange = (
  start?: string,
  end?: string,
  style: DateStyle = 'long'
): string => {
  const a = start ? formatMonthYear(start, style) : '';
  const b = end ? formatMonthYear(end, style) : start ? 'Present' : '';
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
};

// ---------------------------------------------------------------------------
// Oversized-entry detection
// ---------------------------------------------------------------------------

// react-pdf force-places a wrap={false} node that is taller than a whole page
// and OVERPRINTS its lines into an illegible smear. Entries therefore only
// stay atomic (wrap={false}) while they provably fit on one page; huge
// descriptions flow across pages instead. The estimate is deliberately
// conservative: ~90 chars per wrapped line (real width fits ~100+) and 17pt
// per line (10pt text with relaxed leading is ~16.3pt) against a 700pt budget
// (a fresh A4 page offers ~770pt inside the margins, minus entry headers).
const EST_CHARS_PER_LINE = 90;
const EST_LINE_HEIGHT = 17;
const SAFE_ENTRY_HEIGHT = 700;

export const isOversizedDescription = (desc?: string | null): boolean => {
  if (!desc) return false;
  let lines = 0;
  for (const block of parseRichText(desc)) {
    const chars = block.runs.reduce((n, r) => n + r.text.length, 0);
    lines += Math.max(1, Math.ceil(chars / EST_CHARS_PER_LINE));
  }
  return lines * EST_LINE_HEIGHT > SAFE_ENTRY_HEIGHT;
};

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const withScheme = (href: string) =>
  /^(https?:|mailto:|tel:)/i.test(href) ? href : `https://${href}`;

// Clickable text that looks exactly like the surrounding text: react-pdf's
// Link defaults (blue + underline) are overridden by the caller's style plus
// an explicit no-underline.
export const LinkText = ({
  href,
  style,
  children
}: {
  href: string;
  style?: StyleProp;
  children: ReactNode;
}) => (
  <Link src={withScheme(href)} style={flat(style, { textDecoration: 'none' })}>
    {children}
  </Link>
);

// ---------------------------------------------------------------------------
// Contact rows
// ---------------------------------------------------------------------------

export type ContactItem = { text: string; href?: string };

// Builders for ContactLine items — empty values collapse to '' and are
// filtered out, so call sites can list every field unconditionally.
export const plain = (v?: string | null): ContactItem | '' =>
  v ? { text: v } : '';
export const mail = (v?: string | null): ContactItem | '' =>
  v ? { text: v, href: `mailto:${v}` } : '';
export const url = (v?: string | null): ContactItem | '' =>
  v ? { text: v, href: withScheme(v) } : '';

// One wrapping line of "item SEP item SEP item". The separator is glued to the
// PRECEDING item with a no-break space, so a wrapped continuation line starts
// with an item, never with a dangling "|" / "•". Items with an href render as
// clickable links styled like the rest of the line.
export const ContactLine = ({
  items,
  separator,
  style
}: {
  items: Array<ContactItem | '' | null | undefined | false>;
  separator: string;
  style: StyleProp;
}) => {
  const list = items.filter(Boolean) as ContactItem[];
  if (list.length === 0) return null;
  return (
    <Text style={style}>
      {list.map((item, i) => (
        <Fragment key={i}>
          {item.href ? (
            <LinkText href={item.href} style={style}>
              {item.text}
            </LinkText>
          ) : (
            item.text
          )}
          {i < list.length - 1 ? `\u00A0${separator}\u00A0 ` : ''}
        </Fragment>
      ))}
    </Text>
  );
};

// ---------------------------------------------------------------------------
// Document metadata
// ---------------------------------------------------------------------------

// PDF metadata (shows up in browser tabs, file inspectors, and some ATS /
// recruiter tools). Spread onto <Document>.
export const docMeta = (
  pd: TResumeEditFormValues['personal_details']
): { title: string; author?: string } => {
  const name = [pd?.fname, pd?.lname].filter(Boolean).join(' ');
  return {
    title: name ? `${name} – Resume` : 'Resume',
    author: name || undefined
  };
};
