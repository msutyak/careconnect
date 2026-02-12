import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Card, Avatar, Badge, LoadingScreen } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatCurrency, formatDate, formatTimeRange } from '@/utils';
import { Booking } from '@/types';

export default function CaregiverDashboard() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const { data: caregiver } = useQuery({
    queryKey: ['caregiver', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caregivers')
        .select('*')
        .eq('profile_id', profile!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: todayBookings, isLoading, refetch } = useQuery({
    queryKey: ['today-bookings', caregiver?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          recipient:care_recipients(
            *,
            profile:profiles(*)
          )
        `)
        .eq('caregiver_id', caregiver!.id)
        .eq('date', today)
        .in('status', ['confirmed', 'in_progress'])
        .order('start_time');
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!caregiver?.id,
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-requests', caregiver?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          recipient:care_recipients(
            *,
            profile:profiles(*)
          )
        `)
        .eq('caregiver_id', caregiver!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!caregiver?.id,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              {greeting()}
            </Text>
            <Text style={[styles.name, { color: theme.text }]}>
              {profile?.first_name} {profile?.last_name}
            </Text>
          </View>
          <Avatar
            uri={profile?.avatar_url}
            name={`${profile?.first_name} ${profile?.last_name}`}
            size={48}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} variant="elevated">
          <Ionicons name="cash-outline" size={24} color={colors.secondary[500]} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {formatCurrency((caregiver?.total_bookings || 0) * (caregiver?.hourly_rate_cents || 0))}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Earnings</Text>
        </Card>
        <Card style={styles.statCard} variant="elevated">
          <Ionicons name="calendar-outline" size={24} color={colors.primary[500]} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {caregiver?.total_bookings || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Bookings</Text>
        </Card>
        <Card style={styles.statCard} variant="elevated">
          <Ionicons name="star" size={24} color={colors.yellow[500]} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {caregiver?.average_rating ? Number(caregiver.average_rating).toFixed(1) : '0.0'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
        </Card>
      </View>

      {/* Today's Schedule */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Schedule</Text>
        {!todayBookings?.length ? (
          <Card variant="filled" style={styles.emptyCard}>
            <Ionicons name="sunny-outline" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No appointments today
            </Text>
          </Card>
        ) : (
          todayBookings.map((booking) => (
            <Card key={booking.id} variant="outlined" style={styles.bookingCard}>
              <View style={styles.bookingRow}>
                <Avatar
                  uri={booking.recipient?.profile?.avatar_url}
                  name={`${booking.recipient?.profile?.first_name} ${booking.recipient?.profile?.last_name}`}
                  size={40}
                />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[styles.bookingName, { color: theme.text }]}>
                    {booking.recipient?.profile?.first_name} {booking.recipient?.profile?.last_name}
                  </Text>
                  <Text style={[styles.bookingTime, { color: theme.textSecondary }]}>
                    {formatTimeRange(booking.start_time, booking.end_time)}
                  </Text>
                </View>
                <Badge
                  text={booking.status}
                  variant={booking.status === 'confirmed' ? 'primary' : 'success'}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Pending Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pending Requests</Text>
          {pendingRequests.map((booking) => (
            <Card
              key={booking.id}
              variant="outlined"
              style={styles.bookingCard}
              onPress={() => router.push(`/(caregiver)/bookings`)}
            >
              <View style={styles.bookingRow}>
                <Avatar
                  uri={booking.recipient?.profile?.avatar_url}
                  name={`${booking.recipient?.profile?.first_name} ${booking.recipient?.profile?.last_name}`}
                  size={40}
                />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[styles.bookingName, { color: theme.text }]}>
                    {booking.recipient?.profile?.first_name} {booking.recipient?.profile?.last_name}
                  </Text>
                  <Text style={[styles.bookingTime, { color: theme.textSecondary }]}>
                    {formatDate(booking.date)} - {formatTimeRange(booking.start_time, booking.end_time)}
                  </Text>
                </View>
                <Badge text="New" variant="warning" />
              </View>
            </Card>
          ))}
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
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.base,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing['2xl'],
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  bookingCard: {
    marginBottom: spacing.sm,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  bookingTime: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
