import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import DrawerButton from "@/components/drawer-button";
import { TabButton } from "@/components/ui/tab-button";
import { useThemeConfig } from "@/lib/use-theme-config";

export default function Layout() {
  const { colors } = useThemeConfig();
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={{
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
        }}
      >
        <TabTrigger name="home" href="/(tabs)/home" asChild>
          <TabButton labelAnimated={true} icon="Home">
            Home
          </TabButton>
        </TabTrigger>
        <TabTrigger name="stats" href="/(tabs)/stats" asChild>
          <TabButton labelAnimated={true} icon="Heart">
            Stats
          </TabButton>
        </TabTrigger>
        <TabTrigger name="meals" href="/(tabs)/meals" asChild>
          <TabButton labelAnimated={true} icon="Search">
            Meals
          </TabButton>
        </TabTrigger>
        <TabTrigger name="scan" href="/(tabs)/scan" asChild>
          <TabButton hasBadge labelAnimated={true} icon="ShoppingCart">
            Scan
          </TabButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/(tabs)/profile" asChild>
          <TabButton labelAnimated={true} icon="User">
            Profile
          </TabButton>
        </TabTrigger>

        <View className="flex w-1/5 items-center justify-center opacity-40">
          <DrawerButton className="w-full" />
        </View>

        {/****Items that are on this level but hidden from tabBar
          <TabTrigger name="profile" href="/(drawer)/(tabs)/profile" asChild style={{ display: 'none' }}>
            <TabButton icon="user">Profile</TabButton>
          </TabTrigger>*/}
      </TabList>
    </Tabs>
  );
}
