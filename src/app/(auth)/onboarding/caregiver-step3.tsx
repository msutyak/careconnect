import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button } from '@/components/ui';
import { OnboardingStepper } from '@/components/ui/OnboardingStepper';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { DayOfWeek } from '@/types';

const STEP_LABELS = ['Personal Info', 'Professional', 'Availability', 'Set Your Rate', 'Profile Photo'];

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const DAYS: { label: string; value: DayOfWeek }[] = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

const initialAvailability: Record<DayOfWeek, DayAvailability> = {
  monday: { enabled: true, startTime: DEFAULT_START, endTime: DEFAULT_END },
  tuesday: { enabled: true, startTime: DEFAULT_START, endTime: DEFAULT_END },
  wednesday: { enabled: true, startTime: DEFAULT_START, endTime: DEFAULT_END },
  thursday: { enabled: true, startTime: DEFAULT_START, endTime: DEFAULT_END },
  friday: { enabled: true, startTime: DEFAULT_START, endTime: DEFAULT_END },
  saturday: { enabled: false, startTime: DEFAULT_START, endTime: DEFAULT_END },
  sunday: { enabled: false, startTime: DEFAULT_START, endTime: DEFAULT_END },
};

const isValidTime = (time: string): boolean => {
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match !== null;
};

export default function CaregiverStep3Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [availability, setAvailability] =
    useState<Record<DayOfWeek, DayAvailability>>(initialAvailability);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleDay = (day: DayOfWeek) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateTime = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const enabledDays = DAYS.filter((d) => availability[d.value].enabled);

    if (enabledDays.length === 0) {
      newErrors.general = 'Please enable at least one day';
    }

    enabledDays.forEach((d) => {
      const day = availability[d.value];
      if (!isValidTime(day.startTime)) {
        newErrors[`${d.value}_start`] = 'Invalid time format (HH:MM)';
      }
      if (!isValidTime(day.endTime)) {
        newErrors[`${d.value}_end`] = 'Invalid time format (HH:MM)';
      }
      if (isValidTime(day.startTime) && isValidTime(day.endTime) && day.startTime >= day.endTime) {
        newErrors[`${d.value}_range`] = 'End time must be after start time';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (!user) return;

    setSaving(true);
    try {
      // Get caregiver ID
      const { data: caregiver, error: cgError } = await supabase
        .from('caregivers')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (cgError || !caregiver) throw new Error('Caregiver profile not found');

      // Delete existing availability slots
      await supabase
        .from('availability_slots')
        .delete()
        .eq('caregiver_id', caregiver.id);

      // Insert new availability slots
      const slots = DAYS.filter((d) => availability[d.value].enabled).map((d) => ({
        caregiver_id: caregiver.id,
        day_of_week: d.value,
        start_time: availability[d.value].startTime,
        end_time: availability[d.value].endTime,
      }));

      if (slots.length > 0) {
        const { error } = await supabase.from('availability_slots').insert(slots);
        if (error) throw error;
      }

      router.push('/(auth)/onboarding/caregiver-step4');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Set Your Availability</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Let care recipients know when you are available to work
        </Text>
      </View>

      <OnboardingStepper currentStep={3} totalSteps={5} stepLabels={STEP_LABELS} />

      {errors.general && (
        <View style={[styles.errorBanner, { backgroundColor: colors.red[50] }]}>
          <Text style={[styles.errorBannerText, { color: colors.red[600] }]}>
            {errors.general}
          </Text>
        </View>
      )}

      <View style={styles.daysList}>
        {DAYS.map((day) => {
          const dayData = availability[day.value];
          const dayStartError = errors[`${day.value}_start`];
          const dayEndError = errors[`${day.value}_end`];
          const dayRangeError = errors[`${day.value}_range`];

          return (
            <View
              key={day.value}
              style={[
                styles.dayRow,
                {
                  backgroundColor: dayData.enabled ? theme.surface : 'transparent',
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.dayHeader}>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: dayData.enabled ? theme.text : theme.textTertiary,
                    },
                  ]}
                >
                  {day.label}
                </Text>
                <Switch
                  value={dayData.enabled}
                  onValueChange={() => toggleDay(day.value)}
                  trackColor={{ false: theme.border, true: colors.primary[300] }}
                  thumbColor={dayData.enabled ? colors.primary[500] : colors.gray[300]}
                />
              </View>

              {dayData.enabled && (
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Start</Text>
                    <TextInput
                      style={[
                        styles.timeInput,
                        {
                          color: theme.text,
                          borderColor: dayStartError ? theme.error : theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                      value={dayData.startTime}
                      onChangeText={(val) => updateTime(day.value, 'startTime', val)}
                      placeholder="09:00"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    {dayStartError && (
                      <Text style={[styles.timeError, { color: theme.error }]}>
                        {dayStartError}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>to</Text>

                  <View style={styles.timeField}>
                    <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>End</Text>
                    <TextInput
                      style={[
                        styles.timeInput,
                        {
                          color: theme.text,
                          borderColor: dayEndError ? theme.error : theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                      value={dayData.endTime}
                      onChangeText={(val) => updateTime(day.value, 'endTime', val)}
                      placeholder="17:00"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    {dayEndError && (
                      <Text style={[styles.timeError, { color: theme.error }]}>
                        {dayEndError}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {dayRangeError && dayData.enabled && (
                <Text style={[styles.rangeError, { color: theme.error }]}>
                  {dayRangeError}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Back"
          variant="outline"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <Button
          title="Next"
          onPress={handleNext}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  errorBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.base,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  daysList: {
    gap: spacing.md,
    flex: 1,
  },
  dayRow: {
    borderWidth: 1,
    borderRadius: borderRadius.base,
    padding: spacing.base,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  timeInput: {
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  timeError: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  timeSeparator: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    paddingBottom: spacing.sm,
  },
  rangeError: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
