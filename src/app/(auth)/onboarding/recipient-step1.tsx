import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { spacing, borderRadius, shadow } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { CareRelationship } from '@/types';

const STEP_LABELS = ['Who needs care?', 'Details', 'Care Preferences'];

export default function RecipientStep1Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [careFor, setCareFor] = useState<CareRelationship | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!careFor || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('care_recipients').upsert(
        {
          profile_id: user.id,
          care_for: careFor,
        },
        { onConflict: 'profile_id' }
      );

      if (error) throw error;

      if (careFor === 'self') {
        router.push('/(auth)/onboarding/recipient-step3');
      } else {
        router.push('/(auth)/onboarding/recipient-step2');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save selection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + spacing.base,
          paddingBottom: insets.bottom + spacing.base,
        },
      ]}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Who needs care?
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Tell us who will be receiving care services
          </Text>
        </View>

        <OnboardingStepper
          currentStep={1}
          totalSteps={3}
          stepLabels={STEP_LABELS}
        />

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[
              styles.card,
              {
                borderColor:
                  careFor === 'self' ? colors.primary[500] : theme.border,
                backgroundColor:
                  careFor === 'self' ? colors.primary[50] : theme.card,
              },
              shadow.md,
            ]}
            onPress={() => setCareFor('self')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    careFor === 'self'
                      ? colors.primary[100]
                      : theme.surface,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={32}
                color={
                  careFor === 'self'
                    ? colors.primary[500]
                    : theme.textSecondary
                }
              />
            </View>
            <Text
              style={[
                styles.cardTitle,
                {
                  color:
                    careFor === 'self' ? colors.primary[700] : theme.text,
                },
              ]}
            >
              Myself
            </Text>
            <Text
              style={[
                styles.cardDescription,
                {
                  color:
                    careFor === 'self'
                      ? colors.primary[600]
                      : theme.textSecondary,
                },
              ]}
            >
              I am looking for care services for myself
            </Text>
            {careFor === 'self' && (
              <View style={styles.checkBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary[500]}
                />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              {
                borderColor:
                  careFor === 'loved_one'
                    ? colors.primary[500]
                    : theme.border,
                backgroundColor:
                  careFor === 'loved_one' ? colors.primary[50] : theme.card,
              },
              shadow.md,
            ]}
            onPress={() => setCareFor('loved_one')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    careFor === 'loved_one'
                      ? colors.primary[100]
                      : theme.surface,
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={32}
                color={
                  careFor === 'loved_one'
                    ? colors.primary[500]
                    : theme.textSecondary
                }
              />
            </View>
            <Text
              style={[
                styles.cardTitle,
                {
                  color:
                    careFor === 'loved_one'
                      ? colors.primary[700]
                      : theme.text,
                },
              ]}
            >
              A Loved One
            </Text>
            <Text
              style={[
                styles.cardDescription,
                {
                  color:
                    careFor === 'loved_one'
                      ? colors.primary[600]
                      : theme.textSecondary,
                },
              ]}
            >
              I am arranging care for a family member or someone I care about
            </Text>
            {careFor === 'loved_one' && (
              <View style={styles.checkBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary[500]}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          disabled={!careFor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  cardsContainer: {
    gap: spacing.base,
  },
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
  },
});
