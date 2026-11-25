import { formatPkPhoneInput, phoneSignInSchema } from '@moment/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Input, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BOOK } from '../layout';
import { BookingSheet } from './booking-sheet';

/**
 * "Phone number > Add" on Confirm Reservation: a +92 number, then the code
 * screen confirms it (verify-code, mode phone-change). No Figma frame.
 */
export function PhoneSheet({ visible, onClose, title = 'Add phone number' }: { visible: boolean; onClose: () => void; title?: string }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    const parsed = phoneSignInSchema.safeParse({ phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid phone number');
      return;
    }
    setSending(true);
    try {
      await api.auth.changePhone(parsed.data.phone);
      onClose();
      router.push({ pathname: '/verify-code', params: { phone: parsed.data.phone, mode: 'phone-change' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <BookingSheet
      visible={visible}
      onClose={onClose}
      title={title}
      titleAlign="left"
      top={BOOK.sheet.top.notes}
      action={{ label: 'Send code', onPress: send, loading: sending, disabled: phone.replace(/\D/g, '').length < 10 }}
    >
      <Input
        style={styles.field}
        label="Phone Number"
        helperText="We’ll text you a code to confirm it. You’ll get trip updates here."
        error={error}
        leading={
          <View style={styles.code} accessible accessibilityLabel="Country code Pakistan, plus 92">
            <Text variant="subText16" color="secondary">
              +92
            </Text>
            <Icon name="chevron-down" color="secondary" />
          </View>
        }
        value={phone}
        onChangeText={(t) => {
          setPhone(formatPkPhoneInput(t));
          if (error) setError(null);
        }}
        onSubmitEditing={send}
        placeholder="3XX XXXXXXX"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        autoFocus
        maxLength={11}
      />
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 21,
    marginHorizontal: BOOK.inset,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
