import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface Star {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function Twinkle({ star, color }: { star: Star; color: string }) {
  const o = useSharedValue(0);

  useEffect(() => {
    o.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: star.duration * 0.4, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: star.duration * 0.6, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, [o, star.delay, star.duration]);

  const aStyle = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        {
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: color,
        },
        aStyle,
      ]}
    />
  );
}

export function Starfield({
  count = 24,
  color = "rgba(255,255,255,0.95)",
  seed = 1,
}: {
  count?: number;
  color?: string;
  seed?: number;
}) {
  const stars = useMemo<Star[]>(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => ({
      x: rnd() * 100,
      y: rnd() * 100,
      size: 1.5 + rnd() * 2.5,
      delay: rnd() * 2400,
      duration: 1600 + rnd() * 2400,
    }));
  }, [count, seed]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((star, i) => (
        <Twinkle key={i} star={star} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: "absolute" },
});
