import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top + spacing['2xl'] },
      ]}
    >
      <View style={styles.heroSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="heart-circle" size={80} color={colors.primary[500]} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>CareConnect</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Connecting caregivers with those who need them most
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureItem
          icon="search"
          title="Find Care"
          description="Search and book qualified caregivers near you"
          theme={theme}
        />
        <FeatureItem
          icon="calendar"
          title="Flexible Scheduling"
          description="Book care when you need it, on your schedule"
          theme={theme}
        />
        <FeatureItem
          icon="shield-checkmark"
          title="Verified Professionals"
          description="All caregivers are licensed and background-checked"
          theme={theme}
        />
      </View>

      <View style={[styles.buttons, { paddingBottom: insets.bottom + spacing.base }]}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(auth)/register')}
        />
        <Button
          title="I already have an account"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
        />
      </View>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  theme: any;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={24} color={colors.primary[500]} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  iconContainer: {
    marginBottom: spacing.base,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    textAlign: 'center',
    maxWidth: 280,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    marginBottom: 2,
  },
  featureDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  buttons: {
    gap: spacing.sm,
  },
});
