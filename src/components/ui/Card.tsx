import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { borderRadius, spacing, shadow } from '@/constants/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: number;
}

export function Card({
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = spacing.base,
}: CardProps) {
  const { theme } = useTheme();

  const cardStyle: ViewStyle = {
    borderRadius: borderRadius.lg,
    padding,
    ...(variant === 'elevated'
      ? {
          backgroundColor: theme.card,
          ...shadow.md,
        }
      : variant === 'outlined'
      ? {
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }
      : {
          backgroundColor: theme.surface,
        }),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
