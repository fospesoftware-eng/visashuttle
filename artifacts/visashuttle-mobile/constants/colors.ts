const brand = {
  gradientStart: "#4055FF",
  gradientMid: "#9033F5",
  gradientEnd: "#FF2060",
};

const colors = {
  light: {
    text: "#0F172A",
    tint: "#4055FF",

    background: "#FAFAFC",
    foreground: "#1F2330",

    card: "#FFFFFF",
    cardForeground: "#1F2330",

    primary: "#4055FF",
    primaryForeground: "#FFFFFF",

    secondary: "#FF2060",
    secondaryForeground: "#FFFFFF",

    accent: "#9033F5",
    accentForeground: "#FFFFFF",

    muted: "#EEF0F5",
    mutedForeground: "#677084",

    destructive: "#E53935",
    destructiveForeground: "#FFFFFF",

    border: "#DCE0E8",
    input: "#CBD0DA",

    success: "#10B981",
    warning: "#F59E0B",

    ...brand,
  },
  dark: {
    text: "#F0F3F7",
    tint: "#7B8BFF",

    background: "#11141A",
    foreground: "#F0F3F7",

    card: "#171A22",
    cardForeground: "#F0F3F7",

    primary: "#7B8BFF",
    primaryForeground: "#FFFFFF",

    secondary: "#FF4F85",
    secondaryForeground: "#FFFFFF",

    accent: "#B26EF7",
    accentForeground: "#FFFFFF",

    muted: "#1E222B",
    mutedForeground: "#9DA4AF",

    destructive: "#F87171",
    destructiveForeground: "#FFFFFF",

    border: "#272B34",
    input: "#303641",

    success: "#34D399",
    warning: "#FBBF24",

    ...brand,
  },
  radius: 14,
};

export default colors;
