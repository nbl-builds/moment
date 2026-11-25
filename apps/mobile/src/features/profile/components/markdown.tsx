import { colors } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';

// A tiny Markdown renderer for the legal documents (Terms, Privacy): `#` and
// `##` headings, paragraphs, `- ` lists and **bold**. Nothing else is needed,
// so no dependency.

type Block = { kind: 'h1' | 'h2' | 'p'; text: string } | { kind: 'list'; items: string[] };

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    if (list) blocks.push({ kind: 'list', items: list });
    paragraph = [];
    list = null;
  };

  for (const raw of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      flush();
      blocks.push({ kind: 'h1', text: line.slice(2).trim() });
    } else if (/^[-*] /.test(line)) {
      if (paragraph.length) flush();
      (list ??= []).push(line.slice(2).trim());
    } else if (list) {
      // A wrapped list line continues the last item.
      list[list.length - 1] += ` ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** Splits `**bold**` spans out of a line. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={i} variant="body15" weight="bold" color="black">
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Renders a Markdown document. `skipTitle` drops a leading `#` heading the screen already shows. */
export function Markdown({ source, skipTitle }: { source: string; skipTitle?: boolean }) {
  let blocks = parseMarkdown(source);
  if (skipTitle && blocks[0]?.kind === 'h1') blocks = blocks.slice(1);

  return (
    <View style={styles.doc}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h1':
            return (
              <Text key={i} variant="h4" color="black" accessibilityRole="header" style={styles.h1}>
                {block.text}
              </Text>
            );
          case 'h2':
            return (
              <Text key={i} variant="subText16" weight="bold" color="black" accessibilityRole="header" style={styles.h2}>
                {block.text}
              </Text>
            );
          case 'p':
            return (
              <Text key={i} variant="body15" color="blackTint2" style={styles.body}>
                <Inline text={block.text} />
              </Text>
            );
          case 'list':
            return (
              <View key={i} style={styles.list}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.item}>
                    <View style={styles.bullet} />
                    <Text variant="body15" color="blackTint2" style={[styles.body, styles.itemText]}>
                      <Inline text={item} />
                    </Text>
                  </View>
                ))}
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  doc: {
    gap: 12,
  },
  h1: {
    marginTop: 8,
  },
  h2: {
    marginTop: 12,
  },
  body: {
    lineHeight: 21,
    letterSpacing: 0.15,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    backgroundColor: colors.blackTint2,
  },
  itemText: {
    flex: 1,
  },
});
