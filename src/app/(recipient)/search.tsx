import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Card, Avatar, Badge, StarRating, BottomSheet, Chip, Button, EmptyState } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { EXPERTISE_OPTIONS, EDUCATION_LEVELS } from '@/constants/expertise-options';
import { formatHourlyRate } from '@/utils';

const SORT_OPTIONS = [
  { label: 'Top Rated', value: 'rating' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
  { label: 'Most Reviews', value: 'reviews' },
  { label: 'Most Experience', value: 'experience' },
];

export default function SearchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ expertise?: string; sort?: string }>();

  const [searchText, setSearchText] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>(
    params.expertise ? [params.expertise] : []
  );
  const [selectedEducation, setSelectedEducation] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState(params.sort || 'rating');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const { data: caregivers, isLoading, refetch } = useQuery({
    queryKey: ['search-caregivers', searchText, selectedExpertise, selectedEducation, sortBy, minRating, page],
    queryFn: async () => {
      const params: any = {
        p_sort_by: sortBy,
        p_limit: 20,
        p_offset: page * 20,
      };
      if (searchText) params.p_search_text = searchText;
      if (selectedExpertise.length > 0) params.p_expertise = selectedExpertise;
      if (selectedEducation.length > 0) params.p_education = selectedEducation;
      if (minRating) params.p_min_rating = minRating;

      const { data, error } = await supabase.rpc('search_available_caregivers', params);
      if (error) throw error;
      return data;
    },
  });

  const toggleExpertise = (value: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleEducation = (value: string) => {
    setSelectedEducation((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setSelectedExpertise([]);
    setSelectedEducation([]);
    setMinRating(null);
    setSortBy('rating');
  };

  const renderCaregiverItem = ({ item }: { item: any }) => {
    const name = `${item.first_name} ${item.last_name}`;
    return (
      <Card
        variant="elevated"
        style={styles.resultCard}
        onPress={() => router.push(`/(shared)/caregiver-detail?id=${item.caregiver_id}` as any)}
      >
        <View style={styles.resultRow}>
          <Avatar uri={item.avatar_url} name={name} size={56} />
          <View style={styles.resultInfo}>
            <Text style={[styles.resultName, { color: theme.text }]}>{name}</Text>
            <View style={styles.resultMeta}>
              <StarRating rating={Number(item.average_rating || 0)} size={14} />
              <Text style={[styles.resultReviews, { color: theme.textSecondary }]}>
                ({item.total_reviews})
              </Text>
            </View>
            {item.city && item.state && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.locationText, { color: theme.textSecondary }]}>
                  {item.city}, {item.state}
                </Text>
              </View>
            )}
            {item.expertise?.length > 0 && (
              <View style={styles.expertiseRow}>
                {item.expertise.slice(0, 3).map((e: string) => {
                  const label = EXPERTISE_OPTIONS.find(o => o.value === e)?.label || e;
                  return <Badge key={e} text={label} variant="gray" size="sm" style={{ marginRight: 4 }} />;
                })}
              </View>
            )}
          </View>
          <View style={styles.resultPrice}>
            <Text style={[styles.priceText, { color: theme.primary }]}>
              {formatHourlyRate(item.hourly_rate_cents)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.searchInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search caregivers..."
            placeholderTextColor={theme.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => setShowFilters(true)}>
          <Ionicons
            name="options-outline"
            size={24}
            color={selectedExpertise.length > 0 || selectedEducation.length > 0 ? theme.primary : theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Sort Row */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.slice(0, 3).map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === opt.value ? colors.primary[50] : theme.surface,
                borderColor: sortBy === opt.value ? colors.primary[500] : theme.border,
              },
            ]}
            onPress={() => setSortBy(opt.value)}
          >
            <Text
              style={[
                styles.sortText,
                { color: sortBy === opt.value ? colors.primary[700] : theme.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={caregivers || []}
          keyExtractor={(item) => item.caregiver_id}
          renderItem={renderCaregiverItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No caregivers found"
              message="Try adjusting your search or filters"
            />
          }
        />
      )}

      {/* Filters Bottom Sheet */}
      <BottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        snapPoint={0.85}
      >
        <Text style={[styles.filterLabel, { color: theme.text }]}>Specialty</Text>
        <View style={styles.chipGrid}>
          {EXPERTISE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={selectedExpertise.includes(opt.value)}
              onPress={() => toggleExpertise(opt.value)}
              style={{ marginBottom: spacing.sm }}
            />
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: theme.text, marginTop: spacing.lg }]}>Education Level</Text>
        <View style={styles.chipGrid}>
          {EDUCATION_LEVELS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={selectedEducation.includes(opt.value)}
              onPress={() => toggleEducation(opt.value)}
              style={{ marginBottom: spacing.sm }}
            />
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: theme.text, marginTop: spacing.lg }]}>Minimum Rating</Text>
        <View style={styles.ratingFilter}>
          {[3, 3.5, 4, 4.5].map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.ratingChip,
                {
                  backgroundColor: minRating === r ? colors.yellow[50] : theme.surface,
                  borderColor: minRating === r ? colors.yellow[500] : theme.border,
                },
              ]}
              onPress={() => setMinRating(minRating === r ? null : r)}
            >
              <Ionicons name="star" size={14} color={colors.yellow[500]} />
              <Text style={{ fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: theme.text }}>
                {r}+
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: theme.text, marginTop: spacing.lg }]}>Sort By</Text>
        <View style={styles.chipGrid}>
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={sortBy === opt.value}
              onPress={() => setSortBy(opt.value)}
              style={{ marginBottom: spacing.sm }}
            />
          ))}
        </View>

        <View style={styles.filterButtons}>
          <Button title="Clear All" onPress={clearFilters} variant="ghost" fullWidth={false} />
          <Button title="Apply Filters" onPress={() => setShowFilters(false)} fullWidth={false} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchTextInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    paddingVertical: 2,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  sortText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] },
  resultCard: { marginBottom: spacing.md },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start' },
  resultInfo: { flex: 1, marginLeft: spacing.md },
  resultName: { fontFamily: fontFamily.semibold, fontSize: fontSize.base },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  resultReviews: { fontFamily: fontFamily.regular, fontSize: fontSize.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs },
  expertiseRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  resultPrice: { alignItems: 'flex-end' },
  priceText: { fontFamily: fontFamily.bold, fontSize: fontSize.lg },
  filterLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, marginBottom: spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  ratingFilter: { flexDirection: 'row', gap: spacing.sm },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
