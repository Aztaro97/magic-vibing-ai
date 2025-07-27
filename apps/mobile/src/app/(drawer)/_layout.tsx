import React from "react";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "@/components/custom-drawer-content";
import { DrawerProvider } from "@/contexts/drawer-context";
import { useThemeConfig } from "@/lib/use-theme-config";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";

// Create a ref to the drawer instance that can be used across the app
export const drawerRef = React.createRef();

export default function DrawerLayout() {
  const { colors } = useThemeConfig();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <DrawerProvider>
      <Drawer
        ref={drawerRef}
        screenOptions={{
          headerShown: false,
          drawerType: "slide",
          drawerPosition: "left",
          drawerStyle: {
            backgroundColor: colors.background,
            width: "85%",
            flex: 1,
          },
          overlayColor: "rgba(0,0,0, 0.4)",
          swipeEdgeWidth: 100,
        }}
        drawerContent={(props) => <CustomDrawerContent />}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Menu",
            drawerLabel: "Menu",
          }}
          //redirect={true}
        />
      </Drawer>
    </DrawerProvider>
  );
}
