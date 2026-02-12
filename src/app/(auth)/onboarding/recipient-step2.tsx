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

const STEP_LABELS = ['Who needs care?', 'Details', 'Care Preferences'];

export default function RecipientStep2Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [lovedOneFirstName, setLovedOneFirstName] = useState('');
  const [lovedOneLastName, setLovedOneLastName] = useState('');
  const [lovedOneAge, setLovedOneAge] = useState('');
  const [lovedOneRelationship, setLovedOneRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedStateLabel = US_STATES.find((s) => s.value === state)?.label || '';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!lovedOneFirstName.trim()) {
      newErrors.lovedOneFirstName = 'First name is required';
    }
    if (!lovedOneLastName.trim()) {
      newErrors.lovedOneLastName = 'Last name is required';
    }
    if (!lovedOneAge.trim()) {
      newErrors.lovedOneAge = 'Age is required';
    } else if (isNaN(Number(lovedOneAge)) || Number(lovedOneAge) < 0 || Number(lovedOneAge) > 150) {
      newErrors.lovedOneAge = 'Please enter a valid age';
    }
    if (!lovedOneRelationship.trim()) {
      newErrors.lovedOneRelationship = 'Relationship is required';
    }
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!state) {
      newErrors.state = 'State is required';
    }
    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate() || !user) return;

    setIsLoading(true);
    try {
      const { error: recipientError } = await supabase
        .from('care_recipients')
        .update({
          loved_one_first_name: lovedOneFirstName.trim(),
          loved_one_last_name: lovedOneLastName.trim(),
          loved_one_age: Number(lovedOneAge),
          loved_one_relationship: lovedOneRelationship.trim(),
        })
        .eq('profile_id', user.id);

      if (recipientError) throw recipientError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim(),
          state,
          city: city.trim(),
          address: address.trim() || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      router.push('/(auth)/onboarding/recipient-step3');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save details. Please try again.');
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
            Loved one details
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Tell us about the person who needs care
          </Text>
        </View>

        <OnboardingStepper
          currentStep={2}
          totalSteps={3}
          stepLabels={STEP_LABELS}
        />

        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          About your loved one
        </Text>

        <View style={styles.row}>
          <Input
            label="First Name"
            placeholder="First name"
            value={lovedOneFirstName}
            onChangeText={setLovedOneFirstName}
            autoComplete="given-name"
            error={errors.lovedOneFirstName}
            containerStyle={{ flex: 1 }}
          />
          <Input
            label="Last Name"
            placeholder="Last name"
            value={lovedOneLastName}
            onChangeText={setLovedOneLastName}
            autoComplete="family-name"
            error={errors.lovedOneLastName}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <View style={styles.row}>
          <Input
            label="Age"
            placeholder="Age"
            value={lovedOneAge}
            onChangeText={setLovedOneAge}
            keyboardType="numeric"
            error={errors.lovedOneAge}
            containerStyle={{ flex: 1 }}
          />
          <Input
            label="Relationship"
            placeholder="e.g. Parent, Spouse"
            value={lovedOneRelationship}
            onChangeText={setLovedOneRelationship}
            error={errors.lovedOneRelationship}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: theme.text, marginTop: spacing.lg }]}>
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
          <Text style={[styles.pickerLabel, { color: theme.text }]}>State</Text>
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

        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          style={{ marginTop: spacing.base }}
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
  },
});
