import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { borderRadius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';

interface BadgeProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantColors = {
  primary: { bg: colors.primary[50], text: colors.primary[700] },
  secondary: { bg: colors.secondary[50], text: colors.secondary[700] },
  success: { bg: colors.secondary[50], text: colors.secondary[700] },
  warning: { bg: colors.yellow[50], text: colors.yellow[600] },
  error: { bg: colors.red[50], text: colors.red[700] },
  gray: { bg: colors.gray[100], text: colors.gray[600] },
};

export function Badge({ text, variant = 'primary', size = 'sm', style }: BadgeProps) {
  const colorSet = variantColors[variant];

  return (
    <View
      style={[
        {
          backgroundColor: colorSet.bg,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? 2 : spacing.xs,
          borderRadius: borderRadius.full,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.medium,
          fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
          color: colorSet.text,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
