import { colors, formatDate } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { Markdown } from '@/features/profile/components/markdown';
import { PageHeader } from '@/features/profile/components/page-header';
import { api } from '@/lib/api';

const TYPES = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
} as const;
type LegalType = keyof typeof TYPES;

const isLegalType = (t: string | undefined): t is LegalType => t === 'privacy' || t === 'terms';

/** Terms & Conditions and Privacy Policy, from the latest published `legal_documents` row. */
export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const insets = useSafeAreaInsets();
  const valid = isLegalType(type);
  const doc = useQuery({
    queryKey: ['legal', type],
    queryFn: () => api.catalog.getLegalDocument(type as LegalType),
    enabled: valid,
    staleTime: 60 * 60 * 1000,
  });

  const title = doc.data?.title ?? (valid ? TYPES[type] : 'Legal');

  return (
    <View style={styles.screen}>
      <PageHeader title={title} />
      {!valid ? (
        <View style={styles.state}>
          <Text variant="body15" color="blackTint2" align="center">
            This page doesn’t exist.
          </Text>
        </View>
      ) : doc.isPending ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : doc.isError ? (
        <View style={styles.state}>
          <Text variant="h4" color="black" align="center">
            Couldn’t load this page
          </Text>
          <Text variant="body14" color="blackTint2" align="center">
            Check your connection and try again.
          </Text>
          <Button label="Try again" size="small" variant="dark" onPress={() => void doc.refetch()} style={styles.retry} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <Text variant="subText13" color="blackTint3" style={styles.meta}>
            {doc.data.published_at ? `Last updated ${formatDate(doc.data.published_at, { style: 'medium' })}` : 'Draft'}
            {` · Version ${doc.data.version}`}
          </Text>
          <Markdown source={doc.data.body} skipTitle />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  meta: {
    marginBottom: 8,
  },
  state: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 120,
    gap: 8,
  },
  retry: {
    marginTop: 12,
    alignSelf: 'center',
  },
});
