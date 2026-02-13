/**
 * Fokus Neubrutalism Design System
 * Warm cream backgrounds, SpaceMono monospace, candy-bright accents,
 * solid offset shadows, thick visible borders.
 */

export const lightColors = {
  // Accent colors — semantic mapping for expense tracker
  hotPink: '#FF6B9D',       // Primary / CTA / add expense
  electricBlue: '#4D96FF',  // Info / expenses list
  brightYellow: '#FFD93D',  // Settings / warnings / premium
  limeGreen: '#6BCB77',     // Stats / success / analytics

  // Convenience aliases
  primary: '#FF6B9D',
  secondary: '#4D96FF',
  accent: '#FFD93D',
  green: '#6BCB77',
  blue: '#4D96FF',
  purple: '#A855F7',
  pink: '#FF6B9D',
  orange: '#FB923C',

  // Neutrals
  background: '#FFF8E7',
  surface: '#FFFFFF',
  border: '#1A1A2E',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',

  // Semantic
  success: '#6BCB77',
  error: '#EF4444',
  warning: '#FFD93D',

  // Card tint backgrounds
  cardTintPink: '#FFE0EB',
  cardTintBlue: '#DCE8FF',
  cardTintGreen: '#D4F5DD',
  cardTintYellow: '#FFF4D1',
  cardTintRed: '#FEE2E2',
  cardTintPurple: '#F3E8FF',
  cardTintOrange: '#FFF4E6',
  cardTintTeal: '#EDFAF8',
  cardTintGray: '#F0F0F0',
  cardTintCream: '#FFF8E7',

  onPrimary: '#1A1A2E',

  overlay: 'rgba(26, 26, 46, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.9)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  categoryColors: [
    '#FF6B9D', '#4D96FF', '#6BCB77', '#FFD93D',
    '#EF4444', '#A855F7', '#FB923C', '#9CA3AF',
  ],
};

export const darkColors: typeof lightColors = {
  hotPink: '#FF85B1',
  electricBlue: '#6DAAFF',
  brightYellow: '#FFE066',
  limeGreen: '#85D694',

  primary: '#FF85B1',
  secondary: '#6DAAFF',
  accent: '#FFE066',
  green: '#85D694',
  blue: '#6DAAFF',
  purple: '#C084FC',
  pink: '#FF85B1',
  orange: '#FDBA74',

  background: '#161625',
  surface: '#1E1E32',
  border: '#C8C8D0',
  text: '#F0F0F5',
  textSecondary: '#9898A8',
  textLight: '#686878',

  success: '#85D694',
  error: '#FCA5A5',
  warning: '#FFE066',

  cardTintPink: '#2D1F25',
  cardTintBlue: '#1F1F2D',
  cardTintGreen: '#1F2D1F',
  cardTintYellow: '#2D2A1F',
  cardTintRed: '#2D1F1F',
  cardTintPurple: '#251F2D',
  cardTintOrange: '#2D251F',
  cardTintTeal: '#1F2D2A',
  cardTintGray: '#252530',
  cardTintCream: '#2A2A1F',

  onPrimary: '#1A1A2E',

  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayHeavy: 'rgba(0, 0, 0, 0.95)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  categoryColors: [
    '#FF85B1', '#6DAAFF', '#85D694', '#FFE066',
    '#FCA5A5', '#C084FC', '#FDBA74', '#9CA3AF',
  ],
};

export type ThemeColors = typeof lightColors;

/** @deprecated Use useTheme() hook instead. */
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

function createBorders(c: ThemeColors) {
  return {
    thin: 1.5,
    medium: 2.5,
    thick: 3.5,
    /** @deprecated Use .medium for default border width */
    width: 2.5,
    color: c.border,
  } as const;
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
    h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36, color: c.text, fontFamily: 'SpaceMono_700Bold', textTransform: 'uppercase' as const, letterSpacing: 2 },
    h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30, color: c.text, fontFamily: 'SpaceMono_700Bold' },
    h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 26, color: c.text, fontFamily: 'SpaceMono_700Bold' },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, color: c.text, fontFamily: 'SpaceMono_400Regular' },
    bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, color: c.textSecondary, fontFamily: 'SpaceMono_400Regular' },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, color: c.textSecondary, fontFamily: 'SpaceMono_400Regular', textTransform: 'uppercase' as const, letterSpacing: 1 },
    label: { fontSize: 14, fontWeight: '700' as const, lineHeight: 20, color: c.text, fontFamily: 'SpaceMono_700Bold', textTransform: 'uppercase' as const, letterSpacing: 2 },
    amount: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, color: c.text, fontFamily: 'SpaceMono_700Bold' },
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
  { id: 'cash', label: 'Cash', icon: 'cash' },
  { id: 'card', label: 'Card', icon: 'credit-card-outline' },
  { id: 'bank', label: 'Bank', icon: 'bank-outline' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal' },
] as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'food-fork-drink', color: '#FF6B9D' },
  { name: 'Transport', icon: 'car', color: '#4D96FF' },
  { name: 'Shopping', icon: 'shopping', color: '#A855F7' },
  { name: 'Entertainment', icon: 'filmstrip', color: '#FFD93D' },
  { name: 'Bills & Utilities', icon: 'flash', color: '#EF4444' },
  { name: 'Health', icon: 'heart-outline', color: '#6BCB77' },
  { name: 'Education', icon: 'book-open-variant', color: '#4D96FF' },
  { name: 'Other', icon: 'cube-outline', color: '#9CA3AF' },
] as const;

export const CATEGORY_ICON_OPTIONS = [
  'food-fork-drink', 'car', 'shopping', 'filmstrip',
  'flash', 'heart-outline', 'book-open-variant', 'cube-outline',
  'home-outline', 'airplane', 'gamepad-variant-outline', 'briefcase-outline',
  'music-note', 'paw', 'dumbbell', 'coffee-outline',
  'cart-outline', 'gift-outline', 'earth', 'hammer',
  'laptop', 'medical-bag', 'tshirt-crew-outline', 'trophy-outline',
] as const;
