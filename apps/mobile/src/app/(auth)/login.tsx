import type { LoginFormProps } from "@/components/login-form";
import React from "react";
import { useRouter } from "expo-router";
import { LoginForm } from "@/components/login-form";
import { FocusAwareStatusBar } from "@/components/ui";

export default function Login() {
  const router = useRouter();

  const onSubmit: LoginFormProps["onSubmit"] = (data) => {
    router.replace("/(drawer)/(tabs)/home");
  };
  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSubmit={onSubmit} />
    </>
  );
}
