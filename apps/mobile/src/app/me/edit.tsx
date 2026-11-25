import {
  changeEmailSchema,
  colors,
  emergencyContactSchema,
  formatPkPhone,
  formatPkPhoneInput,
  maskEmail,
  maskPhone,
  personalDetailsSchema,
  PRONOUNS,
  splitDisplayName,
} from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Input, Text, textStyle } from '@/components/ui';
import { setGuestMode } from '@/features/auth/guest-mode';
import { resetTo } from '@/features/auth/sign-in-flow';
import { useMyProfile } from '@/features/auth/use-session';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { PhoneSheet } from '@/features/booking/components/phone-sheet';
import { ConfirmSheet } from '@/features/groups/components/confirm-sheet';
import { InfoCard } from '@/features/profile/components/info-card';
import { PageHeader, TextLink } from '@/features/profile/components/page-header';
import { requestAccountDeletion } from '@/features/profile/mock';
import { api } from '@/lib/api';

type Sheet = 'pronouns' | 'email' | 'phone' | 'emergency' | 'delete' | null;
type Me = NonNullable<ReturnType<typeof useMyProfile>['data']>;

/** Edit personal info (48:3617). Emergency contact and the edit sheets have no frames. */
export default function EditPersonalInfoScreen() {
  const me = useMyProfile();
  if (!me.data) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Profile" />
        {me.isPending ? (
          <ActivityIndicator color={colors.secondary} style={styles.loading} />
        ) : (
          <View style={styles.loading}>
            <Button label="Try again" size="small" variant="dark" onPress={() => void me.refetch()} style={styles.center} />
          </View>
        )}
      </View>
    );
  }
  return <EditForm me={me.data} />;
}

function EditForm({ me }: { me: Me }) {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const d = me.private;
  const fallback = splitDisplayName(me.profile.display_name);
  const [firstName, setFirstName] = useState(d?.first_name ?? fallback.firstName);
  const [lastName, setLastName] = useState(d?.last_name ?? fallback.lastName);
  const [pronouns, setPronouns] = useState(d?.pronouns ?? '');
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    firstName.trim() !== (d?.first_name ?? fallback.firstName) ||
    lastName.trim() !== (d?.last_name ?? fallback.lastName) ||
    pronouns !== (d?.pronouns ?? '');

  const save = async () => {
    const parsed = personalDetailsSchema.safeParse({ firstName, lastName, pronouns });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'firstName' || key === 'lastName') && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      await api.profile.updateDetails(parsed.data);
      await client.invalidateQueries({ queryKey: ['me'] });
      showToast('Saved');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t save your details');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await requestAccountDeletion({});
      await api.auth.signOut().catch(() => undefined);
      await setGuestMode(false);
      setSheet(null);
      showToast('Your account will be deleted in 30 days. Sign in before then to cancel.');
      resetTo('/onboarding');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t request deletion');
      setDeleting(false);
    }
  };

  const contact = d?.emergency_contact_name && d.emergency_contact_phone ? d : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHeader title="Profile" right={saving ? <ActivityIndicator color={colors.black} /> : <TextLink label="Save" onPress={() => void save()} disabled={!dirty} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Field label="First Name*" value={firstName} error={errors.firstName} onChange={(t) => (setFirstName(t), setErrors((e) => ({ ...e, firstName: undefined })))} />
          <Field label="Last Name*" value={lastName} error={errors.lastName} onChange={(t) => (setLastName(t), setErrors((e) => ({ ...e, lastName: undefined })))} />
          <View>
            <Text variant="subText14" weight="medium" color="black">
              Pronouns
            </Text>
            <Pressable
              onPress={() => setSheet('pronouns')}
              style={styles.field}
              accessibilityRole="button"
              accessibilityLabel={`Pronouns, ${pronouns || 'not set'}`}
            >
              <Text variant="subText16" color={pronouns ? 'black' : 'optionSelected'} style={styles.flex}>
                {pronouns || 'Choose'}
              </Text>
              <Icon name="chevron-down" size={16} color="black" />
            </Pressable>
          </View>
        </View>

        <View style={styles.cards}>
          <InfoCard title="Email" subtitle={d?.email ? maskEmail(d.email) : 'Add an email for receipts.'} action={d?.email ? 'Edit' : 'Add'} onAction={() => setSheet('email')} />
          <InfoCard title="Phone Number" subtitle={d?.phone ? maskPhone(d.phone) : 'Add a number for trip updates.'} action={d?.phone ? 'Edit' : 'Add'} onAction={() => setSheet('phone')} />
          <InfoCard
            title="Emergency Contact"
            subtitle={contact ? `${contact.emergency_contact_name} (${contact.emergency_contact_relation}) · ${formatPkPhone(contact.emergency_contact_phone ?? '', 'national')}` : 'Click edit to add number.'}
            action={contact ? 'Edit' : 'Add'}
            onAction={() => setSheet('emergency')}
          />
        </View>

        <Button label="Delete Account" variant="quiet" onPress={() => setSheet('delete')} style={styles.delete} />
      </ScrollView>

      <BookingSheet visible={sheet === 'pronouns'} onClose={() => setSheet(null)} title="Pronouns" top={440}>
        <View style={styles.options}>
          {['', ...PRONOUNS].map((p) => {
            const selected = p === pronouns;
            return (
              <Pressable
                key={p || 'none'}
                onPress={() => {
                  setPronouns(p);
                  setSheet(null);
                }}
                style={[styles.option, selected && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text variant="subText16" weight={selected ? 'bold' : 'medium'} color="black" style={styles.flex}>
                  {p || 'Prefer not to say'}
                </Text>
                {selected && <Icon name="check" size={20} color="black" />}
              </Pressable>
            );
          })}
        </View>
      </BookingSheet>

      <EmailSheet visible={sheet === 'email'} current={d?.email ?? ''} onClose={() => setSheet(null)} />
      <PhoneSheet visible={sheet === 'phone'} title={d?.phone ? 'Change phone number' : 'Add phone number'} onClose={() => setSheet(null)} />
      <EmergencySheet
        visible={sheet === 'emergency'}
        initial={contact ? { name: contact.emergency_contact_name ?? '', relation: contact.emergency_contact_relation ?? '', phone: formatPkPhone(contact.emergency_contact_phone ?? '', 'national') } : null}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'delete'}
        title="Delete your account?"
        body="We’ll delete your profile, lists and groups after 30 days. Booking and payment records are kept for tax rules. Sign in before then to cancel."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void deleteAccount()}
        onClose={() => setSheet(null)}
      />
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (t: string) => void }) {
  return (
    <View>
      <Text variant="subText14" weight="medium" color="black">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.field, styles.input, error ? styles.fieldError : null]}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={50}
        accessibilityLabel={label.replace('*', ', required')}
      />
      {error ? (
        <Text variant="body12" color="error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Email > Edit: Supabase emails a confirmation link to the new address. */
function EmailSheet({ visible, current, onClose }: { visible: boolean; current: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const send = async () => {
    const parsed = changeEmailSchema.safeParse({ email });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
    if (parsed.data.email.toLowerCase() === current.toLowerCase()) return setError('That’s already your email');
    setSending(true);
    try {
      await api.auth.changeEmail(parsed.data.email);
      setEmail('');
      onClose();
      showToast(`Check ${parsed.data.email} to confirm the change`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t change your email');
    } finally {
      setSending(false);
    }
  };
  return (
    <BookingSheet
      visible={visible}
      onClose={onClose}
      title={current ? 'Change email' : 'Add email'}
      titleAlign="left"
      top={330}
      action={{ label: 'Send link', onPress: () => void send(), loading: sending, disabled: !email.includes('@') }}
    >
      <Input
        style={styles.sheetField}
        label="New email"
        helperText="We’ll send a link to confirm it. Your email changes once you tap it."
        error={error}
        value={email}
        onChangeText={(t) => (setEmail(t), setError(null))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
    </BookingSheet>
  );
}

/** Emergency contact (no frame): name, relation and a +92 number. */
function EmergencySheet({ visible, initial, onClose }: { visible: boolean; initial: { name: string; relation: string; phone: string } | null; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState(() => initial ?? { name: '', relation: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lastInitial, setLastInitial] = useState(initial);
  // Re-seed when the sheet opens with a different saved contact.
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setForm(initial ?? { name: '', relation: '', phone: '' });
  }

  const set = (key: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [key]: t }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const persist = async (value: Parameters<typeof api.profile.updateEmergencyContact>[0]) => {
    setSaving(true);
    try {
      await api.profile.updateEmergencyContact(value);
      await client.invalidateQueries({ queryKey: ['me'] });
      onClose();
      showToast(value ? 'Emergency contact saved' : 'Emergency contact removed');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t save the contact');
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const parsed = emergencyContactSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      return setErrors(next);
    }
    void persist(parsed.data);
  };

  return (
    <BookingSheet
      visible={visible}
      onClose={onClose}
      title="Emergency Contact"
      titleAlign="left"
      top={200}
      action={{ label: 'Save', onPress: save, loading: saving, disabled: !form.name.trim() || !form.phone.trim() }}
    >
      <View style={styles.sheetForm}>
        <Input label="Name" value={form.name} onChangeText={set('name')} error={errors.name || null} autoCapitalize="words" autoCorrect={false} />
        <Input label="Relation" placeholder="e.g. Sister, Father, Friend" value={form.relation} onChangeText={set('relation')} error={errors.relation || null} autoCapitalize="words" />
        <Input
          label="Phone Number"
          placeholder="0300 1234567"
          value={form.phone}
          onChangeText={(t) => set('phone')(formatPkPhoneInput(t))}
          error={errors.phone || null}
          keyboardType="phone-pad"
          helperText="We only call them if something goes wrong on a booking."
        />
        {initial && (
          <Text variant="subText14" weight="bold" color="invalid" style={styles.remove} onPress={() => void persist(null)} accessibilityRole="button">
            Remove contact
          </Text>
        )}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  loading: {
    marginTop: 80,
  },
  center: {
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  form: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.surface,
    padding: 15,
    gap: 24,
  },
  field: {
    marginTop: 10,
    height: 58,
    borderRadius: 15,
    backgroundColor: colors.track,
    paddingLeft: 18,
    paddingRight: 34,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    ...textStyle('subText16'),
    color: colors.black,
  },
  fieldError: {
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSurface,
  },
  error: {
    marginTop: 6,
  },
  cards: {
    marginTop: 16,
    gap: 16,
  },
  delete: {
    marginTop: 16,
    marginHorizontal: 20,
    alignSelf: 'stretch',
    width: undefined,
  },
  options: {
    marginTop: 12,
    marginHorizontal: 20,
    gap: 6,
  },
  option: {
    minHeight: 54,
    borderRadius: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  sheetField: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  sheetForm: {
    marginTop: 20,
    marginHorizontal: 20,
    gap: 16,
  },
  remove: {
    alignSelf: 'flex-start',
    textDecorationLine: 'underline',
  },
});
