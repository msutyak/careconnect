import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Avatar, Badge, StarRating, Card, Button, Divider, EmptyState } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { EXPERTISE_OPTIONS, EDUCATION_LEVELS } from '@/constants/expertise-options';
import { formatHourlyRate, getDayLabel, formatTime } from '@/utils';
import { Caregiver, AvailabilitySlot, Review, Profile } from '@/types';

export default function CaregiverDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const { data: caregiver } = useQuery({
    queryKey: ['caregiver-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caregivers')
        .select('*, profile:profiles(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Caregiver & { profile: Profile };
    },
    enabled: !!id,
  });

  const { data: slots } = useQuery({
    queryKey: ['caregiver-availability', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('caregiver_id', id!)
        .order('start_time');
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['caregiver-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles(*)')
        .eq('caregiver_id', id!)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as (Review & { reviewer: Profile })[];
    },
    enabled: !!id,
  });

  const startConversation = useMutation({
    mutationFn: async () => {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1_id.eq.${user!.id},participant_2_id.eq.${caregiver!.profile_id}),and(participant_1_id.eq.${caregiver!.profile_id},participant_2_id.eq.${user!.id})`
        )
        .single();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: user!.id,
          participant_2_id: caregiver!.profile_id,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (conversationId) => {
      router.push(`/(shared)/chat?conversationId=${conversationId}`);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  if (!caregiver) return null;

  const profile = caregiver.profile;
  const name = `${profile.first_name} ${profile.last_name}`;
  const educationLabel = EDUCATION_LEVELS.find(e => e.value === caregiver.education_level)?.label;

  const groupedSlots = slots?.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {}) || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      {/* Header with back button */}
      <View style={[styles.backRow, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Avatar uri={profile.avatar_url} name={name} size={96} />
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        {educationLabel && <Badge text={educationLabel} variant="primary" />}
        <View style={styles.ratingRow}>
          <StarRating rating={Number(caregiver.average_rating || 0)} size={20} />
          <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
            {Number(caregiver.average_rating || 0).toFixed(1)} ({caregiver.total_reviews} reviews)
          </Text>
        </View>
        <Text style={[styles.rate, { color: theme.primary }]}>
          {formatHourlyRate(caregiver.hourly_rate_cents)}
        </Text>
        {profile.city && profile.state && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.locationText, { color: theme.textSecondary }]}>
              {profile.city}, {profile.state}
            </Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {caregiver.bio && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
          <Text style={[styles.bioText, { color: theme.textSecondary }]}>{caregiver.bio}</Text>
        </View>
      )}

      {/* Expertise */}
      {caregiver.expertise.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Expertise</Text>
          <View style={styles.chipRow}>
            {caregiver.expertise.map((e) => {
              const label = EXPERTISE_OPTIONS.find(o => o.value === e)?.label || e;
              return <Badge key={e} text={label} variant="secondary" style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />;
            })}
          </View>
        </View>
      )}

      {/* Availability Preview */}
      {Object.keys(groupedSlots).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Availability</Text>
          {Object.entries(groupedSlots).map(([day, daySlots]) => (
            <View key={day} style={styles.availabilityRow}>
              <Text style={[styles.dayText, { color: theme.text }]}>{getDayLabel(day)}</Text>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {daySlots.map(s => `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`).join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Reviews ({caregiver.total_reviews})
        </Text>
        {reviews && reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id} variant="filled" style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar uri={review.reviewer?.avatar_url} name={`${review.reviewer?.first_name} ${review.reviewer?.last_name}`} size={32} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.reviewerName, { color: theme.text }]}>
                    {review.reviewer?.first_name} {review.reviewer?.last_name}
                  </Text>
                  <StarRating rating={review.rating} size={14} />
                </View>
              </View>
              {review.comment && (
                <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>
                  {review.comment}
                </Text>
              )}
              {review.response && (
                <View style={[styles.reviewResponse, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.reviewResponseLabel, { color: theme.primary }]}>Response:</Text>
                  <Text style={[styles.reviewResponseText, { color: theme.text }]}>
                    {review.response}
                  </Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Text style={[styles.noReviews, { color: theme.textSecondary }]}>No reviews yet</Text>
        )}
      </View>

      {/* Action Buttons - Fixed at bottom */}
      <View style={[styles.actionBar, { backgroundColor: theme.card, borderTopColor: theme.borderLight, paddingBottom: insets.bottom + spacing.base }]}>
        <Button
          title="Message"
          onPress={() => startConversation.mutate()}
          variant="outline"
          fullWidth={false}
          style={{ flex: 1 }}
          loading={startConversation.isPending}
        />
        <Button
          title="Book Now"
          onPress={() => router.push(`/(shared)/book?caregiverId=${id}` as any)}
          fullWidth={false}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  profileSection: { alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.xs, marginBottom: spacing.xl },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'], marginTop: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  rate: { fontFamily: fontFamily.bold, fontSize: fontSize.xl },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, marginBottom: spacing.md },
  bioText: { fontFamily: fontFamily.regular, fontSize: fontSize.base, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  dayText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, width: 100 },
  timeText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, flex: 1, textAlign: 'right' },
  reviewCard: { marginBottom: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewerName: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
  reviewComment: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 20 },
  reviewResponse: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md },
  reviewResponseLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs },
  reviewResponseText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, marginTop: 2 },
  noReviews: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
