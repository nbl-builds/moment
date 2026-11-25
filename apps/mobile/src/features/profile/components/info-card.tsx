import { colors } from '@moment/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { TextLink } from './page-header';

/** 70pt white card: bold title, grey line, underlined action (Show profile 48:3951, Edit 48:3617). */
export function InfoCard({
  title,
  subtitle,
  action,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text variant="subText16" weight="bold" color="black">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subText12" color="blackTint3" style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {action && onAction ? <TextLink label={action} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 70,
    marginHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  text: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
});
