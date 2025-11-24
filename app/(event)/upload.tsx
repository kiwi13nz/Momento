import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Upload, AlertCircle, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { StorageService } from '@/lib/storage';
import { PhotoService } from '@/services/api';
import { ShareToStoryModal } from '@/components/shared/ShareToStoryModal';
import { ConfettiCelebration, isFirstUpload, markFirstUploadComplete } from '@/components/shared/ConfettiCelebration';
import { ImageCompressionService } from '@/services/image-compression';
import { AuthService } from '@/services/auth';
import { AnalyticsService, Events } from '@/services/analytics';

export default function UploadPhotoScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const playerId = params.playerId as string;
  const taskId = params.taskId as string;
  const taskDescription = params.taskDescription as string;
  const eventCode = params.eventCode as string;
  const eventTitle = params.eventTitle as string;
  const playerName = params.playerName as string;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const compressedUri = await ImageCompressionService.compressImage(
          result.assets[0].uri
        );
        
        setSelectedImage(compressedUri);
        setError(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const compressedUri = await ImageCompressionService.compressImage(
          result.assets[0].uri
        );
        
        setSelectedImage(compressedUri);
        setError(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async () => {
    if (!selectedImage) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Check for duplicate (Priority #6)
      const hasDuplicate = await PhotoService.checkDuplicateSubmission(playerId, taskId);
      if (hasDuplicate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Already Uploaded',
          'You already uploaded a photo for this task. Want to replace it?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setUploading(false) },
            { text: 'Replace', onPress: () => uploadWithReplace() },
          ]
        );
        return;
      }

      await performUpload();
    } catch (error) {
      handleUploadError(error);
    }
  };

  const uploadWithReplace = async () => {
    try {
      // Delete existing submission
      await PhotoService.deleteSubmission(playerId, taskId);
      await performUpload();
    } catch (error) {
      handleUploadError(error);
    }
  };

  const performUpload = async () => {
    if (!selectedImage) return;

    try {
      // Verify user is authenticated (should always be true, but safety check)
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated. Please rejoin the event.');
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to storage
      const photoUrl = await StorageService.uploadPhoto(selectedImage, eventId);
      setUploadProgress(95);

      // Create submission
      await PhotoService.upload(taskId, playerId, photoUrl);
      setUploadProgress(100);

      clearInterval(progressInterval);

      // Check if this is first upload
      const isFirst = await isFirstUpload();
      
      // Success!
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUploadedPhotoUrl(photoUrl);
    
    // Track successful upload
    AnalyticsService.trackEvent(Events.PHOTO_UPLOADED, {
      eventId,
      taskId,
      isFirstUpload: isFirst,
    });

    if (isFirst) {
        // Show celebration first
        setShowCelebration(true);
        await markFirstUploadComplete();
      } else {
        // Go straight to share modal
        setShowShareModal(true);
      }

    } catch (error) {
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleUploadError = (error: any) => {
  console.error('Upload failed:', error);
  const errorMessage = error?.message || 'Upload failed. Please try again.';
  
  // Log to Sentry
  AnalyticsService.logError(error, {
    eventId,
    taskId,
    playerId,
    screen: 'upload',
  });
  
  // Track failed upload
  AnalyticsService.trackEvent(Events.UPLOAD_FAILED, {
    error: errorMessage,
    eventId,
    taskId,
  });
  
  setError(errorMessage);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  setUploading(false);
  setUploadProgress(0);
};

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    uploadPhoto();
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setShowShareModal(true);
  };

  const handleShareModalClose = () => {
    setShowShareModal(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Photo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Task Info */}
        <View style={styles.taskCard}>
          <Text style={styles.taskLabel}>Challenge</Text>
          <Text style={styles.taskDescription}>{taskDescription}</Text>
        </View>

        {/* Image Preview or Picker */}
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            {!uploading && (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <X size={20} color="#fff" />
              </TouchableOpacity>
            )}
            
            {/* Upload Progress Overlay */}
            {uploading && (
              <View style={styles.progressOverlay}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.pickerContainer}>
            <TouchableOpacity style={styles.pickerOption} onPress={takePhoto}>
              <View style={styles.pickerIconContainer}>
                <Camera size={40} color={colors.primary} />
              </View>
              <Text style={styles.pickerLabel}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={pickImage}>
              <View style={styles.pickerIconContainer}>
                <Upload size={40} color={colors.primary} />
              </View>
              <Text style={styles.pickerLabel}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Upload Button or Retry */}
        {selectedImage && !uploading && (
          <View style={styles.actions}>
            {error ? (
              <Button
                onPress={handleRetry}
                fullWidth
                size="large"
                icon={<RefreshCw size={24} color="#fff" />}
              >
                Retry Upload
              </Button>
            ) : (
              <Button
                onPress={uploadPhoto}
                fullWidth
                size="large"
                variant="gradient"
              >
                Upload Photo
              </Button>
            )}
          </View>
        )}
      </ScrollView>

      {/* First Upload Celebration */}
      <ConfettiCelebration
        visible={showCelebration}
        onComplete={handleCelebrationComplete}
        playerName={playerName}
      />

      {/* Share Modal */}
      {uploadedPhotoUrl && (
        <ShareToStoryModal
          visible={showShareModal}
          photoUrl={uploadedPhotoUrl}
          eventCode={eventCode}
          eventTitle={eventTitle}
          onClose={handleShareModalClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  content: {
    padding: spacing.l,
    gap: spacing.xl,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  taskLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.s,
  },
  taskDescription: {
    ...typography.headline,
    color: colors.text,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: borderRadius.l,
    overflow: 'hidden',
    ...shadows.large,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
  },
  changeImageButton: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: spacing.m,
    gap: spacing.s,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.s,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
  },
  pickerContainer: {
    gap: spacing.m,
  },
  pickerOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.m,
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    borderStyle: 'dashed',
  },
  pickerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
  },
  actions: {
    gap: spacing.m,
  },
});