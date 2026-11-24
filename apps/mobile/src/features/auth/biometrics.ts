import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// "Passcode & Face ID" (Figma 7:999). The choice lives on this device only, in
// the Keychain / Keystore via SecureStore. Nothing about it is ever sent to the
// server, and the OS never shares Face ID data with the app.

const FACE_ID_KEY = 'moment.biometricSignIn';

export type BiometricAvailability = 'available' | 'not_enrolled' | 'unsupported';

/** Whether this device can use Face ID / fingerprint right now. */
export async function biometricAvailability(): Promise<BiometricAvailability> {
  if (!(await LocalAuthentication.hasHardwareAsync())) return 'unsupported';
  return (await LocalAuthentication.isEnrolledAsync()) ? 'available' : 'not_enrolled';
}

export async function isBiometricSignInEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(FACE_ID_KEY)) === 'on';
  } catch {
    return false;
  }
}

export type EnableResult =
  | { status: 'enabled' | 'cancelled' | 'not_enrolled' | 'unsupported' }
  | { status: 'failed'; error: string };

const CANCEL_ERRORS = new Set(['user_cancel', 'system_cancel', 'app_cancel']);

/**
 * Asks for Face ID once to confirm it works, then remembers the choice on this
 * device. Returns why it did not enable otherwise.
 */
export async function enableBiometricSignIn(): Promise<EnableResult> {
  const availability = await biometricAvailability();
  if (availability !== 'available') return { status: availability };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Activate Face ID',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });
  if (!result.success) {
    return CANCEL_ERRORS.has(result.error) ? { status: 'cancelled' } : { status: 'failed', error: result.error };
  }

  await SecureStore.setItemAsync(FACE_ID_KEY, 'on', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return { status: 'enabled' };
}

export async function disableBiometricSignIn(): Promise<void> {
  await SecureStore.deleteItemAsync(FACE_ID_KEY);
}
