// Enhanced design system - warmer, more energetic

export const colors = {
  // Lighter, more visible backgrounds
  background: '#0F1419',
  backgroundLight: '#1C2128',
  surface: '#2D333B',
  surfaceLight: '#373E47',
  
  // Warm, energetic primaries
  primary: '#FF6B35',
  primaryDark: '#E85A2B',
  primaryLight: '#FF8C5F',
  primaryGlow: '#FF8C5F',
  
  // Gradients
  gradientStart: '#FF6B35',
  gradientEnd: '#F72585',
  
  secondary: '#F72585',
  secondaryDark: '#DD1171',
  secondaryLight: '#FF4DA0',
  
  success: '#06FFA5',
  warning: '#FFB800',
  error: '#FF3B3B',
  
  // Better contrast text
  text: '#FFFFFF',
  textSecondary: '#C9D1D9',
  textTertiary: '#8B949E',
  
  overlay: 'rgba(15, 20, 25, 0.8)',
  overlayLight: 'rgba(15, 20, 25, 0.4)',
  
  reactionHeart: '#FF3B3B',
  reactionFire: '#FF6B35',
  reactionHundred: '#06FFA5',
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const borderRadius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const typography = {
  hero: {
    fontSize: 56,
    fontWeight: '900' as const,
    lineHeight: 64,
    letterSpacing: -2,
  },
  display: {
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
} as const;

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;