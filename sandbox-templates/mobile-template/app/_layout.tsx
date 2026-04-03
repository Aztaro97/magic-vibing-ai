// NEVER DELETE THIS COMPONENT <FloatingChatWrapper> is part of capsule app
// IMPORTANT: NEVER REMOVE useHoverWithChannel import and hook from this file
import { ReloadProvider } from "@/contexts/ReloadContext";
import { FloatingChatWrapper } from "@/features/floating-chat";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";

// Ignore the React Fragment id prop warning
LogBox.ignoreLogs(["Invalid prop", "supplied to `React.Fragment`"]);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ReloadProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {/* NEVER DELETE THIS COMPONENT <FloatingChatWrapper> is part of capsule app */}
        <FloatingChatWrapper>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </FloatingChatWrapper>
      </ThemeProvider>
    </ReloadProvider>
  );
}
