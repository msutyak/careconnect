import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function OnboardingStepper({
  currentStep,
  totalSteps,
  stepLabels,
}: OnboardingStepperProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor:
                    step <= currentStep ? colors.primary[500] : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  {
                    color: step <= currentStep ? colors.white : theme.textSecondary,
                  },
                ]}
              >
                {step}
              </Text>
            </View>
            {step < totalSteps && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      step < currentStep ? colors.primary[500] : theme.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
      {stepLabels && stepLabels[currentStep - 1] && (
        <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>
          Step {currentStep} of {totalSteps}: {stepLabels[currentStep - 1]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
  connector: {
    height: 2,
    width: 40,
  },
  stepLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
