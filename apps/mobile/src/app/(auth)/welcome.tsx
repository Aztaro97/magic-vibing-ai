import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image, Text, View } from "@/components/ui";
// import Icon from "@/components/Icon";
// import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/ui/Icon";
import { useThemeConfig } from "@/lib/use-theme-config";
import { AntDesign } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const windowWidth = Dimensions.get("window").width;

const slides = [
  {
    id: "1",
    title: "Track Your Dog's Nutrition",
    image: require("@/assets/images/slide-1.png"),
    description: "Monitor your pet's calorie intake with ease",
  },
  {
    id: "2",
    title: "AI-Powered Food Recognition",
    image: require("@/assets/images/slide-1.png"),
    description: "Simply take a photo of your dog's food and we'll identify it",
  },
  {
    id: "3",
    title: "Complete Nutritional Insights",
    image: require("@/assets/images/slide-1.png"),
    description:
      "Get detailed analysis of your dog's diet and personalized recommendations",
  },
];

export default function OnboardingScreen() {
  const { colors } = useThemeConfig();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <>
      <View
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        className="relative flex-1"
      >
        {/* <View className="p-global items-end justify-end">
          <ThemeToggle />
        </View> */}
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={windowWidth} // 👈 Ensures snapping works perfectly
          renderItem={({ item }) => (
            <View
              style={{ width: windowWidth }}
              className="items-center justify-center p-6"
            >
              <Image
                source={item.image}
                style={{ width: windowWidth, height: windowWidth }}
              />
              <Text className="font-outfit-bold mt-4 text-2xl">
                {item.title}
              </Text>
              <Text className="mt-2 w-2/3 text-center text-muted">
                {item.description}
              </Text>
            </View>
          )}
          ListFooterComponent={() => <View className="h-28 w-full" />}
          keyExtractor={(item) => item.id}
        />

        <View className="mb-20 w-full flex-row justify-center">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`mx-px h-[2px] ${index === currentIndex ? "w-4 bg-black dark:bg-white" : "bg-light-secondary dark:bg-dark-secondary w-4"}`}
            />
          ))}
        </View>

        {/* Login/Signup Buttons */}
        <View className="mb-global flex w-full flex-col space-y-2 px-6">
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            className="flex w-full flex-row items-center justify-center rounded-full border border-black py-4 dark:border-white"
          >
            <Icon name="Mail" size={20} />
            <Text className="ml-3 text-black dark:text-white">Use email</Text>
          </Pressable>
          <View className="mt-3 flex flex-row items-center justify-center gap-2">
            <Pressable
              onPress={() => router.push("/(drawer)/(tabs)")}
              className="flex flex-1 flex-row items-center justify-center rounded-full bg-black py-4 dark:bg-white"
            >
              <AntDesign name="google" size={22} />
              <Text className="ml-3 text-white dark:text-black">
                Google login
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(drawer)/(tabs)")}
              className="relative flex flex-1 flex-row items-center justify-center rounded-full bg-black py-4 dark:bg-white"
            >
              <AntDesign name="apple1" size={22} />
              <Text className="ml-3 text-white dark:text-black">Apple ID</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
