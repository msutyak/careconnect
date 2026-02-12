import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Card, Avatar, Badge, StarRating } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { EXPERTISE_OPTIONS } from '@/constants/expertise-options';
import { formatHourlyRate } from '@/utils';
import { Caregiver } from '@/types';

function CaregiverCardSmall({ caregiver }: { caregiver: any }) {
  const { theme } = useTheme();
  const name = `${caregiver.first_name} ${caregiver.last_name}`;

  return (
    <Card
      style={styles.caregiverCard}
      variant="elevated"
      onPress={() => router.push(`/(shared)/caregiver-detail?id=${caregiver.caregiver_id}` as any)}
    >
      <Avatar
        uri={caregiver.avatar_url}
        name={name}
        size={64}
      />
      <Text style={[styles.caregiverName, { color: theme.text }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.ratingRow}>
        <StarRating rating={Number(caregiver.average_rating || 0)} size={14} />
        <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
          ({caregiver.total_reviews || 0})
        </Text>
      </View>
      <Text style={[styles.rate, { color: theme.primary }]}>
        {formatHourlyRate(caregiver.hourly_rate_cents)}
      </Text>
    </Card>
  );
}

export default function RecipientHomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const { data: topRated, isLoading, refetch } = useQuery({
    queryKey: ['top-rated-caregivers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_available_caregivers', {
        p_sort_by: 'rating',
        p_limit: 10,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: featured } = useQuery({
    queryKey: ['featured-caregivers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_available_caregivers', {
        p_sort_by: 'reviews',
        p_limit: 5,
      });
      if (error) throw error;
      return data;
    },
  });

  const specialties = EXPERTISE_OPTIONS.slice(0, 8);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Hello, {profile?.first_name}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>Find Your Caregiver</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(recipient)/profile')}
        >
          <Avatar
            uri={profile?.avatar_url}
            name={`${profile?.first_name} ${profile?.last_name}`}
            size={44}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push('/(recipient)/search')}
        activeOpacity={0.7}
      >
        <Ionicons name="search" size={20} color={theme.textTertiary} />
        <Text style={[styles.searchPlaceholder, { color: theme.textTertiary }]}>
          Search caregivers...
        </Text>
      </TouchableOpacity>

      {/* Browse by Specialty */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Browse by Specialty</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.specialtyRow}>
            {specialties.map((spec) => (
              <TouchableOpacity
                key={spec.value}
                style={[styles.specialtyChip, { backgroundColor: colors.primary[50] }]}
                onPress={() => router.push(`/(recipient)/search?expertise=${spec.value}`)}
              >
                <Text style={[styles.specialtyText, { color: colors.primary[700] }]}>
                  {spec.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Featured Caregivers */}
      {featured && featured.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured</Text>
            <TouchableOpacity onPress={() => router.push('/(recipient)/search')}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {featured.map((cg: any) => (
                <CaregiverCardSmall key={cg.caregiver_id} caregiver={cg} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Top Rated */}
      {topRated && topRated.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Rated</Text>
            <TouchableOpacity onPress={() => router.push('/(recipient)/search?sort=rating')}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {topRated.slice(0, 5).map((cg: any) => {
            const name = `${cg.first_name} ${cg.last_name}`;
            return (
              <Card
                key={cg.caregiver_id}
                variant="outlined"
                style={styles.listCard}
                onPress={() => router.push(`/(shared)/caregiver-detail?id=${cg.caregiver_id}` as any)}
              >
                <View style={styles.listRow}>
                  <Avatar uri={cg.avatar_url} name={name} size={48} />
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: theme.text }]}>{name}</Text>
                    <View style={styles.listMeta}>
                      <StarRating rating={Number(cg.average_rating || 0)} size={14} />
                      <Text style={[styles.listReviews, { color: theme.textSecondary }]}>
                        ({cg.total_reviews})
                      </Text>
                    </View>
                    {cg.expertise?.length > 0 && (
                      <Text style={[styles.listExpertise, { color: theme.textSecondary }]} numberOfLines={1}>
                        {cg.expertise.slice(0, 2).map((e: string) =>
                          EXPERTISE_OPTIONS.find(o => o.value === e)?.label || e
                        ).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.listRate, { color: theme.primary }]}>
                    {formatHourlyRate(cg.hourly_rate_cents)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  greeting: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  searchPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  seeAll: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  specialtyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  specialtyChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  specialtyText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  caregiverCard: {
    width: 140,
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.xs,
  },
  caregiverName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  rate: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
  },
  listCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  listReviews: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  listExpertise: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  listRate: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
  },
});
