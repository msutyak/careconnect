import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

const STEP_LABELS = ['Personal Info', 'Professional', 'Availability', 'Set Your Rate', 'Profile Photo'];

const PLATFORM_FEE_PERCENT = 15;

export default function CaregiverStep4Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rateNumber = parseFloat(hourlyRate) || 0;
  const platformFee = rateNumber * (PLATFORM_FEE_PERCENT / 100);
  const netEarnings = rateNumber - platformFee;
  const hourlyRateCents = Math.round(rateNumber * 100);

  const handleRateChange = (text: string) => {
    // Allow only valid decimal input
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimals
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) return;
    setHourlyRate(cleaned);
    setError('');
  };

  const validate = (): boolean => {
    if (!hourlyRate.trim()) {
      setError('Please enter your hourly rate');
      return false;
    }
    if (rateNumber < 15) {
      setError('Minimum hourly rate is $15.00');
      return false;
    }
    if (rateNumber > 500) {
      setError('Maximum hourly rate is $500.00');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (!user) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('caregivers')
        .update({ hourly_rate_cents: hourlyRateCents })
        .eq('profile_id', user.id);

      if (updateError) throw updateError;

      router.push('/(auth)/onboarding/caregiver-step5');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save your rate. Please try again.');
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
        <Text style={[styles.title, { color: theme.text }]}>Set Your Rate</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose an hourly rate that reflects your experience and qualifications
        </Text>
      </View>

      <OnboardingStepper currentStep={4} totalSteps={5} stepLabels={STEP_LABELS} />

      <View style={styles.rateSection}>
        <Text style={[styles.rateLabel, { color: theme.text }]}>Hourly Rate</Text>

        <View
          style={[
            styles.rateInputContainer,
            {
              borderColor: error ? theme.error : theme.border,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <Text style={[styles.dollarSign, { color: theme.text }]}>$</Text>
          <TextInput
            style={[styles.rateInput, { color: theme.text }]}
            value={hourlyRate}
            onChangeText={handleRateChange}
            placeholder="0.00"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            maxLength={6}
          />
          <Text style={[styles.perHour, { color: theme.textSecondary }]}>/hr</Text>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        ) : null}

        <View style={styles.suggestedRates}>
          <Text style={[styles.suggestedLabel, { color: theme.textSecondary }]}>
            Suggested rates:
          </Text>
          <View style={styles.suggestedRow}>
            {[25, 35, 50, 75].map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.suggestedChip,
                  {
                    borderColor:
                      rateNumber === rate ? colors.primary[500] : theme.border,
                    backgroundColor:
                      rateNumber === rate ? colors.primary[50] : 'transparent',
                  },
                ]}
                onPress={() => {
                  setHourlyRate(rate.toString());
                  setError('');
                }}
              >
                <Text
                  style={[
                    styles.suggestedChipText,
                    {
                      color:
                        rateNumber === rate ? colors.primary[700] : theme.textSecondary,
                    },
                  ]}
                >
                  ${rate}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {rateNumber > 0 && (
        <View
          style={[
            styles.earningsCard,
            { backgroundColor: colors.primary[50], borderColor: colors.primary[200] },
          ]}
        >
          <View style={styles.earningsIcon}>
            <Ionicons name="cash-outline" size={28} color={colors.primary[500]} />
          </View>
          <Text style={[styles.earningsTitle, { color: colors.primary[800] }]}>
            Your Earnings Breakdown
          </Text>

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.primary[700] }]}>
              Your hourly rate
            </Text>
            <Text style={[styles.earningsValue, { color: colors.primary[700] }]}>
              ${rateNumber.toFixed(2)}
            </Text>
          </View>

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.primary[600] }]}>
              Platform fee ({PLATFORM_FEE_PERCENT}%)
            </Text>
            <Text style={[styles.earningsValue, { color: colors.primary[600] }]}>
              -${platformFee.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.earningsDivider, { borderColor: colors.primary[200] }]} />

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsNetLabel, { color: colors.primary[800] }]}>
              You'll earn per hour
            </Text>
            <Text style={[styles.earningsNetValue, { color: colors.primary[800] }]}>
              ${netEarnings.toFixed(2)}
            </Text>
          </View>

          <Text style={[styles.earningsNote, { color: colors.primary[600] }]}>
            You'll earn ${netEarnings.toFixed(2)} per hour after the {PLATFORM_FEE_PERCENT}% platform fee
          </Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <View style={[styles.infoRow, { borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            You can change your rate at any time from your profile settings. Rates are per hour and
            will be prorated for shorter sessions.
          </Text>
        </View>
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
  rateSection: {
    marginBottom: spacing.xl,
  },
  rateLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  dollarSign: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    marginRight: spacing.xs,
  },
  rateInput: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    flex: 1,
    padding: 0,
  },
  perHour: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    marginLeft: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  suggestedRates: {
    marginTop: spacing.lg,
  },
  suggestedLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  suggestedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  suggestedChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  suggestedChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
  earningsCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  earningsIcon: {
    marginBottom: spacing.md,
  },
  earningsTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    marginBottom: spacing.base,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.xs,
  },
  earningsLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  earningsValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  earningsDivider: {
    borderTopWidth: 1,
    width: '100%',
    marginVertical: spacing.sm,
  },
  earningsNetLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
  },
  earningsNetValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
  },
  earningsNote: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  infoCard: {
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    borderWidth: 1,
    borderRadius: borderRadius.base,
  },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
