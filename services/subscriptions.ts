import { Platform } from 'react-native';

// Native module may not be available in Expo Go — lazy-load to avoid crash
let Purchases: any = null;
let nativePurchasesAvailable = false;

try {
  Purchases = require('react-native-purchases').default;
  nativePurchasesAvailable = true;
} catch {
  // Native module not available (Expo Go) — subscriptions will be no-ops
}

// TODO: BEFORE_BUILD — Replace with your RevenueCat API keys
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_sYSuxPMlAKkpGkKGLYbydlZapZS',
  android: 'goog_YOUR_ANDROID_KEY',
}) as string;

const ENTITLEMENT_ID = 'premium';

export const OFFERINGS = {
  monthly: {
    id: 'premium_monthly',
    price: '$2.99',
    period: 'month',
  },
  yearly: {
    id: 'premium_yearly',
    price: '$24.99',
    period: 'year',
    savings: '30%',
  },
};

export const PREMIUM_FEATURES = [
  { title: 'Subscription Tracker', description: 'Monitor recurring costs', icon: 'repeat' },
  { title: 'Backup & Restore', description: 'Never lose your data', icon: 'cloud-upload-outline' },
  { title: 'CSV Import', description: 'Import from bank exports', icon: 'file-import-outline' },
  { title: 'Monthly Reports', description: 'Shareable financial recaps', icon: 'file-chart-outline' },
  { title: 'Debt Tracker', description: 'Track loans & payoff plans', icon: 'credit-card-outline' },
  { title: 'Unlimited Tags', description: 'Organize with custom labels', icon: 'tag-outline' },
  { title: 'Unlimited Templates', description: 'Quick-add frequent expenses', icon: 'lightning-bolt-outline' },
  { title: 'Advanced Analytics', description: 'Detailed charts & insights', icon: 'chart-pie' },
  { title: 'Receipt Photos', description: 'Attach receipt images', icon: 'camera-outline' },
  { title: 'No Ads', description: 'Ad-free experience', icon: 'cancel' },
];

export async function initializeSubscriptions() {
  if (!nativePurchasesAvailable) return;
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!nativePurchasesAvailable) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

async function getPackage(identifier: string): Promise<any | null> {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return current.availablePackages.find((p: any) => p.identifier === identifier) ?? null;
  } catch {
    return null;
  }
}

export async function purchaseMonthly(): Promise<boolean> {
  if (!nativePurchasesAvailable) throw new Error('Purchases not available');
  const pkg = await getPackage('$rc_monthly');
  if (!pkg) {
    // Fallback: try to purchase any monthly-like package
    const offerings = await Purchases.getOfferings();
    const monthly = offerings.current?.monthly;
    if (!monthly) throw new Error('Monthly package not available');
    const { customerInfo } = await Purchases.purchasePackage(monthly);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function purchaseYearly(): Promise<boolean> {
  if (!nativePurchasesAvailable) throw new Error('Purchases not available');
  const pkg = await getPackage('$rc_annual');
  if (!pkg) {
    const offerings = await Purchases.getOfferings();
    const annual = offerings.current?.annual;
    if (!annual) throw new Error('Yearly package not available');
    const { customerInfo } = await Purchases.purchasePackage(annual);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  if (!nativePurchasesAvailable) throw new Error('Purchases not available');
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
