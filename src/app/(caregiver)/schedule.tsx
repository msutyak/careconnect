import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { DAYS_OF_WEEK, getDayLabel, formatTime } from '@/utils';
import { AvailabilitySlot, DayOfWeek } from '@/types';

interface DaySchedule {
  day: DayOfWeek;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

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

  const { data: slots, isLoading } = useQuery({
    queryKey: ['availability-slots', caregiver?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('caregiver_id', caregiver!.id)
        .order('start_time');
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!caregiver?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (schedule: DaySchedule[]) => {
      // Delete existing slots
      await supabase
        .from('availability_slots')
        .delete()
        .eq('caregiver_id', caregiver!.id);

      // Insert new enabled slots
      const newSlots = schedule
        .filter((d) => d.enabled && d.startTime && d.endTime)
        .map((d) => ({
          caregiver_id: caregiver!.id,
          day_of_week: d.day,
          start_time: d.startTime,
          end_time: d.endTime,
        }));

      if (newSlots.length > 0) {
        const { error } = await supabase
          .from('availability_slots')
          .insert(newSlots);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
      Alert.alert('Success', 'Your schedule has been updated.');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const initialSchedule: DaySchedule[] = DAYS_OF_WEEK.map((day) => {
    const slot = slots?.find((s) => s.day_of_week === day);
    return {
      day: day as DayOfWeek,
      enabled: !!slot,
      startTime: slot?.start_time?.slice(0, 5) || '09:00',
      endTime: slot?.end_time?.slice(0, 5) || '17:00',
    };
  });

  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);

  React.useEffect(() => {
    if (slots) {
      setSchedule(
        DAYS_OF_WEEK.map((day) => {
          const slot = slots.find((s) => s.day_of_week === day);
          return {
            day: day as DayOfWeek,
            enabled: !!slot,
            startTime: slot?.start_time?.slice(0, 5) || '09:00',
            endTime: slot?.end_time?.slice(0, 5) || '17:00',
          };
        })
      );
    }
  }, [slots]);

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.base,
        paddingBottom: insets.bottom + spacing['2xl'],
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Schedule</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Set your weekly availability
        </Text>
      </View>

      {schedule.map((day, index) => (
        <Card key={day.day} variant="outlined" style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayName, { color: theme.text }]}>
              {getDayLabel(day.day)}
            </Text>
            <Switch
              value={day.enabled}
              onValueChange={(val) => updateDay(index, { enabled: val })}
              trackColor={{ true: colors.primary[500], false: theme.border }}
              thumbColor={colors.white}
            />
          </View>
          {day.enabled && (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Start</Text>
                <TextInput
                  style={[styles.timeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                  value={day.startTime}
                  onChangeText={(val) => updateDay(index, { startTime: val })}
                  placeholder="09:00"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>to</Text>
              <View style={styles.timeField}>
                <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>End</Text>
                <TextInput
                  style={[styles.timeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                  value={day.endTime}
                  onChangeText={(val) => updateDay(index, { endTime: val })}
                  placeholder="17:00"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          )}
        </Card>
      ))}

      <View style={styles.saveButton}>
        <Button
          title="Save Schedule"
          onPress={() => saveMutation.mutate(schedule)}
          loading={saveMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'] },
  subtitle: { fontFamily: fontFamily.regular, fontSize: fontSize.base, marginTop: spacing.xs },
  dayCard: { marginHorizontal: spacing.xl, marginBottom: spacing.md },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontFamily: fontFamily.semibold, fontSize: fontSize.base },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  timeField: { flex: 1 },
  timeLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, marginBottom: spacing.xs },
  timeInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  timeSeparator: { fontFamily: fontFamily.regular, fontSize: fontSize.base, paddingBottom: spacing.sm },
  saveButton: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
});
