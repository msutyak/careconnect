import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { Button, Input, Chip } from '@/components/ui';
import { OnboardingStepper } from '@/components/ui/OnboardingStepper';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { EXPERTISE_OPTIONS, EDUCATION_LEVELS } from '@/constants/expertise-options';
import { US_STATES } from '@/constants/us-states';
import { supabase } from '@/lib/supabase';
import { EducationLevel, ExpertiseType } from '@/types';

const STEP_LABELS = ['Personal Info', 'Professional', 'Availability', 'Set Your Rate', 'Profile Photo'];

export default function CaregiverStep2Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [expertise, setExpertise] = useState<ExpertiseType[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [showEducationPicker, setShowEducationPicker] = useState(false);
  const [showLicenseStatePicker, setShowLicenseStatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedEducationLabel =
    EDUCATION_LEVELS.find((e) => e.value === educationLevel)?.label ?? '';
  const selectedLicenseStateLabel =
    US_STATES.find((s) => s.value === licenseState)?.label ?? '';

  const toggleExpertise = (value: ExpertiseType) => {
    setExpertise((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!educationLevel) newErrors.educationLevel = 'Education level is required';
    if (expertise.length === 0) newErrors.expertise = 'Select at least one area of expertise';
    if (!yearsExperience.trim()) newErrors.yearsExperience = 'Years of experience is required';
    if (yearsExperience && isNaN(Number(yearsExperience)))
      newErrors.yearsExperience = 'Must be a valid number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (!user) return;

    setSaving(true);
    try {
      // Check if caregiver record already exists
      const { data: existing } = await supabase
        .from('caregivers')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      const caregiverData = {
        education_level: educationLevel,
        expertise,
        license_number: licenseNumber.trim() || null,
        license_state: licenseState || null,
        years_experience: Number(yearsExperience),
        bio: bio.trim() || null,
      };

      if (existing) {
        const { error } = await supabase
          .from('caregivers')
          .update(caregiverData)
          .eq('profile_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('caregivers').insert({
          profile_id: user.id,
          ...caregiverData,
          hourly_rate_cents: 0,
        });
        if (error) throw error;
      }

      router.push('/(auth)/onboarding/caregiver-step3');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save professional details. Please try again.');
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
          <Text style={[styles.title, { color: theme.text }]}>Professional Details</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Share your qualifications and areas of expertise
          </Text>
        </View>

        <OnboardingStepper currentStep={2} totalSteps={5} stepLabels={STEP_LABELS} />

        <View style={styles.form}>
          {/* Education Level Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Education / Certification</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: errors.educationLevel ? theme.error : theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              onPress={() => {
                setShowEducationPicker(!showEducationPicker);
                setShowLicenseStatePicker(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  { color: selectedEducationLabel ? theme.text : theme.textTertiary },
                ]}
              >
                {selectedEducationLabel || 'Select your certification'}
              </Text>
              <Ionicons
                name={showEducationPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
            {errors.educationLevel && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                {errors.educationLevel}
              </Text>
            )}
          </View>

          {showEducationPicker && (
            <View
              style={[
                styles.dropdownList,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ScrollView
                style={styles.dropdownScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {EDUCATION_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.dropdownOption,
                      educationLevel === level.value && { backgroundColor: colors.primary[50] },
                    ]}
                    onPress={() => {
                      setEducationLevel(level.value as EducationLevel);
                      setShowEducationPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        {
                          color: educationLevel === level.value ? colors.primary[700] : theme.text,
                          fontFamily:
                            educationLevel === level.value
                              ? fontFamily.semibold
                              : fontFamily.regular,
                        },
                      ]}
                    >
                      {level.label}
                    </Text>
                    {educationLevel === level.value && (
                      <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Expertise Multi-Select */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Areas of Expertise</Text>
            <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
              Select all that apply
            </Text>
            <View style={styles.chipGrid}>
              {EXPERTISE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={expertise.includes(option.value as ExpertiseType)}
                  onPress={() => toggleExpertise(option.value as ExpertiseType)}
                />
              ))}
            </View>
            {errors.expertise && (
              <Text style={[styles.errorText, { color: theme.error }]}>{errors.expertise}</Text>
            )}
          </View>

          {/* License Info */}
          <Input
            label="License Number (Optional)"
            placeholder="e.g., RN-123456"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            leftIcon="document-text-outline"
          />

          {/* License State Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>License State (Optional)</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              onPress={() => {
                setShowLicenseStatePicker(!showLicenseStatePicker);
                setShowEducationPicker(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  { color: selectedLicenseStateLabel ? theme.text : theme.textTertiary },
                ]}
              >
                {selectedLicenseStateLabel || 'Select state'}
              </Text>
              <Ionicons
                name={showLicenseStatePicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {showLicenseStatePicker && (
            <View
              style={[
                styles.dropdownList,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ScrollView
                style={styles.dropdownScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {US_STATES.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.dropdownOption,
                      licenseState === s.value && { backgroundColor: colors.primary[50] },
                    ]}
                    onPress={() => {
                      setLicenseState(s.value);
                      setShowLicenseStatePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        {
                          color: licenseState === s.value ? colors.primary[700] : theme.text,
                          fontFamily:
                            licenseState === s.value ? fontFamily.semibold : fontFamily.regular,
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                    {licenseState === s.value && (
                      <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Input
            label="Years of Experience"
            placeholder="e.g., 5"
            value={yearsExperience}
            onChangeText={setYearsExperience}
            keyboardType="number-pad"
            leftIcon="time-outline"
            error={errors.yearsExperience}
          />

          {/* Bio */}
          <View style={styles.bioContainer}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Bio</Text>
            <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
              Tell care recipients about yourself, your experience, and what makes you a great caregiver
            </Text>
            <TextInput
              style={[
                styles.bioInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              placeholder="I am a dedicated caregiver with a passion for..."
              placeholderTextColor={theme.textTertiary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
              {bio.length}/500
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
  pickerContainer: {
    marginBottom: spacing.base,
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
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
    flex: 1,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: borderRadius.base,
    marginBottom: spacing.base,
    marginTop: -spacing.sm,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  dropdownOptionText: {
    fontSize: fontSize.base,
    flex: 1,
  },
  sectionContainer: {
    marginBottom: spacing.base,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bioContainer: {
    marginBottom: spacing.base,
  },
  bioInput: {
    borderWidth: 1.5,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    minHeight: 120,
  },
  charCount: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
