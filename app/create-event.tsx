import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus, Sparkles, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { saveOwnerEvent } from '@/lib/storage';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { AnalyticsService, Events } from '@/services/analytics';
import { EventCreatedModal } from '@/components/shared/EventCreatedModal';

// Helper function for generating codes
function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<{ 
    id: string; 
    code: string; 
    title: string;
    ownerId: string;
  } | null>(null);

  const addTask = () => {
    if (tasks.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 tasks allowed');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTasks([...tasks, '']);
  };

  const removeTask = (index: number) => {
    if (tasks.length <= 1) {
      Alert.alert('Minimum Required', 'At least 1 task is required');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const validateInputs = () => {
    let isValid = true;

    if (!title.trim()) {
      setTitleError('Event name is required');
      isValid = false;
    }

    const validTasks = tasks.filter((t) => t.trim().length > 0);
    if (validTasks.length === 0) {
      Alert.alert('Error', 'Add at least one task');
      isValid = false;
    }

    return isValid;
  };

  const createEvent = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Generate unique code
      let eventCode = generateEventCode();
      let codeExists = true;
      let attempts = 0;

      while (codeExists && attempts < 10) {
        const { data } = await supabase
          .from('events')
          .select('id')
          .eq('code', eventCode)
          .single();
        
        codeExists = !!data;
        if (codeExists) {
          eventCode = generateEventCode();
        }
        attempts++;
      }

      if (codeExists) {
        throw new Error('Failed to generate unique code');
      }

      // Generate owner ID
      const ownerId = `owner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          description: description.trim(),
          code: eventCode,
          owner_id: ownerId,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create tasks
      const validTasks = tasks.filter((t) => t.trim().length > 0);
      const taskInserts = validTasks.map((description, index) => ({
        event_id: event.id,
        description: description.trim(),
        order_number: index + 1,
      }));

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(taskInserts);

      if (tasksError) throw tasksError;

      // Save to local storage
      await saveOwnerEvent({
        eventId: event.id,
        eventCode: event.code,
        ownerId: ownerId,
        title: event.title,
        createdAt: new Date().toISOString(),
      });

      // Track event creation
      AnalyticsService.trackEvent(Events.USER_CREATED_EVENT, {
        eventId: event.id,
        eventTitle: event.title,
        taskCount: validTasks.length,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success modal instead of navigating immediately
      setCreatedEvent({
        id: event.id,
        code: event.code,
        title: event.title,
        ownerId: ownerId,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Create event failed:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Log error to analytics
      AnalyticsService.logError(error as Error, {
        context: 'create_event',
        title: title.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteErrorBoundary routeName="create-event">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Sparkles size={40} color={colors.primary} />
            <Text style={styles.title}>Create Event</Text>
            <Text style={styles.subtitle}>Set up your photo challenge 📸</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Event Name"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setTitleError('');
              }}
              placeholder="Birthday Party, Team Outing..."
              error={titleError}
            />

            <Input
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Tell players what this is about..."
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            {/* Tasks Section */}
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Photo Challenges</Text>
              <Text style={styles.sectionSubtitle}>
                What photos should players take?
              </Text>

              {tasks.map((task, index) => (
                <View key={index} style={styles.taskRow}>
                  <View style={styles.taskNumber}>
                    <Text style={styles.taskNumberText}>#{index + 1}</Text>
                  </View>
                  <Input
                    value={task}
                    onChangeText={(value) => updateTask(index, value)}
                    placeholder="e.g., Photo with someone in yellow"
                    containerStyle={styles.taskInput}
                  />
                  {tasks.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeTask(index)}
                      style={styles.removeButton}
                    >
                      <X size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {tasks.length < 10 && (
                <TouchableOpacity onPress={addTask} style={styles.addButton}>
                  <Plus size={20} color={colors.primary} />
                  <Text style={styles.addButtonText}>Add Challenge</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                onPress={createEvent}
                loading={loading}
                disabled={loading}
                fullWidth
                size="large"
              >
                Create Event
              </Button>

              <Button
                onPress={() => router.back()}
                variant="ghost"
                fullWidth
                disabled={loading}
              >
                Cancel
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      {createdEvent && (
        <EventCreatedModal
          visible={showSuccessModal}
          eventCode={createdEvent.code}
          eventTitle={createdEvent.title}
          onContinue={() => {
            setShowSuccessModal(false);
            router.replace({
              pathname: '/(event)/[id]',
              params: {
                id: createdEvent.id,
                ownerId: createdEvent.ownerId,
                code: createdEvent.code,
              },
            });
          }}
        />
      )}
    </RouteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
    gap: spacing.m,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: spacing.l,
    gap: spacing.l,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tasksSection: {
    gap: spacing.m,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  taskRow: {
    flexDirection: 'row',
    gap: spacing.s,
    alignItems: 'flex-start',
  },
  taskNumber: {
    width: 32,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  taskNumberText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  taskInput: {
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.m,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  addButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  actions: {
    gap: spacing.m,
    marginTop: spacing.l,
  },
});