import { Platform } from 'react-native';

// Native module only available on iOS with native build — lazy-load
let donateShortcutFn: any = null;
let presentShortcutFn: any = null;
let addShortcutListener: any = null;
let getInitialShortcut: any = null;
let AddToSiriButton: any = null;
let SiriButtonStyles: any = null;
let nativeSiriAvailable = false;

try {
  if (Platform.OS === 'ios') {
    const SiriShortcut = require('react-native-siri-shortcut');
    donateShortcutFn = SiriShortcut.donateShortcut;
    presentShortcutFn = SiriShortcut.presentShortcut;
    addShortcutListener = SiriShortcut.addShortcutListener;
    getInitialShortcut = SiriShortcut.getInitialShortcut;
    AddToSiriButton = SiriShortcut.AddToSiriButton;
    SiriButtonStyles = SiriShortcut.SiriButtonStyles;
    nativeSiriAvailable = true;
    console.log('[Siri] Module loaded:', {
      donate: !!donateShortcutFn,
      present: !!presentShortcutFn,
      listener: !!addShortcutListener,
      button: !!AddToSiriButton,
    });
  }
} catch (error) {
  console.error('[Siri] Failed to load native module:', error);
}

const ADD_EXPENSE_ACTIVITY_TYPE = 'com.ledgr.app.add-expense';

export const ADD_EXPENSE_SHORTCUT = {
  activityType: ADD_EXPENSE_ACTIVITY_TYPE,
  title: 'Add Expense',
  suggestedInvocationPhrase: 'New expense',
  isEligibleForSearch: true,
  isEligibleForPrediction: true,
  needsSave: true,
  keywords: ['expense', 'add', 'money', 'spending', 'ledgr', 'log'],
  persistentIdentifier: ADD_EXPENSE_ACTIVITY_TYPE,
  userInfo: { href: '/(tabs)/add' },
};

export function donateAddExpenseShortcut() {
  if (!nativeSiriAvailable || !donateShortcutFn) {
    console.warn('[Siri] donateShortcut skipped:', { nativeSiriAvailable, fn: !!donateShortcutFn });
    return;
  }
  try {
    donateShortcutFn(ADD_EXPENSE_SHORTCUT);
  } catch (error) {
    console.error('[Siri] donateShortcut failed:', error);
  }
}

export function presentAddExpenseShortcut(
  callback: (data: { status: string; phrase?: string }) => void,
) {
  if (!nativeSiriAvailable || !presentShortcutFn) {
    console.warn('[Siri] presentShortcut skipped:', { nativeSiriAvailable, fn: !!presentShortcutFn });
    return;
  }
  try {
    presentShortcutFn(ADD_EXPENSE_SHORTCUT, callback);
  } catch (error) {
    console.error('[Siri] presentShortcut failed:', error);
  }
}

export {
  nativeSiriAvailable,
  addShortcutListener,
  getInitialShortcut,
  AddToSiriButton,
  SiriButtonStyles,
  ADD_EXPENSE_ACTIVITY_TYPE,
};
