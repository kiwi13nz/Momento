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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoService, StorageService, TaskService, EventService } from '@/services/api';
import { useSession } from '@/hooks/useSession';
import { RateLimiter } from '@/services/rate-limiter';
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

  useEffect(() => {
    if (eventId) {
      loadTasks();
      checkEventStatus();
    }
  }, [eventId]);

  const loadTasks = async () => {
    try {
      const data = await TaskService.getByEventId(eventId!);
      setTasks(data);
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

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (eventClosed) {
      Alert.alert('Event Ended', 'This event has closed. No new photos can be uploaded.');
      return;
    }

    // Request permissions
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
            { text: 'Cancel', style: 'cancel' },
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
      // Upload to storage
      const photoUrl = await StorageService.uploadPhoto(
        eventId!,
        session.playerId,
        selectedImage
      );

      // Create submission
      await PhotoService.upload(selectedTaskId, session.playerId, photoUrl);

      Alert.alert('Success! 🎉', 'Your photo has been uploaded', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      throw error; // Re-throw to be caught by handleUpload
    }
  };

  const getTaskCompletionStatus = (taskId: string) => {
    // This would need to check if player has already submitted for this task
    // For now, just return false - you can enhance this later
    return false;
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
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
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
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const isCompleted = getTaskCompletionStatus(task.id);
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskCard,
                    isSelected && styles.taskCardSelected,
                    eventClosed && styles.taskCardDisabled,
                  ]}
                  onPress={() => !eventClosed && setSelectedTaskId(task.id)}
                  disabled={eventClosed}
                >
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskText, isSelected && styles.taskTextSelected]}>
                      {task.description}
                    </Text>
                    {isCompleted && (
                      <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                    )}
                  </View>
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
              <TouchableOpacity
                style={[styles.photoButton, eventClosed && styles.buttonDisabled]}
                onPress={takePhoto}
                disabled={eventClosed}
              >
                <Ionicons name="camera" size={32} color={eventClosed ? '#999' : '#007AFF'} />
                <Text style={[styles.photoButtonText, eventClosed && styles.buttonTextDisabled]}>
                  Take Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoButton, eventClosed && styles.buttonDisabled]}
                onPress={pickImage}
                disabled={eventClosed}
              >
                <Ionicons name="images" size={32} color={eventClosed ? '#999' : '#007AFF'} />
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
            <ActivityIndicator color="#fff" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  closedBanner: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  closedBannerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  taskCardDisabled: {
    opacity: 0.5,
  },
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  taskTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#F2F2F7',
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: '#999',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});