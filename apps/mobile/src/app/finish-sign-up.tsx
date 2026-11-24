import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, colors, completeSignUpSchema, MIN_SIGNUP_AGE, type CompleteSignUp } from '@moment/shared';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { z } from 'zod';
import { DatePickerSheet } from '@/components/date-picker-sheet';
import { BackButton, Button, Icon, Input, Text } from '@/components/ui';
import { resetTo, routeAfterProfile } from '@/features/auth/sign-in-flow';
import { api } from '@/lib/api';

// Figma: "Sign Up Finishing" (7:949). Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 16, // status bar -> back chevron
  backToTitle: 30,
  titleToSubtitle: 2,
  subtitleToFields: 34.5,
  /** Between field groups (label + field): 20, then 18. */
  firstFieldGap: 20,
  fieldGap: 18,
  fieldsToTerms: 24,
  buttonAboveSafeArea: 16,
} as const;
const INSET = 20;

type FormInput = z.input<typeof completeSignUpSchema>;

const today = new Date();
const DOB_DEFAULT = new Date(today.getFullYear() - 25, 0, 1);
const DOB_MAX = new Date(today.getFullYear() - MIN_SIGNUP_AGE, today.getMonth(), today.getDate());
const DOB_MIN = new Date(1900, 0, 1);

/** "1996-03-23" -> "03 / 23 / 1996" (the field's placeholder is "mm / dd / yy"). */
function formatDob(value: string): string {
  const [y, m, d] = value.split('-');
  return y && m && d ? `${m} / ${d} / ${y}` : '';
}

export default function FinishSignUpScreen() {
  const insets = useSafeAreaInsets();
  const [pickingDob, setPickingDob] = useState(false);
  /** Email sign-ups arrive with their address, which is prefilled. */
  const { email: signUpEmail } = useLocalSearchParams<{ email?: string }>();

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, CompleteSignUp>({
    resolver: zodResolver(completeSignUpSchema),
    defaultValues: { firstName: '', lastName: '', email: signUpEmail ?? '', dateOfBirth: '', acceptTerms: true },
    mode: 'onTouched',
  });

  const dateOfBirth = useWatch({ control, name: 'dateOfBirth' });

  // Otherwise prefill the account's email, if it has one (e.g. relaunching mid sign-up).
  useEffect(() => {
    if (signUpEmail) return;
    api.auth
      .getUser()
      .then((user) => {
        if (user?.email) setValue('email', user.email);
      })
      .catch(() => undefined);
  }, [signUpEmail, setValue]);

  const onSubmit = handleSubmit(async (form) => {
    try {
      await api.auth.completeSignUp(form);
      resetTo(await routeAfterProfile());
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') {
        setError('email', { message: 'This email is already used by another account' });
      } else if (e instanceof ApiError && /email/i.test(e.message)) {
        setError('email', { message: e.message });
      } else {
        Alert.alert('Could not finish signing up', e instanceof Error ? e.message : 'Please try again.');
      }
    }
  });

  // Leaving before finishing signs out, so the next launch starts from onboarding.
  const onBack = async () => {
    await api.auth.signOut().catch(() => undefined);
    resetTo('/onboarding');
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={onBack} />

          <Text variant="h3" color="secondary" style={styles.title}>
            Finish signing up
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.subtitle}>
            We just need few more details.
          </Text>

          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                style={styles.firstField}
                label="First Name*"
                placeholder="Enter your first name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.firstName?.message}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <Input
                style={styles.field}
                label="Last Name*"
                placeholder="Enter your last name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.lastName?.message}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                style={styles.field}
                label="Email*"
                placeholder="Enter your email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
              />
            )}
          />
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field }) => (
              <Input
                style={styles.field}
                label="Date of birth*"
                placeholder="mm  /  dd  /  yy"
                value={formatDob(field.value)}
                onPress={() => {
                  Keyboard.dismiss();
                  setPickingDob(true);
                }}
                error={errors.dateOfBirth?.message}
                trailing={<Icon name="calendar" color="secondary" />}
              />
            )}
          />

          <Text variant="body12" color="black" style={styles.terms}>
            By selecting Agree and continue, I agree to Moment{' '}
            <Text variant="body12" weight="bold" color="black">
              Terms of Service,
            </Text>{' '}
            and{' '}
            <Text variant="body12" weight="bold" color="black">
              Privacy Policy.
            </Text>
          </Text>
        </ScrollView>

        <Button
          label="Agree & Continue"
          onPress={() => onSubmit()}
          loading={isSubmitting}
          style={[styles.button, { marginBottom: insets.bottom + GAP.buttonAboveSafeArea }]}
        />
      </KeyboardAvoidingView>

      <DatePickerSheet
        visible={pickingDob}
        value={dateOfBirth}
        initial={DOB_DEFAULT}
        minimumDate={DOB_MIN}
        maximumDate={DOB_MAX}
        title="Date of birth"
        onConfirm={(date) => setValue('dateOfBirth', date, { shouldValidate: true, shouldTouch: true })}
        onClose={() => setPickingDob(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: INSET,
    paddingBottom: GAP.fieldsToTerms,
  },
  title: {
    marginTop: GAP.backToTitle,
  },
  subtitle: {
    marginTop: GAP.titleToSubtitle,
    marginBottom: GAP.subtitleToFields - GAP.firstFieldGap,
  },
  firstField: {
    marginTop: GAP.firstFieldGap,
  },
  field: {
    marginTop: GAP.fieldGap,
  },
  terms: {
    marginTop: GAP.fieldsToTerms,
  },
  button: {
    marginHorizontal: INSET,
  },
});
