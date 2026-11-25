import { colors } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { REPORT_REASONS, reportHost, type ReportReason } from './mock';

/** "Report host" (flag on Host Profile; no Figma frame): pick a reason, submit. */
export function ReportSheet({ visible, hostId, hostName, onClose }: { visible: boolean; hostId: string; hostName: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportHost({ hostId, reason });
      setReason(null);
      onClose();
      showToast('Thanks, our team will look into it');
    } finally {
      setSending(false);
    }
  };

  return (
    <BookingSheet
      visible={visible}
      onClose={onClose}
      title="Report host"
      top={300}
      action={{ label: 'Submit report', onPress: () => void submit(), disabled: !reason, loading: sending }}
    >
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.intro}>
        Why are you reporting {hostName}? {hostName} won’t know it was you.
      </Text>
      <View style={styles.options}>
        {REPORT_REASONS.map((r) => {
          const selected = r.key === reason;
          return (
            <Pressable
              key={r.key}
              onPress={() => setReason(r.key)}
              style={[styles.option, selected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
              <Text variant="body15" weight={selected ? 'bold' : 'medium'} color="secondary" style={styles.label}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 12,
    marginHorizontal: 20,
  },
  options: {
    marginTop: 16,
    marginHorizontal: 14,
    marginBottom: 16,
    gap: 6,
  },
  option: {
    minHeight: 52,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.secondaryTint4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.secondary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.secondary,
  },
  label: {
    flex: 1,
  },
});
