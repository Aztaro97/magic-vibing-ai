import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PhoneInput } from "@/components/phone-input";
import { Button, FocusAwareStatusBar, Text } from "@/components/ui";
import { phoneNumber } from "@/utils/auth";

export default function Register() {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleRegister = async () => {
    if (!number) {
      setError("Please enter a phone number");
      return;
    }

    console.log(number);

    // Use Better Auth for phone number registration
    await phoneNumber.sendOtp({
      phoneNumber: number,
      fetchOptions: {
        onSuccess: () => {
          router.push("/verification");
        },
        onError: ({ error }) => {
          setError(error.message);
        },
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FocusAwareStatusBar />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>

        {/* Sign Up Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to create an account
          </Text>
        </View>

        {/* Phone Input */}
        <View style={styles.inputContainer}>
          <PhoneInput
            label="Phone Number"
            value={number}
            onChangeText={setNumber}
            error={error || undefined}
            testID="phone-input"
          />
        </View>

        {/* Continue Button */}
        <Button
          label="Continue"
          onPress={handleRegister}
          loading={loading}
          variant="default"
          size="lg"
          className="mb-6"
          testID="continue-button"
        />

        {/* Terms and Privacy Policy */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{" "}
          <Text style={styles.link} onPress={() => router.push("/terms")}>
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text style={styles.link} onPress={() => router.push("/privacy")}>
            Privacy Policy
          </Text>
        </Text>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text style={styles.link} onPress={() => router.push("/login")}>
              Log in
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>PetCalorie © 2025</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#4A4A4A",
  },
  inputContainer: {
    marginBottom: 32,
  },
  termsText: {
    textAlign: "center",
    fontSize: 14,
    color: "#4A4A4A",
    marginBottom: 24,
  },
  link: {
    color: "#000",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  loginContainer: {
    marginTop: "auto",
  },
  loginText: {
    textAlign: "center",
    fontSize: 16,
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#4A4A4A",
  },
});
