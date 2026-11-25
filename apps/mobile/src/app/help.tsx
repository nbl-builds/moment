import { colors } from '@moment/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { PageHeader } from '@/features/profile/components/page-header';
import { TitledSheet } from '@/features/support/components/titled-sheet';
import { FAQ, type FaqItem } from '@/features/support/faq';

const INSET = 20;

/** Receive help: FAQ list (48:5465); a question opens its answer sheet (48:5505). */
export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<FaqItem | null>(null);
  // Keep the last item while the sheet slides out.
  const [shown, setShown] = useState<FaqItem | null>(null);

  const show = (item: FaqItem) => {
    setShown(item);
    setOpen(item);
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="FAQ" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {FAQ.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="body15" weight="bold" color="black" accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </Text>
            {section.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => show(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={item.question}
                accessibilityHint="Shows the answer"
              >
                <Text variant="subText16" weight="semibold" color="black" style={styles.question}>
                  {item.question}
                </Text>
                <Icon name="chevron-right" size={18} color="black" />
              </Pressable>
            ))}
          </View>
        ))}

        <View style={styles.contact}>
          <Text variant="h4" color="black" align="center">
            Still need help?
          </Text>
          <Text variant="body14" color="blackTint2" align="center">
            Our team replies every day in the app or by email.
          </Text>
          <Button label="Contact Moment Support" onPress={() => router.push('/support')} style={styles.contactButton} />
        </View>
      </ScrollView>

      <TitledSheet visible={open !== null} title={shown?.question ?? ''} onClose={() => setOpen(null)} minHeightRatio={0.5}>
        <Text variant="body15" color="blackTint2" style={styles.answer}>
          {shown?.answer}
        </Text>
      </TitledSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: INSET,
    paddingTop: 26,
    gap: 28,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    letterSpacing: 0.15,
  },
  row: {
    minHeight: 60,
    borderRadius: 15,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  pressed: {
    backgroundColor: colors.track,
  },
  question: {
    flex: 1,
  },
  answer: {
    marginTop: 26,
    lineHeight: 21,
    letterSpacing: 0.15,
  },
  contact: {
    marginTop: 8,
    gap: 8,
  },
  contactButton: {
    marginTop: 12,
  },
});
