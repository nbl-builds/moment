import AsyncStorage from '@react-native-async-storage/async-storage';

// "Skip for now" on the login sheet browses as a guest. Remembered on the
// device so a relaunch goes straight to Home; signing out clears it.

const KEY = 'moment.guestMode';

export async function setGuestMode(on: boolean): Promise<void> {
  try {
    if (on) await AsyncStorage.setItem(KEY, '1');
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Not remembering is harmless: the next launch shows onboarding.
  }
}

export async function isGuestMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}
