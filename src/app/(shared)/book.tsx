import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Avatar, Card, Button, Badge } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatCurrency, formatHourlyRate, formatDate, formatTime, getDayLabel } from '@/utils';
import { AvailabilitySlot, DayOfWeek, Profile, Caregiver } from '@/types';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';

const PLATFORM_FEE_PERCENT = 0.15;

export default function BookingScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { caregiverId } = useLocalSearchParams<{ caregiverId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState('');

  const { data: caregiver } = useQuery({
    queryKey: ['caregiver-detail', caregiverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caregivers')
        .select('*, profile:profiles(*)')
        .eq('id', caregiverId!)
        .single();
      if (error) throw error;
      return data as Caregiver & { profile: Profile };
    },
    enabled: !!caregiverId,
  });

  const { data: slots } = useQuery({
    queryKey: ['caregiver-availability', caregiverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('caregiver_id', caregiverId!)
        .order('start_time');
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!caregiverId,
  });

  const { data: recipient } = useQuery({
    queryKey: ['care-recipient', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_recipients')
        .select('id')
        .eq('profile_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate next 14 days that have availability
  const availableDates = useMemo(() => {
    if (!slots) return [];
    const today = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i);
      const dayName = format(date, 'EEEE').toLowerCase() as DayOfWeek;
      if (slots.some(s => s.day_of_week === dayName)) {
        dates.push(date);
      }
      if (dates.length >= 14) break;
    }
    return dates;
  }, [slots]);

  // Get slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !slots) return [];
    const dayName = format(selectedDate, 'EEEE').toLowerCase() as DayOfWeek;
    return slots.filter(s => s.day_of_week === dayName);
  }, [selectedDate, slots]);

  // Calculate pricing
  const calculateHours = () => {
    if (!selectedSlot) return 0;
    const [sh, sm] = selectedSlot.start_time.split(':').map(Number);
    const [eh, em] = selectedSlot.end_time.split(':').map(Number);
    return (eh + em / 60) - (sh + sm / 60);
  };

  const hours = calculateHours();
  const totalCents = Math.round(hours * (caregiver?.hourly_rate_cents || 0));
  const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_PERCENT);
  const caregiverAmountCents = totalCents - platformFeeCents;

  const createBooking = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          recipient_id: recipient!.id,
          caregiver_id: caregiverId!,
          date: format(selectedDate!, 'yyyy-MM-dd'),
          start_time: selectedSlot!.start_time,
          end_time: selectedSlot!.end_time,
          total_amount_cents: totalCents,
          platform_fee_cents: platformFeeCents,
          caregiver_amount_cents: caregiverAmountCents,
          notes: notes || null,
          status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipient-bookings'] });
      Alert.alert('Booking Requested', 'Your booking request has been sent to the caregiver.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  if (!caregiver) return null;

  const name = `${caregiver.profile.first_name} ${caregiver.profile.last_name}`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing['2xl'] }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Book Appointment</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Caregiver Summary */}
      <Card variant="elevated" style={styles.caregiverSummary}>
        <View style={styles.summaryRow}>
          <Avatar uri={caregiver.profile.avatar_url} name={name} size={48} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.caregiverName, { color: theme.text }]}>{name}</Text>
            <Text style={[styles.caregiverRate, { color: theme.primary }]}>
              {formatHourlyRate(caregiver.hourly_rate_cents)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.dateRow}>
            {availableDates.map((date) => {
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: isSelected ? colors.primary[500] : theme.surface,
                      borderColor: isSelected ? colors.primary[500] : theme.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                >
                  <Text style={[styles.dateDayText, { color: isSelected ? colors.white : theme.textSecondary }]}>
                    {format(date, 'EEE')}
                  </Text>
                  <Text style={[styles.dateNumText, { color: isSelected ? colors.white : theme.text }]}>
                    {format(date, 'd')}
                  </Text>
                  <Text style={[styles.dateMonthText, { color: isSelected ? colors.white : theme.textSecondary }]}>
                    {format(date, 'MMM')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Time Slot Selection */}
      {selectedDate && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Time</Text>
          <View style={styles.slotGrid}>
            {availableSlots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotChip,
                    {
                      backgroundColor: isSelected ? colors.primary[50] : theme.surface,
                      borderColor: isSelected ? colors.primary[500] : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[styles.slotText, { color: isSelected ? colors.primary[700] : theme.text }]}>
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Booking Summary */}
      {selectedDate && selectedSlot && (
        <Card variant="outlined" style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Booking Summary</Text>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Date</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{formatDate(selectedDate)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Time</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
            </Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Duration</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{hours.toFixed(1)} hours</Text>
          </View>
          <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: spacing.sm, marginTop: spacing.sm }]}>
            <Text style={[styles.summaryLabel, { color: theme.text, fontFamily: fontFamily.semibold }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: theme.primary, fontFamily: fontFamily.bold, fontSize: fontSize.xl }]}>
              {formatCurrency(totalCents)}
            </Text>
          </View>
        </Card>
      )}

      {/* Book Button */}
      <View style={styles.bookButton}>
        <Button
          title="Request Booking"
          onPress={() => createBooking.mutate()}
          disabled={!selectedDate || !selectedSlot}
          loading={createBooking.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
  caregiverSummary: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  caregiverName: { fontFamily: fontFamily.semibold, fontSize: fontSize.base },
  caregiverRate: { fontFamily: fontFamily.bold, fontSize: fontSize.lg },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, marginBottom: spacing.md },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateChip: { width: 64, paddingVertical: spacing.md, borderRadius: borderRadius.base, borderWidth: 1, alignItems: 'center', gap: 2 },
  dateDayText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs },
  dateNumText: { fontFamily: fontFamily.bold, fontSize: fontSize.xl },
  dateMonthText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.base, borderWidth: 1.5 },
  slotText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
  summaryCard: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  summaryValue: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
  bookButton: { paddingHorizontal: spacing.xl },
});
