import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { createStripeConnectOnboardingLink } from '@/lib/stripe';
import { Card, Button, Badge, EmptyState } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatCurrency, formatDate } from '@/utils';

export default function WalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const { data: caregiver, refetch: refetchCaregiver } = useQuery({
    queryKey: ['caregiver', profile?.id],
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

  const { data: transactions } = useQuery({
    queryKey: ['wallet-transactions', caregiver?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            date,
            recipient:care_recipients(
              profile:profiles(first_name, last_name)
            )
          )
        `)
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!caregiver?.id,
  });

  const connectStripe = useMutation({
    mutationFn: async () => {
      const url = await createStripeConnectOnboardingLink();
      await WebBrowser.openBrowserAsync(url);
      refetchCaregiver();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const totalEarnings = transactions?.reduce(
    (sum, t) => sum + (t.caregiver_amount_cents || 0), 0
  ) || 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing['2xl'] }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Balance Card */}
      <Card
        variant="elevated"
        style={[styles.balanceCard, { backgroundColor: colors.primary[500] }]}
      >
        <Text style={styles.balanceLabel}>Total Earnings</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(totalEarnings)}</Text>
        <View style={styles.balanceRow}>
          <Badge
            text={caregiver?.stripe_onboarding_complete ? 'Bank Connected' : 'Setup Required'}
            variant={caregiver?.stripe_onboarding_complete ? 'success' : 'warning'}
          />
        </View>
      </Card>

      {/* Stripe Setup */}
      {!caregiver?.stripe_onboarding_complete && (
        <Card variant="outlined" style={styles.setupCard}>
          <Ionicons name="card-outline" size={32} color={theme.primary} />
          <Text style={[styles.setupTitle, { color: theme.text }]}>
            Set Up Your Bank Account
          </Text>
          <Text style={[styles.setupMessage, { color: theme.textSecondary }]}>
            Connect your bank account via Stripe to receive payments from bookings.
          </Text>
          <Button
            title="Connect Bank Account"
            onPress={() => connectStripe.mutate()}
            loading={connectStripe.isPending}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Transaction History</Text>
        {transactions && transactions.length > 0 ? (
          transactions.map((tx: any) => {
            const recipientName = tx.booking?.recipient?.profile
              ? `${tx.booking.recipient.profile.first_name} ${tx.booking.recipient.profile.last_name}`
              : 'Unknown';
            return (
              <View key={tx.id} style={[styles.txRow, { borderBottomColor: theme.borderLight }]}>
                <View style={[styles.txIcon, { backgroundColor: colors.secondary[50] }]}>
                  <Ionicons name="arrow-down" size={16} color={colors.secondary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txName, { color: theme.text }]}>{recipientName}</Text>
                  <Text style={[styles.txDate, { color: theme.textSecondary }]}>
                    {tx.booking?.date ? formatDate(tx.booking.date) : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: colors.secondary[600] }]}>
                  +{formatCurrency(tx.caregiver_amount_cents)}
                </Text>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="No transactions yet"
            message="Your payment history will appear here"
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
  balanceCard: { marginHorizontal: spacing.xl, marginBottom: spacing.xl, padding: spacing.xl },
  balanceLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontFamily: fontFamily.bold, fontSize: 36, color: colors.white, marginVertical: spacing.xs },
  balanceRow: { flexDirection: 'row' },
  setupCard: { marginHorizontal: spacing.xl, marginBottom: spacing.xl, alignItems: 'center', gap: spacing.sm },
  setupTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, textAlign: 'center' },
  setupMessage: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, textAlign: 'center' },
  section: { paddingHorizontal: spacing.xl },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, marginBottom: spacing.md },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txName: { fontFamily: fontFamily.medium, fontSize: fontSize.base },
  txDate: { fontFamily: fontFamily.regular, fontSize: fontSize.xs },
  txAmount: { fontFamily: fontFamily.bold, fontSize: fontSize.base },
});
