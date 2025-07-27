import type { ReactNode } from "react";
import React, {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, View } from "react-native";
import { Button, Text } from "@/components/ui";
import Header from "@/components/ui/header";
import Icon from "@/components/ui/Icon";

// Step component that will be used as children
export interface StepProps {
  title: string;
  optional?: boolean;
  children: ReactNode;
}

export const Step: React.FC<StepProps> = ({ children }) => {
  return <>{children}</>; // Just render children, this is mainly for type safety
};

// Add this to help with type checking
const isStepComponent = (
  child: any,
): child is React.ReactElement<StepProps> => {
  return (
    isValidElement(child) &&
    (child.type === Step ||
      (typeof child.type === "function" && child.type.name === "Step"))
  );
};

interface StepData {
  key: string;
  title: string;
  optional?: boolean;
  component: ReactNode;
}

interface MultiStepProps {
  children: ReactNode;
  onComplete: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  showStepIndicator?: boolean;
  className?: string;
  onStepChange?: (nextStep: number) => boolean;
}

export default function MultiStep({
  children,
  onComplete,
  onClose,
  showHeader = true,
  showStepIndicator = true,
  className = "",
  onStepChange,
}: MultiStepProps) {
  // Filter and validate children to only include Step components
  const validChildren = Children.toArray(children).filter(isStepComponent);

  // Extract step data from children
  const steps: StepData[] = validChildren.map((child, index) => {
    const { title, optional, children: stepContent } = child.props;
    return {
      key: `step-${index}`,
      title: title || `Step ${index + 1}`,
      optional,
      component: stepContent,
    };
  });

  // Ensure we have at least one step
  if (steps.length === 0) {
    steps.push({
      key: "empty-step",
      title: "Empty",
      component: (
        <View>
          <Text>No steps provided</Text>
        </View>
      ),
    });
  }

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnims = useRef(steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reset and start fade/slide animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress indicators
    steps.forEach((_, index) => {
      Animated.timing(progressAnims[index], {
        toValue: index <= currentStepIndex ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [currentStepIndex]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      const nextStep = currentStepIndex + 1;
      const canProceed = onStepChange ? onStepChange(nextStep) : true;

      if (canProceed) {
        setCurrentStepIndex(nextStep);
      }
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep?.optional && !isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  return (
    <View
      className={`bg-light-primary dark:bg-dark-primary flex-1 ${className}`}
    >
      {showHeader && (
        <Header
          leftComponent={
            onClose ? (
              <Pressable
                key="close"
                onPress={onClose}
                className="active:bg-light-secondary dark:active:bg-dark-secondary rounded-full p-2"
                hitSlop={8}
              >
                <Icon
                  name="X"
                  size={24}
                  className="text-light-text dark:text-dark-text"
                />
              </Pressable>
            ) : undefined
          }
          rightComponents={[
            currentStep?.optional && !isLastStep && (
              <Button
                key="skip"
                label="Skip"
                variant="ghost"
                onPress={handleSkip}
                size="sm"
              />
            ),
            !isFirstStep && (
              <Button
                key="back"
                label="Back"
                variant="ghost"
                onPress={handleBack}
                size="sm"
              />
            ),
            <Button
              key="next"
              label={isLastStep ? "View" : "Next"}
              onPress={handleNext}
              size="sm"
            />,
          ].filter(Boolean)}
        />
      )}

      {showStepIndicator && (
        <View className="w-full flex-row items-center justify-center overflow-hidden rounded-full px-4 py-4">
          <View className="w-full flex-row overflow-hidden rounded-full">
            {steps.map((step, index) => (
              <React.Fragment key={step.key}>
                <View className="mx-px flex flex-1 items-center">
                  <View className="bg-light-secondary dark:bg-dark-secondary h-1 w-full">
                    <Animated.View
                      className="absolute left-0 top-0 h-1 bg-black dark:bg-white"
                      style={{
                        width: progressAnims[index]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      }}
                    />
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      <View className="flex-1">
        <Animated.View
          className="flex-1"
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {currentStep?.component}
        </Animated.View>
      </View>
    </View>
  );
}
