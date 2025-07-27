import type { ViewStyle } from "react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useThemeConfig } from "@/lib/use-theme-config";

import type { IconName } from "./Icon";
import Icon from "./Icon";

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponents?: React.ReactNode[];
  backgroundColor?: string;
  textColor?: string;
  leftComponent?: React.ReactNode;
  middleComponent?: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  collapsible?: boolean;
  visible?: boolean;
  variant?: "default" | "transparent" | "blurred";
}

const Header: React.FC<HeaderProps> = ({
  title,
  children,
  showBackButton = false,
  onBackPress,
  rightComponents = [],
  backgroundColor,
  textColor,
  leftComponent,
  middleComponent,
  className,
  style,
  collapsible = false,
  visible = true,
  variant = "default",
}) => {
  const { colors } = useThemeConfig();
  const translateY = useRef(new Animated.Value(0)).current;

  // Determine if we should use the transparent or blurred variant styling
  const isTransparent = variant === "transparent";
  const isBlurred = variant === "blurred";
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!collapsible) return;

    // When visible, use spring for a nice bounce-in from the top
    if (visible) {
      // First move it up slightly off-screen (if it's not already)
      translateY.setValue(-70);

      // Then spring it back in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 30, // Higher tension for faster movement
        friction: 50, // Lower friction for slight bounce
        velocity: 3, // Higher initial velocity for more dramatic entrance
      }).start();
    }
    // When hiding, use spring animation to slide up
    else {
      Animated.spring(translateY, {
        toValue: -150,
        useNativeDriver: true,
        tension: 80, // High tension for quick movement
        friction: 12, // Moderate friction for less bounce
        velocity: 2, // Initial velocity for natural feel
      }).start();
    }
  }, [visible, collapsible, translateY]);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const AnimatedView = Animated.createAnimatedComponent(View);

  // Position absolute for collapsible or transparent/blurred variant
  const containerStyle =
    collapsible || isTransparent || isBlurred
      ? {
          transform: collapsible ? [{ translateY }] : undefined,
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }
      : {};

  if (isBlurred) {
    return (
      <BlurView
        intensity={30}
        tint="light"
        blurReductionFactor={0.5}
        style={[style, containerStyle, { paddingTop: insets.top }]}
        className={`px-global bg-light-primary/70 dark:bg-dark-primary/90 z-50 w-full py-4 ${className}`}
      >
        <View className="flex-row justify-between">
          <View className="flex-row items-center">
            {showBackButton && (
              <TouchableOpacity
                onPress={handleBackPress}
                className="mr-global relative z-50"
              >
                <Icon name="ArrowLeft" size={24} />
              </TouchableOpacity>
            )}

            <View className="relative z-50 flex-row items-center">
              {leftComponent}

              {title && (
                <Text className="text-lg font-bold text-white">{title}</Text>
              )}
            </View>
          </View>

          {middleComponent && (
            <View className="absolute bottom-0 left-0 right-0 top-0 flex-row items-center justify-center">
              {middleComponent}
            </View>
          )}

          <View className="relative z-50 flex-row items-center">
            {rightComponents.map((component, index) => (
              <View key={index} className="ml-6">
                {component}
              </View>
            ))}
          </View>
        </View>
        {children}
      </BlurView>
    );
  }

  if (isTransparent) {
    return (
      <LinearGradient
        colors={["rgba(0,0,0,0.8)", "transparent"]}
        style={[style, containerStyle, { paddingTop: insets.top }]}
        className={`px-global z-50 w-full pb-10 pt-4 ${className}`}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View className="flex-row justify-between">
          <View className="flex-row items-center">
            {showBackButton && (
              <TouchableOpacity
                onPress={handleBackPress}
                className="mr-global relative z-50"
              >
                <Icon name="ArrowLeft" size={24} color="white" />
              </TouchableOpacity>
            )}

            <View className="relative z-50 flex-row items-center">
              {leftComponent}

              {title && (
                <Text className="text-lg font-bold text-white">{title}</Text>
              )}
            </View>
          </View>

          {middleComponent && (
            <View className="absolute bottom-0 left-0 right-0 top-0 flex-row items-center justify-center">
              {middleComponent}
            </View>
          )}

          <View className="relative z-50 flex-row items-center">
            {rightComponents.map((component, index) => (
              <View key={index} className="ml-6">
                {component}
              </View>
            ))}
          </View>
        </View>
        {children}
      </LinearGradient>
    );
  }

  return (
    <AnimatedView
      style={[
        collapsible ? { paddingTop: insets.top } : { paddingTop: insets.top },
        style,
        containerStyle,
      ]}
      className={`px-global bg-light-primary dark:bg-dark-primary relative z-50 w-full flex-row justify-between ${className}`}
    >
      {(showBackButton || leftComponent || title) && (
        <View className="flex-1 flex-row items-center">
          {showBackButton && (
            <TouchableOpacity
              onPress={handleBackPress}
              className="mr-global relative z-50 py-4"
            >
              <Icon
                name="ArrowLeft"
                size={24}
                color={isTransparent ? "white" : colors.text}
              />
            </TouchableOpacity>
          )}

          {leftComponent ||
            (title && (
              <View className="relative z-50 flex-row items-center py-4">
                {leftComponent}

                {title && (
                  <Text className="text-lg font-bold dark:text-white">
                    {title}
                  </Text>
                )}
              </View>
            ))}
        </View>
      )}
      {middleComponent && (
        <View className="flex-1 flex-row items-center justify-center py-4">
          {middleComponent}
        </View>
      )}

      {rightComponents.length > 0 && (
        <View className="relative z-50 flex-1 flex-row items-center justify-end">
          {rightComponents.map((component, index) => (
            <View key={index} className="ml-6">
              {component}
            </View>
          ))}
        </View>
      )}
      {children}
    </AnimatedView>
  );
};

export default Header;

interface HeaderItemProps {
  href: string;
  icon: IconName;
  className?: string;
  hasBadge?: boolean;
  onPress?: any;
  isWhite?: boolean;
}

export const HeaderIcon = ({
  href,
  icon,
  hasBadge,
  onPress,
  className = "",
  isWhite = false,
}: HeaderItemProps) => (
  <>
    {onPress ? (
      <TouchableOpacity onPress={onPress} className="overflow-visible">
        <View
          className={`relative h-7 w-7 flex-row items-center justify-center overflow-visible ${className}`}
        >
          {hasBadge && (
            <View className="dark:border-dark-primary absolute -right-0 -top-0 z-30 h-4 w-4 rounded-full border-2 border-transparent bg-red-500" />
          )}
          {isWhite ? (
            <Icon name={icon} size={25} color="white" />
          ) : (
            <Icon name={icon} size={25} />
          )}
        </View>
      </TouchableOpacity>
    ) : (
      <Link href={href} asChild>
        <TouchableOpacity className="overflow-visible">
          <View
            className={`relative h-7 w-7 flex-row items-center justify-center overflow-visible ${className}`}
          >
            {hasBadge && (
              <View className="dark:border-dark-primary absolute -right-[3px] -top-0 z-30 h-3 w-3 rounded-full border-2 border-transparent bg-red-500" />
            )}
            {isWhite ? (
              <Icon name={icon} size={25} color="white" />
            ) : (
              <Icon name={icon} size={25} />
            )}
          </View>
        </TouchableOpacity>
      </Link>
    )}
  </>
);
