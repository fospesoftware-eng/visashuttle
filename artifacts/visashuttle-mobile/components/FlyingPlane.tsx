import { useEffect } from "react";
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
import { Feather } from "@expo/vector-icons";

interface Props {
  width: number;
}

export function FlyingPlane({ width }: Props) {
  const x = useSharedValue(-40);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const travel = width + 120;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 600 }),
        withTiming(1, { duration: 4400 }),
        withTiming(0, { duration: 600 }),
        withDelay(800, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    x.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 0 }),
        withTiming(travel, { duration: 6000, easing: Easing.inOut(Easing.cubic) }),
        withDelay(400, withTiming(travel, { duration: 0 })),
      ),
      -1,
      false,
    );
    y.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-26, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(-12, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [x, y, opacity, width]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: "-18deg" }],
    opacity: opacity.value,
  }));

  return (
    <View pointerEvents="none" style={[styles.layer, { width }]}>
      <Animated.View style={aStyle}>
        <Feather name="send" size={26} color="#fff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", height: 60, top: 60, left: 0 },
});
