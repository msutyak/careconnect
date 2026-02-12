import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { Message, Profile } from '@/types';
import { format, parseISO } from 'date-fns';

interface ChatScreenProps {
  conversationId: string;
}

export function ChatScreen({ conversationId }: ChatScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const otherId = conversation
    ? conversation.participant_1_id === user?.id
      ? conversation.participant_2_id
      : conversation.participant_1_id
    : null;

  const { data: otherProfile } = useQuery({
    queryKey: ['profile', otherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!otherId,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  // Mark messages as read
  useEffect(() => {
    if (!messages || !user?.id) return;
    const unread = messages.filter(
      (m) => m.sender_id !== user.id && !m.is_read
    );
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in(
          'id',
          unread.map((m) => m.id)
        )
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
    }
  }, [messages, user?.id]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setMessageText('');
    },
  });

  const handleSend = () => {
    const text = messageText.trim();
    if (!text) return;
    sendMessage.mutate(text);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isMe && <Avatar uri={otherProfile?.avatar_url} name={`${otherProfile?.first_name} ${otherProfile?.last_name}`} size={28} />}
        <View
          style={[
            styles.messageBubble,
            isMe
              ? { backgroundColor: colors.primary[500] }
              : { backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? colors.white : theme.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textTertiary }]}>
            {format(parseISO(item.created_at), 'h:mm a')}
          </Text>
        </View>
      </View>
    );
  };

  const otherName = otherProfile
    ? `${otherProfile.first_name} ${otherProfile.last_name}`
    : 'Chat';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderLight, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Avatar uri={otherProfile?.avatar_url} name={otherName} size={36} />
        <Text style={[styles.headerName, { color: theme.text }]}>{otherName}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages || []}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: theme.borderLight, paddingBottom: insets.bottom || spacing.sm }]}>
        <TextInput
          style={[styles.textInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textTertiary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: messageText.trim() ? colors.primary[500] : theme.border }]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerName: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, flex: 1 },
  messagesList: { padding: spacing.xl, gap: spacing.sm },
  messageRow: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.xs },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  messageText: { fontFamily: fontFamily.regular, fontSize: fontSize.base },
  messageTime: { fontFamily: fontFamily.regular, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
