import AsyncStorage from '@react-native-async-storage/async-storage';

// "Moment Groups" intro (48:6274) shows the first time someone creates a
// group on this device; after that "+" goes straight to New Group.

const KEY = 'moment.groups-intro-seen.v1';

export async function hasSeenGroupsIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markGroupsIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1').catch(() => undefined);
}
