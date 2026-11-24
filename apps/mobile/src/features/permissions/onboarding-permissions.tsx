import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { PermissionSheet } from './permission-sheet';

type Step = 'checking' | 'location' | 'notifications' | 'done';

/**
 * After sign up: "Allow location" then "Turn on notifications" (Figma 20:2787,
 * 20:2936), each only if the OS has not been asked yet. Permission prompts only;
 * push tokens are registered later with notifications.
 */
export function OnboardingPermissions({ onFinished }: { onFinished?: () => void }) {
  const [step, setStep] = useState<Step>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await firstStep();
      if (!cancelled) setStep(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step === 'done') onFinished?.();
  }, [step, onFinished]);

  const afterLocation = async () => setStep((await notificationsUndetermined()) ? 'notifications' : 'done');

  return (
    <>
      <PermissionSheet
        visible={step === 'location'}
        icon={require('../../../assets/illustrations/location-pin.svg')}
        title="Allow location"
        body="This helps us personalize recommendation and deals for you. You’re in control. Turn off sharing anytime you want."
        confirmLabel="Yes, Allow"
        onConfirm={() => Location.requestForegroundPermissionsAsync()}
        onDone={afterLocation}
      />
      <PermissionSheet
        visible={step === 'notifications'}
        icon={require('../../../assets/illustrations/notification-ringing.svg')}
        title="Turn on notifications"
        body="Don’t miss important messages like changes in your reservation and account activity."
        confirmLabel="Yes, notify me"
        onConfirm={() => Notifications.requestPermissionsAsync()}
        onDone={() => setStep('done')}
      />
    </>
  );
}

async function firstStep(): Promise<Step> {
  if (await locationUndetermined()) return 'location';
  if (await notificationsUndetermined()) return 'notifications';
  return 'done';
}

async function locationUndetermined(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return status === Location.PermissionStatus.UNDETERMINED && canAskAgain;
  } catch {
    return false;
  }
}

async function notificationsUndetermined(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return status === Notifications.PermissionStatus.UNDETERMINED && canAskAgain;
  } catch {
    return false;
  }
}
