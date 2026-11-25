import { colors } from '@moment/shared';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { guestCount, type DraftGuests } from '../draft';
import { BOOK } from '../layout';
import { BookingSheet } from './booking-sheet';

const S = BOOK.sheet;
/** Infants and pets: a sensible cap; they don't count towards max guests. */
const MAX_INFANTS = 5;
const MAX_PETS = 2;

interface GuestsSheetProps {
  visible: boolean;
  value: DraftGuests;
  maxGuests: number;
  minGuests: number;
  petsAllowed: boolean;
  onSave: (guests: DraftGuests) => void;
  onClose: () => void;
}

/** "Add Guest" (47:4596): adults, children, infants and pets steppers. */
export function GuestsSheet({ visible, value, maxGuests, minGuests, petsAllowed, onSave, onClose }: GuestsSheetProps) {
  const [edited, setEdited] = useState<DraftGuests | null>(null);
  const guests = edited ?? value;
  const total = guestCount(guests);
  const full = total >= maxGuests;

  const set = (key: keyof DraftGuests, delta: number) => setEdited({ ...guests, [key]: guests[key] + delta });
  const close = () => {
    setEdited(null);
    onClose();
  };

  const rows: { key: keyof DraftGuests; label: string; sub: string; max: boolean; min: number; link?: () => void }[] = [
    { key: 'adults', label: 'Adults', sub: 'Age 13+', max: full, min: 1 },
    { key: 'children', label: 'Children', sub: 'Age 2-12', max: full, min: 0 },
    { key: 'infants', label: 'Infants', sub: 'Under 2', max: guests.infants >= MAX_INFANTS, min: 0 },
    {
      key: 'pets',
      label: 'Pets',
      sub: 'Bringing a service animal?',
      max: !petsAllowed || guests.pets >= MAX_PETS,
      min: 0,
      link: () =>
        Alert.alert(
          'Service animals',
          'Service animals are always welcome and don’t count as pets. Let the host know in your notes.',
        ),
    },
  ];

  const subtitle = `This place has a maximum of ${maxGuests} guest${maxGuests === 1 ? '' : 's'}, not including infants.${
    petsAllowed ? ' Pets are allowed.' : ' Pets aren’t allowed.'
  }${minGuests > 1 ? ` Book at least ${minGuests} guests.` : ''}`;

  return (
    <BookingSheet
      visible={visible}
      onClose={close}
      title="Add Guest"
      titleAlign="left"
      top={S.top.guests}
      action={{
        label: 'Save',
        disabled: total < minGuests,
        onPress: () => {
          setEdited(null);
          onSave(guests);
        },
      }}
    >
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.subtitle}>
        {subtitle}
      </Text>
      <View style={styles.rows}>
        {rows.map((row, i) => (
          <View key={row.key} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={styles.labels}>
              <Text variant="subText16" weight="bold" color="secondary">
                {row.label}
              </Text>
              <Text
                variant="body12"
                weight="medium"
                color="secondaryTint2"
                style={row.link && styles.underline}
                onPress={row.link}
                accessibilityRole={row.link ? 'link' : undefined}
              >
                {row.sub}
              </Text>
            </View>
            <Stepper
              label={row.label}
              value={guests[row.key]}
              canMinus={guests[row.key] > row.min}
              canPlus={!row.max}
              onMinus={() => set(row.key, -1)}
              onPlus={() => set(row.key, 1)}
            />
          </View>
        ))}
      </View>
    </BookingSheet>
  );
}

function Stepper({
  label,
  value,
  canMinus,
  canPlus,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  canMinus: boolean;
  canPlus: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <StepButton icon="minus" disabled={!canMinus} onPress={onMinus} label={`Fewer ${label.toLowerCase()}`} />
      <Text variant="body16" weight="bold" color="secondary" style={styles.count} accessibilityLabel={`${value} ${label}`}>
        {value}
      </Text>
      <StepButton icon="plus-thin" disabled={!canPlus} onPress={onPlus} label={`More ${label.toLowerCase()}`} />
    </View>
  );
}

function StepButton({ icon, disabled, onPress, label }: { icon: 'minus' | 'plus-thin'; disabled: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.step, disabled && styles.stepDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Icon name={icon} size={28} color="secondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 10,
    marginHorizontal: BOOK.inset,
    maxWidth: 330,
  },
  rows: {
    marginTop: 22,
    marginHorizontal: BOOK.inset,
    marginBottom: 24,
  },
  row: {
    height: S.guestRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.chipBorder,
  },
  labels: {
    gap: 2,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    width: 47,
    textAlign: 'center',
  },
  step: {
    width: S.stepper,
    height: S.stepper,
    borderRadius: S.stepper / 2,
    backgroundColor: colors.iconButtonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.35,
  },
});
