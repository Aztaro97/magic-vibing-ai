import type { NavigationProp } from "@react-navigation/native";
import type { ViewStyle } from "react-native";
import React from "react";
import { Pressable, View } from "react-native";
import Avatar from "@/components/ui/avatar";
import Icon from "@/components/ui/Icon";
import { useThemeConfig } from "@/lib/use-theme-config";
import { DrawerActions, useNavigation } from "@react-navigation/native";

interface DrawerButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: ViewStyle;
  isAvatar?: boolean;
}

export default function DrawerButton({
  size = "md",
  className,
  style,
  isAvatar = false,
}: DrawerButtonProps) {
  const { colors } = useThemeConfig();
  const navigation = useNavigation<NavigationProp<any>>();

  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const handlePress = () => {
    try {
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (e) {
      console.warn("Drawer navigation context not available:", e);
    }
  };

  return (
    <View className={`rounded-full ${className}`} style={style}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {isAvatar ? (
          <Avatar
            src="https://mighty.tools/mockmind-api/content/human/5.jpg"
            size="xs"
          />
        ) : (
          <Icon name="Menu" size={sizeMap[size]} color={colors.text} />
        )}
      </Pressable>
    </View>
  );
}
