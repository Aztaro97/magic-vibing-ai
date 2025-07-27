import type { ViewProps } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "@/components/ui";

interface ThemeFooterProps extends ViewProps {
  children: React.ReactNode;
}

export default function ThemedFooter({
  children,
  className,
  ...props
}: ThemeFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingBottom: insets.bottom }}
      className={`bg-light-primary dark:bg-dark-primary px-global pt-global w-full ${className || ""}`}
      {...props}
    >
      {children}
    </View>
  );
}
