import { Redirect } from 'expo-router';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function Index() {
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
