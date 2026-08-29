// Single source of truth for the "Nexus Evolved" dark design system.
// Pass these as plain string props — do not register as Tamagui custom
// tokens (the RC typings don't accept them reliably).

export const palette = {
  background: "#07090D",
  surface: "#0E1218",
  surfaceElevated: "#151B25",
  surfaceHighest: "#1A212D",
  border: "#1E2634",
  borderStrong: "#2A3346",
  primary: "#2F80ED",
  primaryBright: "#5AA4F5",
  primaryDeep: "#1B5FCC",
  primarySoft: "rgba(47, 128, 237, 0.16)",
  accent: "#4CC9F0",
  text: "#F2F5FA",
  textSecondary: "#8B94A7",
  textTertiary: "#5C6474",
  success: "#22C55E",
  successDeep: "#0E7A45",
  warning: "#F5A623",
  danger: "#F87171",
  dangerDeep: "#7F1D1D",
  glass: "rgba(14, 18, 24, 0.72)",
  gradient: {
    primary: ["#1B5FCC", "#2F80ED", "#5AA4F5"],
    success: ["#0E7A45", "#22C55E"],
    accent: ["#134E5E", "#4CC9F0"],
    hero: ["#101726", "#1A2338"],
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// Paired iOS shadow + Android elevation for consistent depth.
export const shadow = (elevation = 2) => ({
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: elevation * 2 },
  elevation,
});

export const statusColor = {
  active: palette.success,
  received: palette.success,
  pending: palette.warning,
  shipped: palette.accent,
  inactive: palette.danger,
  rejected: palette.danger,
  default: palette.textTertiary,
} as const;

export const statusColorFor = (status?: string): string => {
  const key = status?.toLowerCase() as keyof typeof statusColor;
  return statusColor[key] ?? statusColor.default;
};
