import React from 'react';
import { TouchableOpacity, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { borderRadius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected = false, onPress, onRemove, style }: ChipProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          borderWidth: 1.5,
          backgroundColor: selected ? colors.primary[50] : 'transparent',
          borderColor: selected ? colors.primary[500] : theme.border,
          gap: spacing.xs,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={{
          fontFamily: fontFamily.medium,
          fontSize: fontSize.sm,
          color: selected ? colors.primary[700] : theme.textSecondary,
        }}
      >
        {label}
      </Text>
      {onRemove && selected && (
        <Ionicons
          name="close-circle"
          size={16}
          color={colors.primary[500]}
          onPress={onRemove}
        />
      )}
    </TouchableOpacity>
  );
}
