import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { BOOK } from '../layout';

const P = BOOK.promo;

export type PromoState = { kind: 'none' } | { kind: 'checking' } | { kind: 'applied'; title: string | null } | { kind: 'invalid'; reason: string };

/** Promo code row in Payment Method (47:5143 / 48:7600 applied / 48:7743 invalid). */
export function PromoRow({ state, onPress }: { state: PromoState; onPress: () => void }) {
  const applied = state.kind === 'applied';
  const invalid = state.kind === 'invalid';
  const label = applied ? 'Promo code(Applied)' : invalid ? 'Promo code(Invalid)' : 'Promo code';
  return (
    <View>
      <Pressable
        onPress={onPress}
        style={[styles.row, applied && styles.applied, invalid && styles.invalid]}
        accessibilityRole="button"
        accessibilityLabel={`${label}${invalid ? `. ${state.reason}` : ''}. ${state.kind === 'none' ? 'Add' : 'Edit'}`}
      >
        <Icon name={applied ? 'check-circle' : invalid ? 'x-circle' : 'ticket'} size={24} color={applied || invalid ? undefined : 'black'} />
        <Text variant="subText16" weight="bold" color={applied ? 'price' : invalid ? 'invalid' : 'black'} style={styles.label}>
          {label}
        </Text>
        <Text variant="subText14" weight="bold" color="black" style={styles.action}>
          {state.kind === 'none' || state.kind === 'checking' ? 'Add' : 'Edit'}
        </Text>
      </Pressable>
      {invalid && (
        <Text variant="body12" weight="medium" color="invalid" style={styles.reason} accessibilityLiveRegion="polite">
          {state.reason}
        </Text>
      )}
      {applied && state.title && (
        <Text variant="body12" weight="medium" color="price" style={styles.reason}>
          {state.title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: P.height,
    borderRadius: P.radius,
    backgroundColor: colors.track,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: P.iconLeft,
    paddingRight: 14,
    gap: 10,
  },
  applied: {
    backgroundColor: colors.successSurface,
  },
  invalid: {
    backgroundColor: colors.invalidSurface,
  },
  label: {
    flex: 1,
  },
  action: {
    textDecorationLine: 'underline',
  },
  reason: {
    marginTop: 6,
    marginLeft: 2,
  },
});
