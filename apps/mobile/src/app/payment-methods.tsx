import { colors, type PaymentMethodKey } from '@moment/shared';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { PAYMENT_ICONS } from '@/features/booking/components/payment-sheet';
import { SheetOption } from '@/features/bucket-list/components/sheet-option';
import { ConfirmSheet } from '@/features/groups/components/confirm-sheet';
import { Skeleton } from '@/features/home/components/skeleton';
import { AddMethodSheet } from '@/features/payment-methods/components/add-method-sheet';
import { MethodPickerSheet } from '@/features/payment-methods/components/method-picker-sheet';
import {
  methodExpiry,
  methodTitle,
  usePaymentMethodMutations,
  usePaymentMethods,
  type SavedPaymentMethod,
} from '@/features/payment-methods/queries';
import { PageHeader } from '@/features/profile/components/page-header';

/** Payment Method (48:5379 empty, 48:5703 picker): saved cards and wallets, Add, Set as default, Remove. */
export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const methods = usePaymentMethods();
  const { setDefault, remove } = usePaymentMethodMutations();
  const [picker, setPicker] = useState(false);
  const [adding, setAdding] = useState<PaymentMethodKey | null>(null);
  const [selected, setSelected] = useState<SavedPaymentMethod | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const pick = (key: PaymentMethodKey) => {
    setPicker(false);
    setAdding(key);
  };

  const makeDefault = () => {
    const m = selected;
    setSelected(null);
    if (!m) return;
    setDefault.mutate(m.id, {
      onSuccess: () => showToast(`${methodTitle(m)} is now your default`),
      onError: () => showToast('Couldn’t change your default. Try again.'),
    });
  };

  const removeSelected = () => {
    const m = selected;
    setConfirmRemove(false);
    setSelected(null);
    if (!m) return;
    remove.mutate(m.id, {
      onSuccess: () => showToast(`${methodTitle(m)} removed`),
      onError: () => showToast('Couldn’t remove it. Try again.'),
    });
  };

  const body =
    session === null ? (
      <View style={styles.empty}>
        <Text variant="h4" color="black" align="center">
          Sign in to manage payment methods
        </Text>
      </View>
    ) : methods.isPending ? (
      <View style={styles.list}>
        {[0, 1].map((i) => (
          <Skeleton key={i} width="100%" height={70} radius={15} />
        ))}
      </View>
    ) : methods.isError ? (
      <View style={styles.empty}>
        <Text variant="h4" color="black" align="center">
          Couldn’t load your payment methods
        </Text>
        <Button label="Try again" size="small" variant="dark" onPress={() => void methods.refetch()} style={styles.emptyButton} />
      </View>
    ) : methods.data.length === 0 ? (
      <View style={styles.empty}>
        <Text variant="h4" color="black" align="center" style={styles.emptyTitle}>
          Set up a payment method
        </Text>
        <Text variant="subText14" weight="medium" color="blackTint1" align="center" style={styles.emptyBody}>
          Use your payment methods to book experiences on Moment.
        </Text>
        <AddButton onPress={() => setPicker(true)} style={styles.emptyButton} />
      </View>
    ) : (
      <View style={styles.list}>
        {methods.data.map((m) => (
          <MethodRow key={m.id} method={m} onPress={() => setSelected(m)} />
        ))}
        <AddButton onPress={() => setPicker(true)} style={styles.addAnother} />
      </View>
    );

  return (
    <View style={styles.screen}>
      <PageHeader title="Payment Method" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={methods.isRefetching} onRefresh={() => void methods.refetch()} />}
      >
        {body}
      </ScrollView>

      <MethodPickerSheet visible={picker} onPick={pick} onClose={() => setPicker(false)} />
      <AddMethodSheet kind={adding} onClose={() => setAdding(null)} />

      <BottomSheet
        visible={selected !== null && !confirmRemove}
        onRequestClose={() => setSelected(null)}
        backgroundColor={colors.backgroundMuted}
        accessibilityLabel="Payment method options"
      >
        <View style={[styles.options, { paddingBottom: insets.bottom + 20 }]}>
          {selected && (
            <Text variant="h4" weight="extrabold" color="black" align="center" style={styles.optionsTitle}>
              {methodTitle(selected)}
            </Text>
          )}
          {selected && !selected.is_default && <SheetOption icon="check-circle" title="Set as default" onPress={makeDefault} />}
          <SheetOption icon="trash" title="Remove" onPress={() => setConfirmRemove(true)} />
        </View>
      </BottomSheet>
      <ConfirmSheet
        visible={confirmRemove}
        title="Remove this payment method?"
        body={selected ? `${methodTitle(selected)} will no longer be available at checkout.` : ''}
        confirmLabel="Yes, Remove"
        onConfirm={removeSelected}
        onClose={() => {
          setConfirmRemove(false);
          setSelected(null);
        }}
      />
    </View>
  );
}

function MethodRow({ method, onPress }: { method: SavedPaymentMethod; onPress: () => void }) {
  const title = methodTitle(method);
  const detail = methodExpiry(method) ?? (method.method === 'card' ? method.holder_name : 'Mobile account');
  const key = (method.method in PAYMENT_ICONS ? method.method : 'card') as PaymentMethodKey;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${method.is_default ? ', default' : ''}${detail ? `, ${detail}` : ''}`}
      accessibilityHint="Set as default or remove"
    >
      <View style={styles.rowIcon}>
        <Icon name={PAYMENT_ICONS[key]} size={24} color="black" />
      </View>
      <View style={styles.rowBody}>
        <Text variant="subText16" weight="medium" color="black" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="subText12" color="blackTint3" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {method.is_default && (
        <View style={styles.pill}>
          <Text variant="subText10" weight="bold" color="black">
            Default
          </Text>
        </View>
      )}
      <Icon name="more-dots" size={24} color="black" />
    </Pressable>
  );
}

/** Black "Add Payment Method" button (48:5403): 1pt border, radius 12, light grey icon and label. */
function AddButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.add, pressed && styles.addPressed, style]}
      accessibilityRole="button"
      accessibilityLabel="Add Payment Method"
    >
      <Icon name="add" size={24} color="iconButtonMuted" />
      <Text variant="subText14" weight="medium" color="iconButtonMuted">
        Add Payment Method
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  // Figma: title at y419 in a 926 frame, i.e. vertically centred under the header.
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },
  emptyTitle: {
    letterSpacing: 0.2,
  },
  emptyBody: {
    marginTop: 14,
    maxWidth: 330,
  },
  emptyButton: {
    marginTop: 33,
  },
  list: {
    paddingTop: 20,
    gap: 16,
  },
  row: {
    minHeight: 70,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
  add: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  addPressed: {
    opacity: 0.85,
  },
  addAnother: {
    marginTop: 8,
  },
  options: {
    paddingTop: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionsTitle: {
    marginBottom: 8,
  },
});
