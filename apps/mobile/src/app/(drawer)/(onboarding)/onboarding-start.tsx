import React from "react";
import { useRouter } from "expo-router";
import ThemedFooter from "@/components/theme-footer";
import { Button, Image, Text, View } from "@/components/ui";

export default function OnboardingStart() {
  const router = useRouter();
  return (
    <>
      <View className="bg-light-primary dark:bg-dark-primary mt-auto flex h-full flex-1 p-6">
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("@/assets/images/slide-1.png")}
            className="h-[450px] w-full object-contain"
            style={{ resizeMode: "contain" }}
          />
        </View>
        <View className="pb-6">
          <Text className="mt-auto text-4xl font-extrabold">Welcome, John</Text>
          <Text className="text-light-subtext dark:text-dark-subtext mt-2 text-base">
            We're excited to have you join us! Let's get your account set up
            with a few quick steps.
          </Text>
        </View>
      </View>
      <ThemedFooter>
        <Button
          label="Let's go"
          onPress={() => router.push("/(drawer)/(onboarding)/onboarding")}
        />
      </ThemedFooter>
    </>
  );
}
