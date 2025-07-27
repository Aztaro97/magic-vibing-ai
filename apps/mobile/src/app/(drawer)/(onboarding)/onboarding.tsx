import type { IconName } from "@/components/ui/Icon";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui";
import { Chip } from "@/components/ui/chip";
import MultiStep, { Step } from "@/components/ui/multi-step";
import Selectable from "@/components/ui/Selectable";

interface OnboardingData {
  gender: string;
  clothingSizes: string[];
  shoeSize: string;
  preferredBrands: string[];
}

const genderOptions: { label: string; icon: IconName; value: string }[] = [
  { label: "Men", icon: "User", value: "men" },
  { label: "Women", icon: "User", value: "women" },
  { label: "Unisex", icon: "Users", value: "unisex" },
];

const clothingSizeOptions: { label: string }[] = [
  { label: "XS" },
  { label: "S" },
  { label: "M" },
  { label: "L" },
  { label: "XL" },
  { label: "XXL" },
];

const shoeSizeOptions: { size: string; value: string }[] = [
  { size: "US 6 / EU 39", value: "6" },
  { size: "US 7 / EU 40", value: "7" },
  { size: "US 8 / EU 41", value: "8" },
  { size: "US 9 / EU 42", value: "9" },
  { size: "US 10 / EU 43", value: "10" },
  { size: "US 11 / EU 44", value: "11" },
  { size: "US 12 / EU 45", value: "12" },
  { size: "US 13 / EU 46", value: "13" },
];

const brandOptions: { title: string; icon: IconName; value: string }[] = [
  { title: "Nike", icon: "Star", value: "nike" },
  { title: "Adidas", icon: "Star", value: "adidas" },
  { title: "Puma", icon: "Star", value: "puma" },
  { title: "Under Armour", icon: "Star", value: "underarmour" },
  { title: "New Balance", icon: "Star", value: "newbalance" },
  { title: "Levi's", icon: "Star", value: "levis" },
  { title: "Gap", icon: "Star", value: "gap" },
  { title: "Zara", icon: "Star", value: "zara" },
  { title: "H&M", icon: "Star", value: "hm" },
  { title: "Uniqlo", icon: "Star", value: "uniqlo" },
  { title: "Calvin Klein", icon: "Star", value: "calvin klein" },
  { title: "Tommy Hilfiger", icon: "Star", value: "tommy hilfiger" },
  { title: "Ralph Lauren", icon: "Star", value: "ralph lauren" },
  { title: "Burberry", icon: "Star", value: "burberry" },
  { title: "Gucci", icon: "Star", value: "gucci" },
];

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const GenderStep: React.FC<StepProps> = ({ data, updateData }) => (
  <View className="p-4">
    <View className="mb-10">
      <Text className="mt-auto text-2xl font-extrabold">
        Select your gender
      </Text>
      <Text className="text-light-subtext dark:text-dark-subtext text-base">
        We'll customize your shopping experience
      </Text>
    </View>

    {genderOptions.map((option) => (
      <Selectable
        key={option.value}
        title={option.label}
        selected={data.gender === option.value}
        onPress={() => updateData({ gender: option.value })}
        className="mb-4"
      />
    ))}
  </View>
);

const ClothingSizeStep: React.FC<StepProps> = ({ data, updateData }) => (
  <ScrollView className="p-4">
    <View className="mb-10">
      <Text className="mt-auto text-2xl font-extrabold">
        What are your clothing sizes?
      </Text>
      <Text className="text-light-subtext dark:text-dark-subtext text-base">
        Select all sizes that fit you
      </Text>
    </View>

    <View className="flex-row flex-wrap gap-2">
      {clothingSizeOptions.map((size) => (
        <Chip
          size="lg"
          key={size.label}
          label={size.label}
          isSelected={data.clothingSizes.includes(size.label)}
          onPress={() => {
            const newSizes = data.clothingSizes.includes(size.label)
              ? data.clothingSizes.filter((s) => s !== size.label)
              : [...data.clothingSizes, size.label];
            updateData({ clothingSizes: newSizes });
          }}
        />
      ))}
    </View>
  </ScrollView>
);

const ShoeSizeStep: React.FC<StepProps> = ({ data, updateData }) => (
  <ScrollView className="p-4">
    <View className="mb-10">
      <Text className="mt-auto text-2xl font-extrabold">
        What is your shoe size?
      </Text>
      <Text className="text-light-subtext dark:text-dark-subtext text-base">
        Select your preferred size
      </Text>
    </View>

    {shoeSizeOptions.map((size) => (
      <Selectable
        key={size.value}
        title={size.size}
        selected={data.shoeSize === size.value}
        onPress={() => updateData({ shoeSize: size.value })}
        className="mb-4"
      />
    ))}
  </ScrollView>
);

const BrandsStep: React.FC<StepProps> = ({ data, updateData }) => (
  <ScrollView className="p-4">
    <View className="mb-10">
      <Text className="mt-auto text-2xl font-extrabold">
        Which brands do you prefer?
      </Text>
      <Text className="text-light-subtext dark:text-dark-subtext text-base">
        Select your favorite brands
      </Text>
    </View>

    {brandOptions.map((brand) => (
      <Selectable
        key={brand.value}
        title={brand.title}
        selected={data.preferredBrands.includes(brand.value)}
        onPress={() => {
          const newBrands = data.preferredBrands.includes(brand.value)
            ? data.preferredBrands.filter((b) => b !== brand.value)
            : [...data.preferredBrands, brand.value];
          updateData({ preferredBrands: newBrands });
        }}
        className="mb-4"
      />
    ))}
    <View className="h-20 w-full" />
  </ScrollView>
);

export default function OnboardingScreen() {
  const [data, setData] = useState<OnboardingData>({
    gender: "",
    clothingSizes: [],
    shoeSize: "",
    preferredBrands: [],
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((current) => ({ ...current, ...updates }));
  };

  return (
    <MultiStep
      onComplete={() => router.push("/(drawer)/(tabs)/")}
      onClose={() => router.back()}
      showStepIndicator={false}
    >
      <Step title="Gender">
        <GenderStep data={data} updateData={updateData} />
      </Step>

      <Step title="Clothing Size">
        <ClothingSizeStep data={data} updateData={updateData} />
      </Step>

      <Step title="Shoe Size">
        <ShoeSizeStep data={data} updateData={updateData} />
      </Step>

      <Step title="Brands">
        <BrandsStep data={data} updateData={updateData} />
      </Step>
    </MultiStep>
  );
}
