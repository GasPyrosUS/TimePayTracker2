import React, { useCallback, useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type AnimatedPressableProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  pressScale?: number;
  pressOpacity?: number;
};

const NativeAnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Shared dependency-free press feedback for tappable controls. */
export function AnimatedPressable({
  disabled,
  onPressIn,
  onPressOut,
  pressScale = 0.97,
  pressOpacity = 0.86,
  style,
  ...props
}: AnimatedPressableProps) {
  const progress = useRef(new Animated.Value(0)).current;

  const animate = useCallback(
    (toValue: number) => {
      progress.stopAnimation();
      Animated.spring(progress, {
        toValue,
        speed: toValue === 1 ? 45 : 32,
        bounciness: toValue === 1 ? 0 : 5,
        useNativeDriver: true,
      }).start();
    },
    [progress]
  );

  return (
    <NativeAnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={event => {
        if (!disabled) animate(1);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        if (!disabled) animate(0);
        onPressOut?.(event);
      }}
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, pressOpacity],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, pressScale],
              }),
            },
          ],
        },
      ]}
    />
  );
}
