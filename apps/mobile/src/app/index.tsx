import { Redirect } from 'expo-router';

// Entry route. Everyone starts at onboarding for now; once auth exists this
// decides between onboarding, sign in and home.
export default function Index() {
  return <Redirect href="/onboarding" />;
}
