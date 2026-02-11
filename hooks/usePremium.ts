import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';

export function usePremium() {
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const router = useRouter();

  const requirePremium = useCallback(
    (callback: () => void) => {
      if (isPremium) {
        callback();
      } else {
        router.push('/paywall');
      }
    },
    [isPremium, router]
  );

  return { isPremium, requirePremium };
}
