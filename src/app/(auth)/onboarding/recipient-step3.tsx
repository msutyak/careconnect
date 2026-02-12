import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button, Input } from '@/components/ui';
import { Chip } from '@/components/ui/Chip';
import { OnboardingStepper } from '@/components/ui/OnboardingStepper';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { CARE_NEEDS_OPTIONS } from '@/constants/expertise-options';
import { US_STATES } from '@/constants/us-states';
import { supabase } from '@/lib/supabase';

const STEP_LABELS = ['Who needs care?', 'Details', 'Care Preferences'];

export default function RecipientStep3Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuthStore();

  const [careNeeds, setCareNeeds] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [careFor, setCareFor] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedStateLabel = US_STATES.find((s) => s.value === state)?.label || '';

  useEffect(() => {
    loadCareFor();
  }, []);

  const loadCareFor = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('care_recipients')
      .select('care_for')
      .eq('profile_id', user.id)
      .single();

    if (data) {
      setCareFor(data.care_for);
    }
  };

  const toggleCareNeed = (value: string) => {
    setCareNeeds((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (careNeeds.length === 0) {
      newErrors.careNeeds = 'Please select at least one care need';
    }

    if (careFor === 'self') {
      if (!phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
      if (!state) {
        newErrors.state = 'State is required';
      }
      if (!city.trim()) {
        newErrors.city = 'City is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCompleteSetup = async () => {
    if (!validate() || !user) return;

    setIsLoading(true);
    try {
      const { error: recipientError } = await supabase
        .from('care_recipients')
        .update({
          care_needs: careNeeds,
          additional_notes: additionalNotes.trim() || null,
        })
        .eq('profile_id', user.id);

      if (recipientError) throw recipientError;

      if (careFor === 'self') {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            phone: phone.trim(),
            state,
            city: city.trim(),
            address: address.trim() || null,
          })
          .eq('id', user.id);

        if (profileUpdateError) throw profileUpdateError;
      }

      const { error: onboardingError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (onboardingError) throw onboardingError;

      await refreshProfile();

      router.replace('/(recipient)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
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
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.base,
            paddingBottom: insets.bottom + spacing.base,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Care preferences
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Select the types of care you are looking for
          </Text>
        </View>

        <OnboardingStepper
          currentStep={3}
          totalSteps={3}
          stepLabels={STEP_LABELS}
        />

        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          What care do you need?
        </Text>
        {errors.careNeeds && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {errors.careNeeds}
          </Text>
        )}

        <View style={styles.chipsContainer}>
          {CARE_NEEDS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={careNeeds.includes(option.value)}
              onPress={() => toggleCareNeed(option.value)}
            />
          ))}
        </View>

        <Text
          style={[
            styles.sectionLabel,
            { color: theme.text, marginTop: spacing.xl },
          ]}
        >
          Additional notes
        </Text>
        <View
          style={[
            styles.textAreaContainer,
            {
              borderColor: theme.border,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textArea,
              { color: theme.text },
            ]}
            placeholder="Any specific requirements, medical conditions, or preferences..."
            placeholderTextColor={theme.textTertiary}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {careFor === 'self' && (
          <>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.text, marginTop: spacing.xl },
              ]}
            >
              Your contact information
            </Text>

            <Input
              label="Phone Number"
              placeholder="(555) 123-4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
              error={errors.phone}
            />

            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: theme.text }]}>
                State
              </Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  {
                    borderColor: errors.state
                      ? theme.error
                      : showStatePicker
                      ? theme.primary
                      : theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
                onPress={() => setShowStatePicker(!showStatePicker)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.pickerIcon}
                />
                <Text
                  style={[
                    styles.pickerButtonText,
                    {
                      color: selectedStateLabel
                        ? theme.text
                        : theme.textTertiary,
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
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.state}
                </Text>
              )}
              {showStatePicker && (
                <View
                  style={[
                    styles.stateList,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ScrollView
                    style={styles.stateScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    {US_STATES.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.stateItem,
                          state === item.value && {
                            backgroundColor: colors.primary[50],
                          },
                        ]}
                        onPress={() => {
                          setState(item.value);
                          setShowStatePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.stateItemText,
                            {
                              color:
                                state === item.value
                                  ? colors.primary[700]
                                  : theme.text,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {state === item.value && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={colors.primary[500]}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Input
              label="City"
              placeholder="City"
              value={city}
              onChangeText={setCity}
              error={errors.city}
            />

            <Input
              label="Address (Optional)"
              placeholder="Street address"
              value={address}
              onChangeText={setAddress}
              leftIcon="home-outline"
            />
          </>
        )}

        <Button
          title="Complete Setup"
          onPress={handleCompleteSetup}
          loading={isLoading}
          style={{ marginTop: spacing.lg, marginBottom: spacing.base }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textAreaContainer: {
    borderWidth: 1.5,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  textArea: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    minHeight: 100,
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
    borderWidth: 1.5,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pickerIcon: {
    marginRight: spacing.sm,
  },
  pickerButtonText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  stateList: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.base,
    maxHeight: 200,
    overflow: 'hidden',
  },
  stateScroll: {
    maxHeight: 200,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  stateItemText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
