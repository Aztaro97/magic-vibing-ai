import type { TextInputProps } from "react-native";
import React, { useState } from "react";
import {
  I18nManager,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import colors from "./ui/colors";
import { Text } from "./ui/text";

interface CountryCode {
  code: string;
  flag: string;
}

interface PhoneInputProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  value: string;
  onChangeText: (value: string) => void;
  onChangeCountryCode?: (code: string) => void;
  label?: string;
  error?: string;
  countryCodes?: CountryCode[];
}

const DEFAULT_COUNTRY_CODE: CountryCode = { code: "+1", flag: "🇺🇸" };

export const PhoneInput = React.forwardRef<TextInput, PhoneInputProps>(
  (props, ref) => {
    const {
      label,
      error,
      value,
      onChangeText,
      onChangeCountryCode,
      placeholder = "(555) 123-4567",
      countryCodes = [DEFAULT_COUNTRY_CODE],
      testID,
      ...inputProps
    } = props;

    const [isFocused, setIsFocused] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(
      countryCodes[0] || DEFAULT_COUNTRY_CODE,
    );

    const handleCountryCodePress = () => {
      // In a real app, show a modal or dropdown to select country code
      // For now, we just use the first one
      if (onChangeCountryCode) {
        onChangeCountryCode(selectedCountryCode.code);
      }
    };

    const onBlur = () => setIsFocused(false);
    const onFocus = () => setIsFocused(true);

    return (
      <View style={styles.container}>
        {label && (
          <Text
            testID={testID ? `${testID}-label` : undefined}
            className="text-grey-100 mb-1 text-lg dark:text-neutral-100"
          >
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.focusedInput,
            error && styles.errorInput,
          ]}
        >
          <Pressable
            onPress={handleCountryCodePress}
            style={styles.countryCodeButton}
            testID={testID ? `${testID}-country-code` : undefined}
          >
            <Text style={styles.countryCodeText}>
              {selectedCountryCode.flag} {selectedCountryCode.code}
            </Text>
          </Pressable>
          <TextInput
            ref={ref}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral[400]}
            keyboardType="phone-pad"
            onBlur={onBlur}
            onFocus={onFocus}
            testID={testID}
            {...inputProps}
          />
        </View>
        {error && (
          <Text
            testID={testID ? `${testID}-error` : undefined}
            className="text-danger-400 dark:text-danger-600 text-sm"
          >
            {error}
          </Text>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
  },
  focusedInput: {
    borderColor: colors.neutral[400],
  },
  errorInput: {
    borderColor: colors.danger[600],
  },
  countryCodeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 0.5,
    borderRightColor: colors.neutral[300],
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.neutral[900],
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.neutral[900],
    textAlign: I18nManager.isRTL ? "right" : "left",
    writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
  },
});
