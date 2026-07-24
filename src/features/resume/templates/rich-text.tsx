import { Text, View } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { parseRichText, RichRun } from '../utils/rich-text';

// `@react-pdf/types` (the package that declares `Style`) isn't hoisted to the
// project root — it's only reachable from inside react-pdf-tailwind's own
// dependency tree — so derive the same type via `createTw`'s return type
// rather than importing it directly.
const tw = createTw({ theme: { extend: {} } });
type Style = ReturnType<typeof tw>;

type Props = {
  content?: string | null;
  /** Per-template text style (size, color, leading). */
  textStyle: Style | Style[];
  /** Style applied to bold runs. Defaults to `{ fontFamily: 'Helvetica-Bold' }`
   * (the default document font); serif templates should pass
   * `{ fontFamily: 'Times-Bold' }`. react-pdf's built-in Standard-14 font
   * families (Helvetica, Times, Courier) don't respond to `fontWeight` —
   * only switching `fontFamily` to the explicit bold face renders bold. */
  boldStyle?: Style | Style[];
  /** Style for the bullet marker; defaults to `textStyle`. */
  bulletStyle?: Style | Style[];
  /** Spacing applied between blocks, e.g. `tw('mb-0.5')`. */
  gap?: Style | Style[];
};

// `style` only accepts `Style | Style[]` (not nested arrays), but our props
// accept `Style | Style[] | undefined` for composability with callers. Flatten
// to a plain `Style[]` before handing it to react-pdf.
const flat = (...styles: Array<Style | Style[] | undefined>): Style[] =>
  styles.flatMap((s) => (s === undefined ? [] : Array.isArray(s) ? s : [s]));

function Runs({
  runs,
  boldStyle
}: {
  runs: RichRun[];
  boldStyle: Style | Style[];
}) {
  return (
    <>
      {runs.map((r, i) =>
        r.bold ? (
          <Text key={i} style={boldStyle}>
            {r.text}
          </Text>
        ) : (
          <Text key={i}>{r.text}</Text>
        )
      )}
    </>
  );
}

export function RichText({
  content,
  textStyle,
  boldStyle = { fontFamily: 'Helvetica-Bold' },
  bulletStyle,
  gap
}: Props) {
  const blocks = parseRichText(content);
  if (blocks.length === 0) return null;

  return (
    <View>
      {blocks.map((b, i) => {
        if (b.kind === 'bullet') {
          // Keep each bullet row atomic: react-pdf doesn't fragment the text
          // column of a flex row, so a row started in a sliver of page space
          // strands its • marker at the page bottom while the text jumps to
          // the next page. Whole rows move instead. Rows that could exceed a
          // page (a single enormous bullet) are left free to fragment, since
          // an unbreakable node taller than a page overprints itself.
          const chars = b.runs.reduce((n, r) => n + r.text.length, 0);
          const atomic = Math.ceil(chars / 90) * 17 < 500;
          return (
            <View key={i} style={flat(tw('flex flex-row'), gap)} wrap={!atomic}>
              <Text style={flat(bulletStyle ?? textStyle, tw('w-3'))}>•</Text>
              <Text style={flat(textStyle, tw('flex-1'))}>
                <Runs runs={b.runs} boldStyle={boldStyle} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} style={flat(textStyle, gap)}>
            <Runs runs={b.runs} boldStyle={boldStyle} />
          </Text>
        );
      })}
    </View>
  );
}
