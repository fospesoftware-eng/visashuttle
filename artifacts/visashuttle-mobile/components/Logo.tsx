import { Image } from "expo-image";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

interface Props {
  size?: number;
  variant?: "default" | "white";
  showText?: boolean;
}

export function Logo({ size = 32, variant = "default", showText = false }: Props) {
  const colors = useColors();
  const src =
    variant === "white"
      ? require("@/assets/brand/logo-white.png")
      : require("@/assets/brand/logo.png");
  return (
    <View style={styles.row}>
      <Image source={src} style={{ width: size, height: size }} contentFit="contain" />
      {showText && (
        <Text
          style={{
            marginLeft: 10,
            fontFamily: "Inter_700Bold",
            fontSize: size * 0.55,
            color: variant === "white" ? "#fff" : colors.foreground,
          }}
        >
          VisaShuttle
        </Text>
      )}
    </View>
  );
}

export function BrandGradient({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
