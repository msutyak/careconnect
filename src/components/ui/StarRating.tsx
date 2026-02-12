import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface StarRatingProps {
  rating: number;
  size?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({
  rating,
  size = 20,
  onRate,
  readonly = true,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const filled = star <= Math.round(rating);
        const halfFilled = !filled && star - 0.5 <= rating;

        const iconName = filled
          ? 'star'
          : halfFilled
          ? 'star-half'
          : 'star-outline';

        if (readonly) {
          return (
            <Ionicons
              key={star}
              name={iconName}
              size={size}
              color={colors.yellow[500]}
            />
          );
        }

        return (
          <TouchableOpacity
            key={star}
            onPress={() => onRate?.(star)}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={size} color={colors.yellow[500]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});
