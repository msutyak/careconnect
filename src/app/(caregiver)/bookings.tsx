import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Card, Avatar, Badge, Button, EmptyState } from '@/components/ui';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatDate, formatTimeRange, formatCurrency } from '@/utils';
import { Booking, BookingStatus } from '@/types';

const TABS: { label: string; statuses: BookingStatus[] }[] = [
  { label: 'Upcoming', statuses: ['pending', 'confirmed'] },
  { label: 'Active', statuses: ['in_progress'] },
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

export default function CaregiverBookingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);

  const { data: caregiver } = useQuery({
    queryKey: ['caregiver', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caregivers')
        .select('id')
        .eq('profile_id', profile!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['caregiver-bookings', caregiver?.id, activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, recipient:care_recipients(*, profile:profiles(*))`)
        .eq('caregiver_id', caregiver!.id)
        .in('status', TABS[activeTab].statuses)
        .order('date', { ascending: activeTab < 2 });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!caregiver?.id,
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['today-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
    },
  });

  const handleAction = (bookingId: string, action: string) => {
    const actionMap: Record<string, { status: BookingStatus; message: string }> = {
      accept: { status: 'confirmed', message: 'Accept this booking?' },
      decline: { status: 'cancelled', message: 'Decline this booking?' },
      start: { status: 'in_progress', message: 'Start this session?' },
      complete: { status: 'completed', message: 'Mark this session as complete?' },
    };
    const { status, message } = actionMap[action];
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => updateBooking.mutate({ id: bookingId, status }) },
    ]);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const recipientName = `${item.recipient?.profile?.first_name || ''} ${item.recipient?.profile?.last_name || ''}`;
    return (
      <Card variant="elevated" style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Avatar uri={item.recipient?.profile?.avatar_url} name={recipientName} size={44} />
          <View style={styles.bookingInfo}>
            <Text style={[styles.bookingName, { color: theme.text }]}>{recipientName}</Text>
            <Text style={[styles.bookingDate, { color: theme.textSecondary }]}>
              {formatDate(item.date)} - {formatTimeRange(item.start_time, item.end_time)}
            </Text>
          </View>
          <Badge text={item.status.replace('_', ' ')} variant={statusVariant[item.status]} />
        </View>
        <View style={styles.bookingFooter}>
          <Text style={[styles.bookingAmount, { color: theme.text }]}>
            {formatCurrency(item.caregiver_amount_cents)}
          </Text>
          {item.status === 'pending' && (
            <View style={styles.actionButtons}>
              <Button title="Decline" onPress={() => handleAction(item.id, 'decline')} variant="outline" size="sm" fullWidth={false} />
              <Button title="Accept" onPress={() => handleAction(item.id, 'accept')} size="sm" fullWidth={false} />
            </View>
          )}
          {item.status === 'confirmed' && (
            <Button title="Start Session" onPress={() => handleAction(item.id, 'start')} variant="secondary" size="sm" fullWidth={false} />
          )}
          {item.status === 'in_progress' && (
            <Button title="Complete" onPress={() => handleAction(item.id, 'complete')} variant="secondary" size="sm" fullWidth={false} />
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + spacing.base }]}>
      <Text style={[styles.title, { color: theme.text }]}>Bookings</Text>
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.label}
            style={[
              styles.tab,
              { borderBottomColor: i === activeTab ? colors.primary[500] : 'transparent' },
            ]}
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
