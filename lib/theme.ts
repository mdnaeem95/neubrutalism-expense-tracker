/**
 * Neubrutalism Design System
 * Bold borders, bright colors, chunky shadows, playful typography
 * Supports light + dark themes
 */

export const lightColors = {
  primary: '#FFD60A',
  secondary: '#FF6B6B',
  accent: '#4ECDC4',
  purple: '#A855F7',
  pink: '#FF69B4',
  blue: '#60A5FA',
  green: '#34D399',
  orange: '#FB923C',

  background: '#FFFBF0',
  surface: '#FFFFFF',
  border: '#1A1A2E',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',

  success: '#34D399',
  error: '#EF4444',
  warning: '#F59E0B',

  // Semantic tint backgrounds for cards
  cardTintRed: '#FEE2E2',
  cardTintBlue: '#DBEAFE',
  cardTintGreen: '#D1FAE5',
  cardTintPurple: '#F3E8FF',
  cardTintOrange: '#FFF4E6',
  cardTintTeal: '#EDFAF8',
  cardTintYellow: '#FFF8E0',
  cardTintGray: '#F0F0F0',
  cardTintPink: '#FFF0F0',
  cardTintCream: '#FFFEF0',

  onPrimary: '#1A1A2E',

  overlay: 'rgba(26, 26, 46, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.9)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  categoryColors: [
    '#FF6B6B', '#60A5FA', '#A855F7', '#FF69B4',
    '#FFD60A', '#34D399', '#4ECDC4', '#FB923C',
  ],
};

export const darkColors: typeof lightColors = {
  primary: '#FFD60A',
  secondary: '#FF6B6B',
  accent: '#4ECDC4',
  purple: '#C084FC',
  pink: '#FF69B4',
  blue: '#93C5FD',
  green: '#6EE7B7',
  orange: '#FDBA74',

  background: '#161625',
  surface: '#1E1E32',
  border: '#C8C8D0',
  text: '#F0F0F5',
  textSecondary: '#9898A8',
  textLight: '#686878',

  success: '#6EE7B7',
  error: '#FCA5A5',
  warning: '#FCD34D',

  cardTintRed: '#2D1F1F',
  cardTintBlue: '#1F1F2D',
  cardTintGreen: '#1F2D1F',
  cardTintPurple: '#251F2D',
  cardTintOrange: '#2D251F',
  cardTintTeal: '#1F2D2A',
  cardTintYellow: '#2D2A1F',
  cardTintGray: '#252530',
  cardTintPink: '#2D1F22',
  cardTintCream: '#2A2A1F',

  onPrimary: '#1A1A2E',

  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayHeavy: 'rgba(0, 0, 0, 0.95)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  categoryColors: [
    '#FF6B6B', '#93C5FD', '#C084FC', '#FF69B4',
    '#FFD60A', '#6EE7B7', '#4ECDC4', '#FDBA74',
  ],
};

export type ThemeColors = typeof lightColors;

/** @deprecated Use useTheme() hook instead. Kept for backward compat during migration. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

function createBorders(c: ThemeColors) {
  return { width: 3, color: c.border } as const;
}

function createShadows(c: ThemeColors) {
  const shadowColor = c === darkColors ? '#000000' : c.border;
  return {
    small: { offset: { x: 2, y: 2 }, color: shadowColor },
    medium: { offset: { x: 4, y: 4 }, color: shadowColor },
    large: { offset: { x: 6, y: 6 }, color: shadowColor },
    pressed: { offset: { x: 1, y: 1 }, color: shadowColor },
  } as const;
}

function createTypography(c: ThemeColors) {
  return {
    h1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, color: c.text },
    h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, color: c.text },
    h3: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28, color: c.text },
    body: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24, color: c.text },
    bodySmall: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, color: c.textSecondary },
    caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, color: c.textSecondary },
    label: { fontSize: 14, fontWeight: '700' as const, lineHeight: 20, color: c.text },
    amount: { fontSize: 36, fontWeight: '800' as const, lineHeight: 44, color: c.text },
  } as const;
}

export type ThemeTypography = ReturnType<typeof createTypography>;
export type ThemeBorders = ReturnType<typeof createBorders>;
export type ThemeShadows = ReturnType<typeof createShadows>;

export interface AppTheme {
  colors: ThemeColors;
  typography: ThemeTypography;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  isDark: boolean;
}

export function createTheme(mode: 'light' | 'dark'): AppTheme {
  const c = mode === 'dark' ? darkColors : lightColors;
  return {
    colors: c,
    typography: createTypography(c),
    borders: createBorders(c),
    shadows: createShadows(c),
    isDark: mode === 'dark',
  };
}

/** @deprecated Use useTheme() */
export const borders = createBorders(lightColors);
/** @deprecated Use useTheme() */
export const shadows = createShadows(lightColors);
/** @deprecated Use useTheme() */
export const typography = createTypography(lightColors);

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
] as const;

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'card', label: 'Card', icon: 'card-outline' },
  { id: 'bank', label: 'Bank', icon: 'business-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'restaurant-outline', color: '#FF6B6B' },
  { name: 'Transport', icon: 'car-outline', color: '#60A5FA' },
  { name: 'Shopping', icon: 'bag-outline', color: '#A855F7' },
  { name: 'Entertainment', icon: 'film-outline', color: '#FF69B4' },
  { name: 'Bills & Utilities', icon: 'flash-outline', color: '#FFD60A' },
  { name: 'Health', icon: 'heart-outline', color: '#34D399' },
  { name: 'Education', icon: 'book-outline', color: '#4ECDC4' },
  { name: 'Other', icon: 'cube-outline', color: '#9CA3AF' },
] as const;

export const CATEGORY_ICON_OPTIONS = [
  'restaurant-outline', 'car-outline', 'bag-outline', 'film-outline',
  'flash-outline', 'heart-outline', 'book-outline', 'cube-outline',
  'home-outline', 'airplane-outline', 'game-controller-outline', 'briefcase-outline',
  'musical-notes-outline', 'paw-outline', 'barbell-outline', 'cafe-outline',
  'cart-outline', 'gift-outline', 'globe-outline', 'hammer-outline',
  'laptop-outline', 'medkit-outline', 'shirt-outline', 'trophy-outline',
] as const;
