import { Platform } from 'react-native';

// Native module may not be available in Expo Go — lazy-load to avoid crash
let QuickActions: any = null;
let nativeQuickActionsAvailable = false;

try {
  QuickActions = require('expo-quick-actions');
  nativeQuickActionsAvailable = true;
} catch {
  // Native module not available (Expo Go) — quick actions will be no-ops
}

export function setupQuickActions() {
  if (!nativeQuickActionsAvailable) return;

  QuickActions.setItems([
    {
      id: 'add-expense',
      title: 'Add Expense',
      subtitle: Platform.OS === 'ios' ? 'Quickly log a new expense' : undefined,
      icon: Platform.OS === 'ios' ? 'symbol:plus.circle.fill' : undefined,
      params: { href: '/(tabs)/add' },
    },
  ]);
}

export { nativeQuickActionsAvailable };
