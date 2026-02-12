import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Avatar, Card, Badge, StarRating, Divider, Button } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { EXPERTISE_OPTIONS, EDUCATION_LEVELS } from '@/constants/expertise-options';
import { formatHourlyRate } from '@/utils';

export default function CaregiverProfile() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuthStore();

  const { data: caregiver } = useQuery({
    queryKey: ['caregiver-profile', profile?.id],
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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const educationLabel = EDUCATION_LEVELS.find(e => e.value === caregiver?.education_level)?.label;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] }}
    >
      {/* Header */}
      <View style={styles.profileHeader}>
        <Avatar
          uri={profile?.avatar_url}
          name={`${profile?.first_name} ${profile?.last_name}`}
          size={80}
        />
        <Text style={[styles.name, { color: theme.text }]}>
          {profile?.first_name} {profile?.last_name}
        </Text>
        {educationLabel && (
          <Badge text={educationLabel} variant="primary" />
        )}
        {caregiver && (
          <View style={styles.ratingRow}>
            <StarRating rating={Number(caregiver.average_rating || 0)} size={18} />
            <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
              ({caregiver.total_reviews} reviews)
            </Text>
          </View>
        )}
      </View>

      <Divider />

      {/* Info Sections */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <Text style={[styles.bio, { color: theme.textSecondary }]}>
          {caregiver?.bio || 'No bio added yet.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Details</Text>
        <InfoRow icon="cash-outline" label="Hourly Rate" value={formatHourlyRate(caregiver?.hourly_rate_cents || 0)} theme={theme} />
        <InfoRow icon="briefcase-outline" label="Experience" value={caregiver?.years_experience ? `${caregiver.years_experience} years` : 'Not specified'} theme={theme} />
        <InfoRow icon="location-outline" label="Location" value={`${profile?.city || ''}, ${profile?.state || ''}`} theme={theme} />
        <InfoRow icon="mail-outline" label="Email" value={profile?.email || ''} theme={theme} />
        <InfoRow icon="call-outline" label="Phone" value={profile?.phone || 'Not set'} theme={theme} />
      </View>

      {caregiver?.expertise && caregiver.expertise.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Expertise</Text>
          <View style={styles.chipRow}>
            {caregiver.expertise.map((e: string) => {
              const label = EXPERTISE_OPTIONS.find(o => o.value === e)?.label || e;
              return <Badge key={e} text={label} variant="secondary" style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />;
            })}
          </View>
        </View>
      )}

      <Divider />

      {/* Menu Items */}
      <MenuItem icon="wallet-outline" label="Wallet & Payments" onPress={() => router.push('/(shared)/wallet' as any)} theme={theme} />
      <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} theme={theme} />
      <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} theme={theme} />
      <MenuItem icon="shield-outline" label="Privacy & Terms" onPress={() => {}} theme={theme} />

      <View style={styles.signOut}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
        />
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, theme }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, theme }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={theme.text} />
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, marginBottom: spacing.sm },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.base, lineHeight: 22 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, width: 100 },
  infoValue: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    gap: spacing.md,
  },
  menuLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.base, flex: 1 },
  signOut: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
});
