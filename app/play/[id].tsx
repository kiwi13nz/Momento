import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CheckCircle2, Trophy, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase, getUploadSuccessMessage } from '@/lib/supabase';

type Task = {
  id: string;
  description: string;
  order_number: number;
  submission?: {
    id: string;
    photo_url: string;
    validated: boolean;
  };
};

export default function PlayerViewScreen() {
  const { id, playerId } = useLocalSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();

    // Subscribe to validation changes
    const channel = supabase
      .channel('player-submissions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Load event info
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', id)
        .single();

      if (event) setEventTitle(event.title);

      // Load player info
      const { data: player } = await supabase
        .from('players')
        .select('name')
        .eq('id', playerId)
        .single();

      if (player) setPlayerName(player.name);

      // Load tasks and submissions
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(
          `
          id,
          description,
          order_number,
          submissions!inner(id, photo_url, validated)
        `
        )
        .eq('event_id', id)
        .eq('submissions.player_id', playerId)
        .order('order_number');

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, description, order_number')
        .eq('event_id', id)
        .order('order_number');

      // Merge tasks with submissions
      const mergedTasks =
        allTasks?.map((task) => {
          const taskWithSub = tasksData?.find((t) => t.id === task.id);
          return {
            ...task,
            submission: taskWithSub?.submissions?.[0],
          };
        }) || [];

      setTasks(mergedTasks);

      // Animate progress bar
      const completedCount = mergedTasks.filter((t) => t.submission).length;
      const progress = completedCount / mergedTasks.length;
      Animated.spring(progressAnim, {
        toValue: progress,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (taskId: string, taskDescription: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadPhoto(taskId, result.assets[0].uri, taskDescription);
    }
  };

  const uploadPhoto = async (
    taskId: string,
    uri: string,
    taskDescription: string
  ) => {
    setUploading(taskId);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${id}/${playerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('submissions').insert({
        task_id: taskId,
        player_id: playerId,
        photo_url: urlData.publicUrl,
        validated: false,
      });

      if (dbError) throw dbError;

      // Success effects
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const message = getUploadSuccessMessage(taskDescription);
      setSuccessMessage(message);
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2500);

      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo subir la foto');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando desafíos...</Text>
      </View>
    );
  }

  const completedCount = tasks.filter((t) => t.submission).length;
  const validatedCount = tasks.filter(
    (t) => t.submission?.validated
  ).length;

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>{eventTitle}</Text>
          <View style={styles.playerBadge}>
            <Text style={styles.playerName}>👤 {playerName}</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.progressText}>
                📸 {completedCount}/{tasks.length} subidas
              </Text>
              {validatedCount > 0 && (
                <Text style={styles.validatedText}>
                  ✅ {validatedCount} validadas
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.tasksList}>
          {tasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                task.submission && styles.taskCardCompleted,
              ]}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskNumberContainer}>
                  <Text style={styles.taskNumber}>#{index + 1}</Text>
                </View>
                {task.submission && (
                  <View
                    style={[
                      styles.statusBadge,
                      task.submission.validated && styles.statusBadgeValidated,
                    ]}
                  >
                    <CheckCircle2
                      size={16}
                      color={task.submission.validated ? '#10b981' : '#f59e0b'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        task.submission.validated
                          ? styles.validatedText
                          : styles.pendingTextBadge,
                      ]}
                    >
                      {task.submission.validated ? 'Validada' : 'Pendiente'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.taskDescription}>{task.description}</Text>

              {task.submission ? (
                <View>
                  <Image
                    source={{ uri: task.submission.photo_url }}
                    style={styles.taskImage}
                  />
                  {task.submission.validated && (
                    <View style={styles.validatedOverlay}>
                      <CheckCircle2 size={32} color="#10b981" />
                      <Text style={styles.validatedOverlayText}>
                        Aprobada! 🎉
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage(task.id, task.description)}
                  disabled={uploading === task.id}
                >
                  {uploading === task.id ? (
                    <>
                      <ActivityIndicator color="#6366f1" />
                      <Text style={styles.uploadingText}>Subiendo...</Text>
                    </>
                  ) : (
                    <>
                      <Camera size={24} color="#6366f1" />
                      <Text style={styles.uploadButtonText}>Subir Foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/leaderboard/${id}`)}
          style={styles.leaderboardButton}
        >
          <Trophy size={20} color="#fff" />
          <Text style={styles.leaderboardButtonText}>
            Ver Tabla de Posiciones
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Sparkles size={48} color="#6366f1" />
            <Text style={styles.successModalText}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  playerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  validatedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  tasksList: {
    padding: 16,
    gap: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  taskCardCompleted: {
    borderColor: '#6366f1',
    backgroundColor: '#fafafa',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
  },
  statusBadgeValidated: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingTextBadge: {
    color: '#f59e0b',
  },
  taskDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 22,
  },
  taskImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  validatedOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  validatedOverlayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  leaderboardButton: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8,
    padding: 18,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  leaderboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successModalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
  },
});