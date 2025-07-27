import type { IconName } from "@/components/ui/Icon";
import type { ReactNode } from "react";
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui";
import Icon from "@/components/ui/Icon";
import { useThemeConfig } from "@/lib/use-theme-config";

import AnimatedView from "./animated-view";

interface SelectableProps {
  title: string;
  description?: string;
  icon?: IconName;
  customIcon?: ReactNode;
  iconColor?: string;
  selected?: boolean;
  onPress?: () => void;
  error?: string;
  className?: string;
  containerClassName?: string;
}

const Selectable: React.FC<SelectableProps> = ({
  title,
  description,
  icon,
  customIcon,
  iconColor,
  selected = false,
  onPress,
  error,
  className = "",
  containerClassName = "",
}) => {
  const { colors } = useThemeConfig();

  return (
    <View className={`mb-2 ${containerClassName}`}>
      <Pressable
        onPress={onPress}
        className={`rounded-lg border p-4 active:opacity-70 ${selected ? "border-black dark:border-white" : "border-black/20 dark:border-white/20"} ${error ? "border-red-500" : ""} ${className} `}
      >
        <View className="flex-row items-center">
          {icon && (
            <View className="mr-4">
              <Icon name={icon} size={24} color={iconColor || colors.text} />
            </View>
          )}
          {customIcon && <View className="mr-4">{customIcon}</View>}
          <View className="flex-1">
            <Text className="text-base font-semibold">{title}</Text>
            {description && (
              <Text className="text-light-subtext dark:text-dark-subtext mt-0 text-sm">
                {description}
              </Text>
            )}
          </View>
          {selected ? (
            <AnimatedView className="ml-3" animation="bounceIn" duration={500}>
              <Icon name="CheckCircle2" size={20} color={colors.highlight} />
            </AnimatedView>
          ) : (
            <AnimatedView
              className="ml-3 opacity-0"
              animation="bounceIn"
              duration={500}
            >
              <Icon name="CheckCircle2" size={20} color={colors.highlight} />
            </AnimatedView>
          )}
        </View>
      </Pressable>

      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
};

export default Selectable;
