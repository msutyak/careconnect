import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { ConversationList } from '@/features/messaging/ConversationList';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

export default function RecipientMessagesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + spacing.base }]}>
      <Text style={[styles.title, { color: theme.text }]}>Messages</Text>
      <ConversationList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'], paddingHorizontal: spacing.xl, marginBottom: spacing.md },
});
