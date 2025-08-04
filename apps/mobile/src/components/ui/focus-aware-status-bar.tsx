import * as React from "react";
import { Platform } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { useIsFocused } from "@react-navigation/native";
import { useColorScheme } from "nativewind";

interface Props {
  hidden?: boolean;
}
export const FocusAwareStatusBar = ({ hidden = false }: Props) => {
  const isFocused = useIsFocused();
  const { colorScheme } = useColorScheme();

  if (Platform.OS === "web") return null;

  return isFocused ? <SystemBars style={colorScheme} hidden={hidden} /> : null;
};
