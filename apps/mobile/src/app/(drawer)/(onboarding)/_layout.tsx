import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="onboarding-start" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
