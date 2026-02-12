import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Card, Avatar, Badge, Button, EmptyState } from '@/components/ui';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatDate, formatTimeRange, formatCurrency } from '@/utils';
import { Booking, BookingStatus } from '@/types';
import { EXPERTISE_OPTIONS } from '@/constants/expertise-options';

const TABS: { label: string; statuses: BookingStatus[] }[] = [
  { label: 'Upcoming', statuses: ['pending', 'confirmed', 'in_progress'] },
  { label: 'Past', statuses: ['completed'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
];

const statusVariant: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'gray'> = {
  pending: 'warning',
  confirmed: 'primary',
  in_progress: 'success',
  completed: 'gray',
  cancelled: 'error',
};

export default function RecipientBookingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);

  const { data: recipient } = useQuery({
    queryKey: ['care-recipient', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_recipients')
        .select('id')
        .eq('profile_id', profile!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['recipient-bookings', recipient?.id, activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, caregiver:caregivers(*, profile:profiles(*))`)
        .eq('recipient_id', recipient!.id)
        .in('status', TABS[activeTab].statuses)
        .order('date', { ascending: activeTab === 0 });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!recipient?.id,
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' as BookingStatus, cancellation_reason: 'Cancelled by recipient' })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipient-bookings'] });
    },
  });

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelBooking.mutate(bookingId) },
    ]);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const caregiverName = `${item.caregiver?.profile?.first_name || ''} ${item.caregiver?.profile?.last_name || ''}`;
    return (
      <Card variant="elevated" style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Avatar uri={item.caregiver?.profile?.avatar_url} name={caregiverName} size={44} />
          <View style={styles.bookingInfo}>
            <Text style={[styles.bookingName, { color: theme.text }]}>{caregiverName}</Text>
            <Text style={[styles.bookingDate, { color: theme.textSecondary }]}>
              {formatDate(item.date)} - {formatTimeRange(item.start_time, item.end_time)}
            </Text>
          </View>
          <Badge text={item.status.replace('_', ' ')} variant={statusVariant[item.status]} />
        </View>
        <View style={styles.bookingFooter}>
          <Text style={[styles.bookingAmount, { color: theme.text }]}>
            {formatCurrency(item.total_amount_cents)}
          </Text>
          <View style={styles.actionButtons}>
            {(item.status === 'pending' || item.status === 'confirmed') && (
              <Button title="Cancel" onPress={() => handleCancel(item.id)} variant="outline" size="sm" fullWidth={false} />
            )}
            {item.status === 'completed' && (
              <Button
                title="Leave Review"
                onPress={() => router.push(`/(shared)/review?bookingId=${item.id}&caregiverId=${item.caregiver_id}` as any)}
                size="sm"
                fullWidth={false}
              />
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + spacing.base }]}>
      <Text style={[styles.title, { color: theme.text }]}>My Bookings</Text>
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, { borderBottomColor: i === activeTab ? colors.primary[500] : 'transparent' }]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, { color: i === activeTab ? colors.primary[500] : theme.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={bookings || []}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState icon="clipboard-outline" title="No bookings" message={`No ${TABS[activeTab].label.toLowerCase()} bookings`} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'], paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2 },
  tabText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] },
  bookingCard: { marginBottom: spacing.md },
  bookingHeader: { flexDirection: 'row', alignItems: 'center' },
  bookingInfo: { flex: 1, marginLeft: spacing.md },
  bookingName: { fontFamily: fontFamily.semibold, fontSize: fontSize.base },
  bookingDate: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  bookingAmount: { fontFamily: fontFamily.bold, fontSize: fontSize.base },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
});
