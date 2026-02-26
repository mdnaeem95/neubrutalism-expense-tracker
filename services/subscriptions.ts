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

let isConfigured = false;

export async function initializeSubscriptions() {
  if (!nativePurchasesAvailable || isConfigured) return;
  try {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
  } catch (error) {
    console.error('[Subscriptions] configure failed:', error);
  }
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!nativePurchasesAvailable || !isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('[Subscriptions] checkStatus failed:', error);
    return false;
  }
}

async function getPackage(identifier: string): Promise<any | null> {
  if (!isConfigured) {
    console.warn('[Subscriptions] getPackage called before configure');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      console.warn('[Subscriptions] No current offering available');
      return null;
    }
    const pkg = current.availablePackages.find((p: any) => p.identifier === identifier) ?? null;
    if (!pkg) {
      console.warn(`[Subscriptions] Package "${identifier}" not found. Available:`,
        current.availablePackages.map((p: any) => p.identifier));
    }
    return pkg;
  } catch (error) {
    console.error('[Subscriptions] getPackage failed:', error);
    return null;
  }
}

export async function purchaseMonthly(): Promise<boolean> {
  if (!nativePurchasesAvailable) throw new Error('Purchases not available');
  if (!isConfigured) await initializeSubscriptions();

  const pkg = await getPackage('$rc_monthly');
  if (!pkg) {
    // Fallback: try the monthly convenience property
    const offerings = await Purchases.getOfferings();
    const monthly = offerings.current?.monthly;
    if (!monthly) throw new Error('Monthly package not available. Check RevenueCat offering configuration.');
    const { customerInfo } = await Purchases.purchasePackage(monthly);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function purchaseYearly(): Promise<boolean> {
  if (!nativePurchasesAvailable) throw new Error('Purchases not available');
  if (!isConfigured) await initializeSubscriptions();

  const pkg = await getPackage('$rc_annual');
  if (!pkg) {
    // Fallback: try the annual convenience property
    const offerings = await Purchases.getOfferings();
    const annual = offerings.current?.annual;
    if (!annual) throw new Error('Yearly package not available. Check RevenueCat offering configuration.');
    const { customerInfo } = await Purchases.purchasePackage(annual);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function getAppUserID(): Promise<string | null> {
  if (!nativePurchasesAvailable || !isConfigured) return null;
  try {
    return await Purchases.getAppUserID();
  } catch (error) {
    console.error('[Subscriptions] getAppUserID failed:', error);
    return null;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!nativePurchasesAvailable) throw new Error('Purchases not available');
  if (!isConfigured) await initializeSubscriptions();
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
