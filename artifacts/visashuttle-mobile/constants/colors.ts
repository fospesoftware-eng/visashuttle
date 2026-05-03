// Source of truth: the HSL CSS custom properties declared in
// `artifacts/visa-shuttle/src/index.css` under `:root` (light) and `.dark`.
// Each color below is the direct HSL→hex conversion of the matching token
// from that file (the original HSL value is noted in a comment alongside it).
// Keep this file in sync whenever the web theme tokens change.

const brand = {
  // Brand gradient stops (Logo: Electric Blue → Purple → Hot Pink)
  gradientStart: "#4055FF",
  gradientMid: "#9033F5",
  gradientEnd: "#FF2060",
};

export interface ColorPalette {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  warning: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
}

const light: ColorPalette = {
  // hsl(220 15% 15%)
  text: "#21242C",
  // hsl(233 100% 63%)
  tint: "#4258FF",
  // hsl(210 20% 98%)
  background: "#F9FAFB",
  // hsl(220 15% 15%)
  foreground: "#21242C",
  // hsl(0 0% 100%)
  card: "#FFFFFF",
  cardForeground: "#21242C",
  // hsl(233 100% 63%)
  primary: "#4258FF",
  primaryForeground: "#FFFFFF",
  // hsl(338 100% 57%)
  secondary: "#FF2474",
  secondaryForeground: "#FFFFFF",
  // hsl(271 85% 60%)
  accent: "#9C42F0",
  accentForeground: "#FFFFFF",
  // hsl(220 20% 94%)
  muted: "#EDEFF3",
  // hsl(220 10% 45%)
  mutedForeground: "#676F7E",
  // hsl(0 84% 50%)
  destructive: "#EB1414",
  destructiveForeground: "#FFFFFF",
  // hsl(220 15% 90%)
  border: "#E2E4E9",
  // hsl(220 15% 80%)
  input: "#C4C9D4",
  // hsl(233 100% 63%)
  ring: "#4258FF",
  // hsl(150 60% 45%) — chart-4 (success)
  success: "#2EB873",
  // hsl(30 100% 55%) — chart-5 (warning)
  warning: "#FF8C1A",
  ...brand,
};

const dark: ColorPalette = {
  text: "#F0F2F5",
  // hsl(233 100% 68%)
  tint: "#5C6FFF",
  // hsl(220 20% 8%)
  background: "#101318",
  // hsl(210 20% 95%)
  foreground: "#F0F2F5",
  // hsl(220 18% 11%)
  card: "#171A21",
  cardForeground: "#F0F2F5",
  // hsl(233 100% 68%)
  primary: "#5C6FFF",
  primaryForeground: "#FFFFFF",
  // hsl(338 100% 62%)
  secondary: "#FF3D84",
  secondaryForeground: "#FFFFFF",
  // hsl(271 80% 65%)
  accent: "#A85EED",
  accentForeground: "#FFFFFF",
  // hsl(220 15% 16%)
  muted: "#23272F",
  // hsl(210 15% 60%)
  mutedForeground: "#8A99A8",
  // hsl(0 75% 45%)
  destructive: "#C91D1D",
  destructiveForeground: "#FFFFFF",
  // hsl(220 15% 18%)
  border: "#272C35",
  // hsl(220 15% 25%)
  input: "#363D49",
  // hsl(233 100% 68%)
  ring: "#5C6FFF",
  // hsl(150 55% 50%)
  success: "#39C680",
  // hsl(30 100% 60%)
  warning: "#FF9933",
  ...brand,
};

const colors = {
  light,
  dark,
  // CSS `--radius: .5rem` = 8px. We expose 8 here; existing screens that need
  // larger surface radii (cards, sheets) compose multiples of this base.
  radius: 8,
};

export default colors;
