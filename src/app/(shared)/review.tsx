import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Button, StarRating } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';

export default function ReviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { bookingId, caregiverId } = useLocalSearchParams<{ bookingId: string; caregiverId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId!,
        reviewer_id: user!.id,
        caregiver_id: caregiverId!,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-detail'] });
      Alert.alert('Thank You', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing['2xl'] }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Leave a Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.ratingSection}>
        <Text style={[styles.ratingLabel, { color: theme.text }]}>How was your experience?</Text>
        <StarRating rating={rating} size={40} onRate={setRating} readonly={false} />
        <Text style={[styles.ratingHint, { color: theme.textSecondary }]}>
          {rating === 0 ? 'Tap to rate' : rating <= 2 ? 'We\'re sorry to hear that' : rating <= 3 ? 'Okay experience' : rating === 4 ? 'Good experience!' : 'Excellent!'}
        </Text>
      </View>

      <View style={styles.commentSection}>
        <Text style={[styles.commentLabel, { color: theme.text }]}>Tell us more (optional)</Text>
        <TextInput
          style={[
            styles.commentInput,
            { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          placeholder="Share your experience with this caregiver..."
          placeholderTextColor={theme.textTertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={5}
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: theme.textTertiary }]}>
          {comment.length}/1000
        </Text>
      </View>

      <View style={styles.submitButton}>
        <Button
          title="Submit Review"
          onPress={() => submitReview.mutate()}
          disabled={rating === 0}
          loading={submitReview.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
  ratingSection: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.md },
  ratingLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.xl },
  ratingHint: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
  commentSection: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  commentLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.base, marginBottom: spacing.sm },
  commentInput: {
    borderWidth: 1,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    minHeight: 120,
  },
  charCount: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, textAlign: 'right', marginTop: spacing.xs },
  submitButton: { paddingHorizontal: spacing.xl },
});
