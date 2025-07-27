import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "@/components/ui";

import type { IconName } from "./ui/Icon";
import ThemedScroller from "./theme-scroller";
import Icon from "./ui/Icon";

export default function CustomDrawerContent() {
  const insets = useSafeAreaInsets();
  return (
    <ThemedScroller
      style={{ paddingTop: insets.top + 30 }}
      className="dark:bg-dark-primary flex-1 bg-white p-8"
    >
      <View className="flex-col">
        <View className="ml-0">
          <Text className="text-lg font-bold">John Dogerthy</Text>
          <Text className="text-light-subtext dark:text-dark-subtext mb-4 text-sm">
            johndoe0294
          </Text>
        </View>
      </View>

      <View className="border-light-secondary dark:border-dark-secondary my-6 flex-col border-y py-6">
        <NavItem href="/screens/profile" icon="User" label="Profile" />
        <NavItem href="/screens/orders" icon="Package" label="Orders" />
        <NavItem href="/screens/admin" icon="Contact" label="Admin" />
        <NavItem
          href="/screens/onboarding-start"
          icon="Lightbulb"
          label="Onboarding"
        />
        <NavItem href="/screens/welcome" icon="Package" label="Welcome" />
        <NavItem
          href="/screens/notification-permission"
          icon="ShieldCheck"
          label="Permissions"
        />
        <NavItem href="/screens/login" icon="ArrowLeft" label="Sign out" />
      </View>
      <Text className="text-light-subtext dark:text-dark-subtext text-sm">
        Version 0.0.12
      </Text>
    </ThemedScroller>
  );
}

interface NavItemProps {
  href: string;
  icon: IconName;
  label: string;
  className?: string;
}

export const NavItem = ({ href, icon, label }: NavItemProps) => (
  <TouchableOpacity
    onPress={() => router.push(href)}
    className={`flex-row items-center py-4`}
  >
    <Icon name={icon} size={24} className="" />
    {label && (
      <Text className="ml-6 text-lg font-bold text-gray-800 dark:text-gray-200">
        {label}
      </Text>
    )}
  </TouchableOpacity>
);
