import { colors, formatPrice, PAYMENT_METHODS, parsePriceInput } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Icon, Input, Text, type IconName } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { PAYMENT_ICONS } from '@/features/booking/components/payment-sheet';
import { methodTitle, usePaymentMethods } from '@/features/payment-methods/queries';
import { depositToWallet, type DepositInput } from '../mock';
import { addPendingDeposit } from '../queries';

/** Quick amounts in minor units: Rs 1,000 / 2,500 / 5,000. */
const QUICK = [100_000, 250_000, 500_000] as const;
const MIN = 10_000; // Rs 100
const MAX = 50_000_000; // Rs 500,000

type Option = { id: string; label: string; icon: IconName; method: DepositInput['method'] };

/** Deposit (not in Figma): amount, quick amounts, a payment method, Continue. Mock: nothing is charged. */
export function DepositSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const saved = usePaymentMethods();
  const [amountText, setAmountText] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const options: Option[] = saved.data?.length
    ? saved.data.map((m) => ({
        id: m.id,
        label: methodTitle(m),
        icon: m.method === 'card' ? PAYMENT_ICONS.card : PAYMENT_ICONS.jazzcash,
        method: { savedId: m.id, label: methodTitle(m) },
      }))
    : PAYMENT_METHODS.map((m) => ({ id: m.key, label: m.label, icon: PAYMENT_ICONS[m.key], method: { key: m.key, label: m.label } }));

  // Until one is picked: the default saved method (listed first), else Card.
  const pickedId = options.some((o) => o.id === picked) ? picked : (options[0]?.id ?? null);

  const amount = parsePriceInput(amountText);
  const amountError =
    amountText && amount === null
      ? 'Enter an amount in rupees'
      : amount !== null && amount < MIN
        ? `The minimum is ${formatPrice(MIN)}`
        : amount !== null && amount > MAX
          ? `The maximum is ${formatPrice(MAX)}`
          : null;
  const option = options.find((o) => o.id === pickedId);
  const ready = amount !== null && !amountError && Boolean(option);

  const close = () => {
    setAmountText('');
    onClose();
  };

  const submit = async () => {
    if (!ready || amount === null || !option) return;
    setBusy(true);
    try {
      const deposit = await depositToWallet({ amount, method: option.method });
      addPendingDeposit(deposit);
      showToast(`${formatPrice(amount)} deposit is pending`);
      close();
    } catch {
      showToast('Couldn’t start the deposit. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BookingSheet
      visible={visible}
      onClose={close}
      title="Deposit"
      top={300}
      action={{ label: 'Continue', onPress: () => void submit(), disabled: !ready, loading: busy }}
    >
      <View style={styles.content}>
        <Input
          label="Amount"
          value={amountText}
          onChangeText={(t) => setAmountText(t.replace(/[^\d,.]/g, ''))}
          placeholder="0"
          keyboardType="numeric"
          error={amountError}
          leading={
            <Text variant="subText16" color="secondary">
              Rs
            </Text>
          }
          accessibilityLabel="Amount in rupees"
        />
        <View style={styles.quick}>
          {QUICK.map((q) => {
            const selected = amount === q;
            return (
              <Pressable
                key={q}
                onPress={() => setAmountText(String(q / 100))}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text variant="subText14" weight="medium" color="black">
                  {formatPrice(q)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="body16" weight="bold" color="black" style={styles.heading}>
          Pay with
        </Text>
        <View style={styles.rows}>
          {options.map((o) => {
            const selected = o.id === pickedId;
            return (
              <Pressable
                key={o.id}
                onPress={() => setPicked(o.id)}
                style={[styles.row, selected && styles.rowSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={o.label}
              >
                <Icon name={o.icon} size={24} color="secondary" />
                <Text variant="subText16" weight="medium" color="black" style={styles.rowLabel} numberOfLines={1}>
                  {o.label}
                </Text>
                {selected && <Icon name="check" size={20} color="black" />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quick: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  chip: {
    flex: 1,
    height: 36,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  heading: {
    marginTop: 24,
  },
  rows: {
    marginTop: 12,
    gap: 8,
  },
  row: {
    height: 60,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  rowSelected: {
    backgroundColor: colors.white,
  },
  rowLabel: {
    flex: 1,
  },
});
