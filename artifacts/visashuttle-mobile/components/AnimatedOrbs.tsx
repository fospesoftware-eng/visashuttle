import { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface OrbProps {
  size: number;
  colors: [string, string];
  delay?: number;
  duration?: number;
  position: ViewStyle;
  drift?: { x: number; y: number };
}

function Orb({ size, colors, delay = 0, duration = 6000, position, drift = { x: 30, y: 30 } }: OrbProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(drift.x, { duration: duration * 0.5, easing: Easing.inOut(Easing.quad) }),
        withTiming(-drift.x, { duration: duration * 0.5, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(drift.y, { duration: duration * 0.6, easing: Easing.inOut(Easing.quad) }),
        withTiming(-drift.y, { duration: duration * 0.6, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: duration * 0.7, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.9, { duration: duration * 0.7, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    void delay;
  }, [translateX, translateY, scale, duration, drift.x, drift.y, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orbBase,
        { width: size, height: size, borderRadius: size / 2 },
        position,
        animStyle,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2, opacity: 0.55 }}
      />
    </Animated.View>
  );
}

interface AnimatedOrbsProps {
  variant?: "hero" | "header";
}

export function AnimatedOrbs({ variant = "hero" }: AnimatedOrbsProps) {
  if (variant === "header") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Orb
          size={220}
          colors={["#4055FF", "#9033F5"]}
          position={{ top: -80, left: -60 }}
          drift={{ x: 18, y: 22 }}
          duration={6500}
        />
        <Orb
          size={180}
          colors={["#9033F5", "#FF2060"]}
          position={{ top: -40, right: -70 }}
          drift={{ x: 22, y: 18 }}
          duration={7500}
          delay={400}
        />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Orb
        size={320}
        colors={["#4055FF", "#9033F5"]}
        position={{ top: -120, left: -100 }}
        drift={{ x: 30, y: 26 }}
        duration={7000}
      />
      <Orb
        size={260}
        colors={["#9033F5", "#FF2060"]}
        position={{ top: 220, right: -90 }}
        drift={{ x: 26, y: 32 }}
        duration={8500}
        delay={500}
      />
      <Orb
        size={240}
        colors={["#FF2060", "#4055FF"]}
        position={{ bottom: -80, left: -60 }}
        drift={{ x: 28, y: 24 }}
        duration={9000}
        delay={1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orbBase: { position: "absolute", overflow: "hidden" },
});
