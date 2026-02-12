import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button } from '@/components/ui';
import { OnboardingStepper } from '@/components/ui/OnboardingStepper';
import { spacing, borderRadius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const STEP_LABELS = ['Personal Info', 'Professional', 'Availability', 'Set Your Rate', 'Profile Photo'];

export default function CaregiverStep5Screen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuthStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to upload a profile photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!imageUri || !user) return null;

    setUploading(true);
    try {
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Read the image and convert to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload photo. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      let avatarUrl: string | null = null;

      // Upload avatar if an image was selected
      if (imageUri) {
        avatarUrl = await uploadAvatar();
      }

      // Update profile with avatar URL and mark onboarding as complete
      const updateData: Record<string, any> = {
        onboarding_completed: true,
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Refresh the profile in the auth store
      await refreshProfile();

      // Navigate to the caregiver dashboard
      router.replace('/(caregiver)/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isProcessing = uploading || saving;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Profile Photo</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Add a photo so care recipients can recognize you. A friendly, professional photo helps
          build trust.
        </Text>
      </View>

      <OnboardingStepper currentStep={5} totalSteps={5} stepLabels={STEP_LABELS} />

      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={[
            styles.avatarContainer,
            {
              borderColor: imageUri ? colors.primary[500] : theme.border,
              backgroundColor: imageUri ? 'transparent' : theme.surface,
            },
          ]}
          onPress={pickImage}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.avatarPlaceholderText, { color: theme.textTertiary }]}>
                Tap to add photo
              </Text>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        {imageUri && (
          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={pickImage}
            disabled={isProcessing}
          >
            <Ionicons name="image-outline" size={18} color={colors.primary[500]} />
            <Text style={[styles.changePhotoText, { color: colors.primary[500] }]}>
              Change Photo
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.tipsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.tipsTitle, { color: theme.text }]}>Photo Tips</Text>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.secondary[500]} />
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Use a clear, well-lit headshot
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.secondary[500]} />
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Smile and look approachable
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.secondary[500]} />
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Avoid sunglasses or hats
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.secondary[500]} />
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Use a plain or simple background
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Back"
          variant="outline"
          onPress={() => router.back()}
          style={{ flex: 1 }}
          disabled={isProcessing}
        />
        <Button
          title="Complete"
          onPress={handleComplete}
          loading={isProcessing}
          style={{ flex: 1 }}
        />
      </View>

      {!imageUri && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleComplete}
          disabled={isProcessing}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
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
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  avatarContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  avatarPlaceholderText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  changePhotoText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
  tipsCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  tipsTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    marginBottom: spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  skipButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
});
