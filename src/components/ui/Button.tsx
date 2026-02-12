import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { borderRadius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const { theme } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: borderRadius.base,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    };

    switch (size) {
      case 'sm':
        base.paddingVertical = spacing.sm;
        base.paddingHorizontal = spacing.base;
        break;
      case 'lg':
        base.paddingVertical = spacing.base;
        base.paddingHorizontal = spacing.xl;
        break;
      default:
        base.paddingVertical = spacing.md;
        base.paddingHorizontal = spacing.lg;
    }

    if (fullWidth) base.width = '100%';

    switch (variant) {
      case 'primary':
        base.backgroundColor = colors.primary[500];
        break;
      case 'secondary':
        base.backgroundColor = colors.secondary[500];
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = colors.primary[500];
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'danger':
        base.backgroundColor = colors.red[500];
        break;
    }

    if (disabled || loading) {
      base.opacity = 0.6;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontFamily: fontFamily.semibold,
    };

    switch (size) {
      case 'sm':
        base.fontSize = fontSize.sm;
        break;
      case 'lg':
        base.fontSize = fontSize.lg;
        break;
      default:
        base.fontSize = fontSize.base;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        base.color = colors.white;
        break;
      case 'outline':
        base.color = colors.primary[500];
        break;
      case 'ghost':
        base.color = theme.primary;
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? theme.primary : colors.white}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
