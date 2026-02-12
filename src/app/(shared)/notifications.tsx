import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatRelativeTime } from '@/utils';
import { Notification, NotificationType } from '@/types';

const notificationIcons: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  booking_request: { icon: 'calendar-outline', color: colors.primary[500] },
  booking_confirmed: { icon: 'checkmark-circle-outline', color: colors.secondary[500] },
  booking_cancelled: { icon: 'close-circle-outline', color: colors.red[500] },
  booking_completed: { icon: 'flag-outline', color: colors.secondary[500] },
  new_message: { icon: 'chatbubble-outline', color: colors.primary[500] },
  new_review: { icon: 'star-outline', color: colors.yellow[500] },
  payment_received: { icon: 'cash-outline', color: colors.secondary[500] },
  payment_sent: { icon: 'card-outline', color: colors.primary[500] },
  reminder: { icon: 'alarm-outline', color: colors.yellow[500] },
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconConfig = notificationIcons[item.type] || { icon: 'notifications-outline', color: theme.textSecondary };

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && { backgroundColor: theme.primaryLight },
        ]}
        onPress={() => {
          if (!item.is_read) markAsRead.mutate(item.id);
          if (item.data?.screen) router.push(item.data.screen as any);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}15` }]}>
          <Ionicons name={iconConfig.icon} size={22} color={iconConfig.color} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: theme.text }, !item.is_read && { fontFamily: fontFamily.semibold }]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationBody, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead.mutate()}>
            <Text style={[styles.markAllRead, { color: theme.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            message="You're all caught up!"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
  markAllRead: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
  listContent: { paddingBottom: spacing['2xl'] },
  notificationItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notificationContent: { flex: 1 },
  notificationTitle: { fontFamily: fontFamily.medium, fontSize: fontSize.base },
  notificationBody: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, marginTop: 2 },
  notificationTime: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[500] },
});
