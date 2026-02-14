import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button, Input } from '@/components/ui';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { registerSchema } from '@/utils/validation';
import { handleError } from '@/utils/error-handler';
import { UserRole } from '@/types';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp, isLoading } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('recipient');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const handleRegister = async () => {
    setErrors({});
    setGeneralError('');

    const result = registerSchema.safeParse({ firstName, lastName, email, password, role });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await signUp(email, password, firstName, lastName, role);
      // Navigate to onboarding after successful signup
      if (role === 'caregiver') {
        router.replace('/(auth)/onboarding/caregiver-step1');
      } else {
        router.replace('/(auth)/onboarding/recipient-step1');
      }
    } catch (error) {
      setGeneralError(handleError(error, 'Failed to create account'));
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
          { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing.base },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Join CareConnect today
          </Text>
        </View>

        {generalError ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.errorLight }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>
              {generalError}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: theme.text }]}>I am a...</Text>
        <View style={styles.roleSelector}>
          <RoleOption
            icon="medkit-outline"
            label="Caregiver"
            description="I provide care services"
            selected={role === 'caregiver'}
            onPress={() => setRole('caregiver')}
            theme={theme}
          />
          <RoleOption
            icon="person-outline"
            label="Care Recipient"
            description="I'm looking for care"
            selected={role === 'recipient'}
            onPress={() => setRole('recipient')}
            theme={theme}
          />
        </View>

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
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            style={{ marginTop: spacing.base }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.footerLink, { color: theme.primary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleOption({
  icon,
  label,
  description,
  selected,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.roleOption,
        {
          borderColor: selected ? colors.primary[500] : theme.border,
          backgroundColor: selected ? colors.primary[50] : theme.surface,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={28}
        color={selected ? colors.primary[500] : theme.textSecondary}
      />
      <Text
        style={[
          styles.roleLabel,
          { color: selected ? colors.primary[700] : theme.text },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.roleDescription,
          { color: selected ? colors.primary[600] : theme.textSecondary },
        ]}
      >
        {description}
      </Text>
    </TouchableOpacity>
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
  errorBanner: {
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.base,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  roleOption: {
    flex: 1,
    padding: spacing.base,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
  roleDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  footerLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
});
