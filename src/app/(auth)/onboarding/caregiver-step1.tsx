import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button, Input } from '@/components/ui';
import { OnboardingStepper } from '@/components/ui/OnboardingStepper';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { US_STATES } from '@/constants/us-states';
import { supabase } from '@/lib/supabase';

const STEP_LABELS = ['Personal Info', 'Professional', 'Availability', 'Set Your Rate', 'Profile Photo'];

export default function CaregiverStep1Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [state, setState] = useState(profile?.state ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedStateLabel = US_STATES.find((s) => s.value === state)?.label ?? '';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!state) newErrors.state = 'State is required';
    if (!city.trim()) newErrors.city = 'City is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          state,
          city: city.trim(),
          address: address.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      router.push('/(auth)/onboarding/caregiver-step2');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save your information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Personal Information</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Tell us about yourself so care recipients can find you
          </Text>
        </View>

        <OnboardingStepper currentStep={1} totalSteps={5} stepLabels={STEP_LABELS} />

        <View style={styles.form}>
          <View style={styles.row}>
            <Input
              label="First Name"
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
              error={errors.firstName}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
              error={errors.lastName}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <Input
            label="Phone Number"
            placeholder="(555) 123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            leftIcon="call-outline"
            error={errors.phone}
          />

          <View style={styles.pickerContainer}>
            <Text style={[styles.pickerLabel, { color: theme.text }]}>State</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: errors.state ? theme.error : theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              onPress={() => setShowStatePicker(!showStatePicker)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  {
                    color: selectedStateLabel ? theme.text : theme.textTertiary,
                  },
                ]}
              >
                {selectedStateLabel || 'Select a state'}
              </Text>
              <Ionicons
                name={showStatePicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
            {errors.state && (
              <Text style={[styles.errorText, { color: theme.error }]}>{errors.state}</Text>
            )}
          </View>

          {showStatePicker && (
            <View
              style={[
                styles.stateList,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ScrollView
                style={styles.stateListScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {US_STATES.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.stateOption,
                      state === s.value && { backgroundColor: colors.primary[50] },
                    ]}
                    onPress={() => {
                      setState(s.value);
                      setShowStatePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.stateOptionText,
                        {
                          color: state === s.value ? colors.primary[700] : theme.text,
                          fontFamily: state === s.value ? fontFamily.semibold : fontFamily.regular,
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                    {state === s.value && (
                      <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Input
            label="City"
            placeholder="San Francisco"
            value={city}
            onChangeText={setCity}
            autoComplete="postal-address-locality"
            leftIcon="location-outline"
            error={errors.city}
          />

          <Input
            label="Address (Optional)"
            placeholder="123 Main St, Apt 4B"
            value={address}
            onChangeText={setAddress}
            autoComplete="street-address"
            leftIcon="home-outline"
          />
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
    </KeyboardAvoidingView>
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
  form: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pickerContainer: {
    marginBottom: spacing.base,
  },
  pickerLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pickerButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  stateList: {
    borderWidth: 1,
    borderRadius: borderRadius.base,
    marginBottom: spacing.base,
    marginTop: -spacing.sm,
  },
  stateListScroll: {
    maxHeight: 200,
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  stateOptionText: {
    fontSize: fontSize.base,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
