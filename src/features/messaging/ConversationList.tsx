import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Avatar, EmptyState } from '@/components/ui';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { formatMessageTime } from '@/utils';
import { Conversation } from '@/types';

export function ConversationList() {
  const { theme } = useTheme();
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1_id.eq.${user!.id},participant_2_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;

      // Fetch other participant profiles
      const enriched = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherId =
            conv.participant_1_id === user!.id
              ? conv.participant_2_id
              : conv.participant_1_id;
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherId)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user!.id);

          return {
            ...conv,
            other_participant: otherProfile,
            unread_count: count || 0,
          } as Conversation;
        })
      );

      return enriched;
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const basePath = '/(shared)';

  const renderConversation = ({ item }: { item: Conversation }) => {
    const other = item.other_participant;
    const name = other
      ? `${other.first_name} ${other.last_name}`
      : 'Unknown';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`${basePath}/chat?conversationId=${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Avatar uri={other?.avatar_url} name={name} size={48} />
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.conversationName,
                { color: theme.text },
                item.unread_count && item.unread_count > 0 ? { fontFamily: fontFamily.bold } : {},
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {item.last_message_at && (
              <Text style={[styles.conversationTime, { color: theme.textTertiary }]}>
                {formatMessageTime(item.last_message_at)}
              </Text>
            )}
          </View>
          <View style={styles.conversationPreview}>
            <Text
              style={[
                styles.conversationMessage,
                { color: item.unread_count && item.unread_count > 0 ? theme.text : theme.textSecondary },
                item.unread_count && item.unread_count > 0 ? { fontFamily: fontFamily.medium } : {},
              ]}
              numberOfLines={1}
            >
              {item.last_message || 'No messages yet'}
            </Text>
            {item.unread_count && item.unread_count > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 9 ? '9+' : item.unread_count}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={conversations || []}
      keyExtractor={(item) => item.id}
      renderItem={renderConversation}
      contentContainerStyle={styles.listContent}
      refreshing={isLoading}
      onRefresh={refetch}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          title="No conversations"
          message="Start a conversation by messaging a caregiver"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: spacing['2xl'] },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  conversationInfo: { flex: 1, marginLeft: spacing.md },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conversationName: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, flex: 1 },
  conversationTime: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, marginLeft: spacing.sm },
  conversationPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  conversationMessage: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, flex: 1 },
  unreadBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  unreadCount: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.white },
});
