// app/(event)/upload.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoService, StorageService, TaskService, EventService, PlayerService, supabase } from '@/services/api';
import { ImageCompressionService } from '@/services/image-compression';
import { useSession } from '@/hooks/useSession';
import { RateLimiter } from '@/services/rate-limiter';
import { ConfettiCelebration, isFirstUpload, markFirstUploadComplete } from '@/components/shared/ConfettiCelebration';
import { ShareToStoryModal } from '@/components/shared/ShareToStoryModal';
import { CheckCircle2, Camera } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';  // ← ADD THIS
import type { Task } from '@/types';

// Rate limiter: 5 uploads per minute
const uploadLimiter = RateLimiter.create('upload', 5, 60000);

export default function UploadScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession(eventId!);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventClosed, setEventClosed] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventCode, setEventCode] = useState<string>('');

  useEffect(() => {
    if (eventId && session) {
      loadTasks();
      checkEventStatus();
      loadEventDetails();
    }
  }, [eventId, session]);

  const loadEventDetails = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: event } = await supabase
        .from('events')
        .select('title, code')
        .eq('id', eventId!)
        .single();

      if (event) {
        setEventTitle(event.title);
        setEventCode(event.code);
      }
    } catch (error) {
      console.error('Failed to load event details:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await TaskService.getByEventId(eventId!);
      setTasks(data);

      // Load completed tasks AFTER tasks are loaded
      if (session && data.length > 0) {
        const submissions = await PhotoService.getPlayerSubmissions(
          session.playerId,
          data.map(t => t.id)
        );
        const completedIds = submissions.map(s => s.task_id);
        setCompletedTaskIds(completedIds);
        console.log('✅ Completed tasks:', completedIds);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      Alert.alert('Error', 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const checkEventStatus = async () => {
    try {
      const closed = await EventService.isClosed(eventId!);
      setEventClosed(closed);
    } catch (error) {
      console.error('Failed to check event status:', error);
    }
  };

  const pickImage = async () => {
    if (eventClosed) {
      Alert.alert('Event Ended', 'This event has closed. No new photos can be uploaded.');
      return;
    }

    try {
      console.log('📸 Opening image picker...');

      // Request permissions (only needed on native)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need camera roll permissions to upload photos.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📸 Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Image selected:', result.assets[0].uri);
        setSelectedImage(result.assets[0].uri);
      } else {
        console.log('❌ Image picker cancelled');
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const takePhoto = async () => {
    if (eventClosed) {
      Alert.alert('Event Ended', 'This event has closed. No new photos can be uploaded.');
      return;
    }

    // Camera not supported on web
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Camera is not supported on web. Please use "Choose from Library".');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !selectedTaskId || !session) {
      Alert.alert('Missing Information', 'Please select a challenge and photo');
      return;
    }

    if (eventClosed) {
      Alert.alert('Event Ended', 'This event has closed. No new photos can be uploaded.');
      return;
    }

    // Check rate limit
    if (!uploadLimiter.tryAcquire()) {
      const waitTime = Math.ceil(uploadLimiter.getTimeUntilReset() / 1000);
      Alert.alert(
        'Slow Down! 🐌',
        `You're uploading too fast. Please wait ${waitTime} seconds before uploading again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setUploading(true);

    try {
      // Check for duplicate submission
      const isDuplicate = await PhotoService.checkDuplicateSubmission(
        session.playerId,
        selectedTaskId
      );

      if (isDuplicate) {
        Alert.alert(
          'Replace Photo?',
          'You already uploaded a photo for this challenge. Do you want to replace it?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setUploading(false) },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                await PhotoService.deleteSubmission(session.playerId, selectedTaskId);
                await uploadPhoto();
              },
            },
          ]
        );
      } else {
        await uploadPhoto();
      }
    } catch (error: any) {
      console.error('Upload error:', error);

      // Check for event closed constraint violation
      if (error.message?.includes('check_event_not_closed')) {
        Alert.alert('Event Ended', 'This event has closed while you were uploading. Your photo was not saved.');
        setEventClosed(true);
      } else {
        Alert.alert('Upload Failed', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadPhoto = async () => {
    if (!selectedImage || !selectedTaskId || !session) return;

    try {
      console.log('📤 Starting upload process...');

      // NEW: Ensure player has auth_user_id linked
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: player } = await supabase
          .from('players')
          .select('auth_user_id')
          .eq('id', session.playerId)
          .single();

        // If player doesn't have auth_user_id, link it now
        if (player && !player.auth_user_id) {
          console.log('🔗 Linking auth user to player...');
          await supabase
            .from('players')
            .update({ auth_user_id: user.id })
            .eq('id', session.playerId);
        }
      }

      let imageToUpload = selectedImage;

      // STEP 1: Compress image (skip on web if causing issues)
      console.log('🗜️ Compressing image...');
      imageToUpload = await ImageCompressionService.compressImage(selectedImage);
      console.log('🔍 Compressed image URI:', imageToUpload); // ADD THIS
      console.log('🔍 Is blob URL?', imageToUpload.startsWith('blob:')); // ADD THIS


      // STEP 2: Upload to storage
      console.log('☁️ Uploading to storage...');
      const photoUrl = await StorageService.uploadPhoto(
        eventId!,
        session.playerId,
        imageToUpload
      );

      // STEP 3: Create submission
      console.log('💾 Creating submission record...');
      await PhotoService.upload(selectedTaskId, session.playerId, photoUrl);

      console.log('✅ Upload complete!');

      // Show celebration and share modal
      const isFirst = await isFirstUpload();
      if (isFirst) {
        setShowCelebration(true);
        setUploadedPhotoUrl(photoUrl);
        await markFirstUploadComplete();
      } else {
        setUploadedPhotoUrl(photoUrl);
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error; // Re-throw to be caught by handleUpload
    }
  };

  const getTaskCompletionStatus = (taskId: string) => {
    return completedTaskIds.includes(taskId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Photo</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Event Closed Banner */}
      {eventClosed && (
        <View style={styles.closedBanner}>
          <Ionicons name="lock-closed" size={20} color="#fff" />
          <Text style={styles.closedBannerText}>Event Ended - No new uploads allowed</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Step 1: Select Challenge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select a Challenge</Text>
          <View style={styles.taskList}>
            {tasks.map((task, index) => {
              const isSelected = selectedTaskId === task.id;
              const isCompleted = getTaskCompletionStatus(task.id);

              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskCard,
                    isSelected && styles.taskCardSelected,
                    isCompleted && styles.taskCardCompleted,
                    eventClosed && styles.taskCardDisabled,
                  ]}
                  onPress={() => !eventClosed && !isCompleted && setSelectedTaskId(task.id)}
                  disabled={eventClosed || isCompleted}
                >
                  <View style={styles.taskNumber}>
                    {isCompleted ? (
                      <CheckCircle2 size={20} color="#34C759" />
                    ) : (
                      <Text style={styles.taskNumberText}>#{index + 1}</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.taskDescription,
                    isCompleted && styles.taskDescriptionCompleted,
                    isSelected && styles.taskDescriptionSelected
                  ]}>
                    {task.description}
                  </Text>
                  {!isCompleted && <Camera size={20} color={isSelected ? '#007AFF' : '#8E8E93'} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Pick/Take Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Add Your Photo</Text>
          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
                disabled={eventClosed}
              >
                <Ionicons name="close-circle" size={32} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.photoButton, eventClosed && styles.buttonDisabled]}
                  onPress={takePhoto}
                  disabled={eventClosed}
                >
                  <Ionicons name="camera" size={32} color={eventClosed ? '#999' : colors.primary} />
                  <Text style={[styles.photoButtonText, eventClosed && styles.buttonTextDisabled]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.photoButton, eventClosed && styles.buttonDisabled, Platform.OS === 'web' && styles.photoButtonFullWidth]}
                onPress={pickImage}
                disabled={eventClosed}
              >
                <Ionicons name="images" size={32} color={eventClosed ? '#999' : colors.primary} />
                <Text style={[styles.photoButtonText, eventClosed && styles.buttonTextDisabled]}>
                  Choose from Library
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Upload Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!selectedImage || !selectedTaskId || uploading || eventClosed) &&
            styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!selectedImage || !selectedTaskId || uploading || eventClosed}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadButtonText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>
                {eventClosed ? 'Event Ended' : 'Upload Photo'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Celebration Modal */}
      <ConfettiCelebration
        visible={showCelebration}
        playerName={session?.playerName}
        onComplete={() => {
          setShowCelebration(false);
          setShowShareModal(true);
        }}
      />

      {/* Share Modal */}
      <ShareToStoryModal
        visible={showShareModal}
        photoUrl={uploadedPhotoUrl}
        eventCode={eventCode}
        eventTitle={eventTitle}
        onClose={() => {
          setShowShareModal(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,  // Dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  closedBanner: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  closedBannerText: {
    ...typography.bodyBold,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.m,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.m,
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,  // Dark surface
    borderRadius: borderRadius.m,
    padding: spacing.m,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardSelected: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,  // Orange border
  },
  taskCardCompleted: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  taskCardDisabled: {
    opacity: 0.5,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,  // Orange border
  },
  taskNumberText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,  // Orange text
  },
  taskDescription: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  taskDescriptionCompleted: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  taskDescriptionSelected: {
    fontWeight: '600',
    color: colors.primary,  // Orange when selected
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.l,
    alignItems: 'center',
    gap: 8,
  },
  photoButtonFullWidth: {
    flex: 1,
  },
  photoButtonText: {
    ...typography.bodyBold,
    color: colors.primary,  // Orange text
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: borderRadius.m,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.m,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  footer: {
    padding: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  uploadButton: {
    backgroundColor: colors.primary,  // Orange button
    borderRadius: borderRadius.m,
    padding: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.5,
  },
  uploadButtonText: {
    ...typography.bodyBold,
    color: '#fff',
  },
});