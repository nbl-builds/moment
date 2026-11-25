import { addCardSchema, addWalletSchema, formatPkPhoneInput, PAYMENT_METHODS, type PaymentMethodKey } from '@moment/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Input, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { tokenize } from '../mock';
import { usePaymentMethodMutations } from '../queries';

type Errors = Partial<Record<'holderName' | 'number' | 'expiry' | 'cvc' | 'phone', string>>;

/** "4242 4242 4242 4242" while typing. */
const groupCard = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
/** "08/28" while typing. */
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/**
 * Add a card or mobile wallet (not in Figma; same sheet style as 48:5703).
 * The number goes to `tokenize` (provider, mock for now) and is cleared from
 * state straight after; only the token and display details are saved.
 */
export function AddMethodSheet({ kind, onClose }: { kind: PaymentMethodKey | null; onClose: () => void }) {
  const { add } = usePaymentMethodMutations();
  const [holderName, setHolderName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const label = PAYMENT_METHODS.find((m) => m.key === kind)?.label ?? 'Card';
  const isCard = kind === 'card';

  const clearSecrets = () => {
    setNumber('');
    setCvc('');
    setExpiry('');
    setPhone('');
  };
  const close = () => {
    clearSecrets();
    setHolderName('');
    setErrors({});
    onClose();
  };

  const save = async () => {
    if (!kind) return;
    let input: Parameters<typeof tokenize>[0];
    if (kind === 'card') {
      const parsed = addCardSchema.safeParse({ holderName, number, expiry, cvc });
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
        return;
      }
      input = { kind, ...parsed.data };
    } else {
      const parsed = addWalletSchema.safeParse({ phone });
      if (!parsed.success) {
        setErrors({ phone: parsed.error.issues[0]?.message });
        return;
      }
      input = { kind, phone: parsed.data.phone };
    }
    setErrors({});
    setBusy(true);
    try {
      const token = await tokenize(input);
      clearSecrets();
      await add.mutateAsync(token);
      showToast(`${label} added`);
      close();
    } catch {
      showToast(`Couldn’t add your ${label}. Try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BookingSheet
      visible={kind !== null}
      onClose={close}
      title={isCard ? 'Add card' : `Add ${label}`}
      titleAlign="left"
      top={isCard ? 300 : 480}
      action={{ label: 'Save', onPress: () => void save(), loading: busy, variant: 'dark' }}
    >
      <View style={styles.form}>
        {isCard ? (
          <>
            <Input
              label="Name on card"
              value={holderName}
              onChangeText={(t) => {
                setHolderName(t);
                if (errors.holderName) setErrors({ ...errors, holderName: undefined });
              }}
              error={errors.holderName}
              placeholder="Ayesha Khan"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <Input
              label="Card number"
              value={number}
              onChangeText={(t) => {
                setNumber(groupCard(t));
                if (errors.number) setErrors({ ...errors, number: undefined });
              }}
              error={errors.number}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              autoComplete="cc-number"
              textContentType="creditCardNumber"
              maxLength={23}
            />
            <View style={styles.pair}>
              <Input
                style={styles.half}
                label="Expiry"
                value={expiry}
                onChangeText={(t) => {
                  setExpiry(formatExpiry(t));
                  if (errors.expiry) setErrors({ ...errors, expiry: undefined });
                }}
                error={errors.expiry}
                placeholder="MM/YY"
                keyboardType="number-pad"
                autoComplete="cc-exp"
                maxLength={5}
              />
              <Input
                style={styles.half}
                label="CVC"
                value={cvc}
                onChangeText={(t) => {
                  setCvc(t.replace(/\D/g, '').slice(0, 4));
                  if (errors.cvc) setErrors({ ...errors, cvc: undefined });
                }}
                error={errors.cvc}
                placeholder="123"
                keyboardType="number-pad"
                autoComplete="cc-csc"
                secureTextEntry
                maxLength={4}
              />
            </View>
          </>
        ) : (
          <Input
            label={`${label} number`}
            helperText={`The mobile number registered with ${label}.`}
            value={phone}
            onChangeText={(t) => {
              setPhone(formatPkPhoneInput(t));
              if (errors.phone) setErrors({});
            }}
            error={errors.phone}
            placeholder="3XX XXXXXXX"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={11}
            leading={
              <Text variant="subText16" color="secondary" accessibilityLabel="Country code Pakistan, plus 92">
                +92
              </Text>
            }
          />
        )}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  pair: {
    flexDirection: 'row',
    gap: 16,
  },
  half: {
    flex: 1,
  },
});
