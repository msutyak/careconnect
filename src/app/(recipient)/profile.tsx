import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Avatar, Badge, Divider, Button } from '@/components/ui';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { CARE_NEEDS_OPTIONS } from '@/constants/expertise-options';

export default function RecipientProfile() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuthStore();

  const { data: recipient } = useQuery({
    queryKey: ['care-recipient', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_recipients')
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] }}
    >
      <View style={styles.profileHeader}>
        <Avatar
          uri={profile?.avatar_url}
          name={`${profile?.first_name} ${profile?.last_name}`}
          size={80}
        />
        <Text style={[styles.name, { color: theme.text }]}>
          {profile?.first_name} {profile?.last_name}
        </Text>
        <Badge
          text={recipient?.care_for === 'loved_one' ? 'Caring for a Loved One' : 'Self Care'}
          variant="secondary"
        />
      </View>

      <Divider />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Info</Text>
        <InfoRow icon="mail-outline" label="Email" value={profile?.email || ''} theme={theme} />
        <InfoRow icon="call-outline" label="Phone" value={profile?.phone || 'Not set'} theme={theme} />
        <InfoRow icon="location-outline" label="Location" value={`${profile?.city || ''}, ${profile?.state || ''}`} theme={theme} />
      </View>

      {recipient?.care_for === 'loved_one' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Loved One</Text>
          <InfoRow icon="person-outline" label="Name" value={`${recipient.loved_one_first_name || ''} ${recipient.loved_one_last_name || ''}`} theme={theme} />
          {recipient.loved_one_age && (
            <InfoRow icon="calendar-outline" label="Age" value={`${recipient.loved_one_age}`} theme={theme} />
          )}
          {recipient.loved_one_relationship && (
            <InfoRow icon="heart-outline" label="Relationship" value={recipient.loved_one_relationship} theme={theme} />
          )}
        </View>
      )}

      {recipient?.care_needs && recipient.care_needs.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Care Needs</Text>
          <View style={styles.chipRow}>
            {recipient.care_needs.map((need: string) => {
              const label = CARE_NEEDS_OPTIONS.find(o => o.value === need)?.label || need;
              return <Badge key={need} text={label} variant="primary" style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />;
            })}
          </View>
        </View>
      )}

      <Divider />

      <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} theme={theme} />
      <MenuItem icon="card-outline" label="Payment Methods" onPress={() => {}} theme={theme} />
      <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} theme={theme} />
      <MenuItem icon="shield-outline" label="Privacy & Terms" onPress={() => {}} theme={theme} />

      <View style={styles.signOut}>
        <Button title="Sign Out" onPress={handleSignOut} variant="outline" />
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
  profileHeader: { alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'] },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  infoLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, width: 100 },
  infoValue: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.base, gap: spacing.md },
  menuLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.base, flex: 1 },
  signOut: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
});
