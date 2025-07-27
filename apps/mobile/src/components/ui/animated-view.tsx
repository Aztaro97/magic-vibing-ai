import type { EasingFunction, StyleProp, ViewStyle } from "react-native";
import React, { useEffect } from "react";
import { Animated, Easing, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

export type AnimationType =
  | "fadeIn"
  | "scaleIn"
  | "slideInBottom"
  | "slideInRight"
  | "slideInLeft"
  | "slideInTop"
  | "bounceIn"
  | "flipInX"
  | "zoomInRotate";

interface AnimatedViewProps {
  children: React.ReactNode;
  animation: AnimationType;
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  style?: StyleProp<ViewStyle>;
  className?: string;
  playOnlyOnce?: boolean;
}

export default function AnimatedView({
  children,
  animation,
  duration = 300,
  delay = 0,
  easing = Easing.bezier(0.4, 0, 0.2, 1),
  style,
  className,
  playOnlyOnce = false,
}: AnimatedViewProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  const hasAnimatedOnce = React.useRef(false);

  const getAnimationStyle = (): any => {
    const baseStyle: ViewStyle = {};

    switch (animation) {
      case "fadeIn":
        return {
          opacity: animatedValue,
        };

      case "scaleIn":
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        };

      case "slideInBottom":
        return {
          //opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        };

      case "slideInRight":
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
        };

      case "slideInLeft":
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        };

      case "slideInTop":
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        };

      case "bounceIn":
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.6, 0.8, 1],
                outputRange: [0.3, 1.1, 0.9, 1],
              }),
            },
          ],
        };

      case "flipInX":
        return {
          opacity: animatedValue,
          transform: [
            {
              rotateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ["90deg", "0deg"],
              }),
            },
          ],
        };

      case "zoomInRotate":
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ["-45deg", "0deg"],
              }),
            },
          ],
        };

      default:
        return baseStyle;
    }
  };

  // Start animation when screen comes into focus
  useEffect(() => {
    if (!isFocused) return;

    // If playOnlyOnce is true and animation has played once, don't play again
    if (playOnlyOnce && hasAnimatedOnce.current) return;

    // Reset animation value when screen comes into focus
    animatedValue.setValue(0);

    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: true,
    }).start(() => {
      hasAnimatedOnce.current = true;
    });
  }, [isFocused, animation, duration, delay, easing]);

  return (
    <View className={className} style={style}>
      <Animated.View style={[getAnimationStyle(), style]} className={className}>
        {children}
      </Animated.View>
    </View>
  );
}
