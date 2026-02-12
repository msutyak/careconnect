import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/constants/spacing';

interface DividerProps {
  style?: ViewStyle;
}

export function Divider({ style }: DividerProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: theme.borderLight,
          marginVertical: spacing.base,
        },
        style,
      ]}
    />
  );
}
