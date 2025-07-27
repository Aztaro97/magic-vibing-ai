import React from "react";
import { router } from "expo-router";
import { Button, Text, View } from "@/components/ui";

export default function home() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>home</Text>

      <Button
        label="Go to onboarding"
        onPress={() => router.push("/(drawer)/(onboarding)/onboarding-start")}
      />
    </View>
  );
}
