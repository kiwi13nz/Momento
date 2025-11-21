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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CheckCircle2, Trophy, Image as ImageIcon, Zap } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase, getUploadSuccessMessage } from '@/lib/supabase';

type Task = {
  id: string;
  description: string;
  order_number: number;
  submission?: { id: string; photo_url: string };
};

export default function PlayerViewScreen() {
  const params = useLocalSearchParams();
const id = params.id as string;
const playerId = params.playerId as string;
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [justCompletedTaskId, setJustCompletedTaskId] = useState<string | null>(null);
  const [progressAnim] = useState(new Animated.Value(0));
  const [successAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();
    const channel = supabase.channel('player-submissions').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, loadData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    try {
      const { data: event } = await supabase.from('events').select('title').eq('id', id).single();
      if (event) setEventTitle(event.title);

      const { data: player } = await supabase.from('players').select('name').eq('id', playerId).single();
      if (player) setPlayerName(player.name);

      const { data: allTasks } = await supabase.from('tasks').select('id, description, order_number').eq('event_id', id).order('order_number');
      const { data: playerSubmissions } = await supabase.from('submissions').select('id, photo_url, task_id').eq('player_id', playerId);

      const mergedTasks = allTasks?.map((task) => {
        const submission = playerSubmissions?.find((s) => s.task_id === task.id);
        return { ...task, submission: submission ? { id: submission.id, photo_url: submission.photo_url } : undefined };
      }) || [];

      setTasks(mergedTasks);

      const completedCount = mergedTasks.filter((t) => t.submission).length;
      const progress = completedCount / mergedTasks.length;
      Animated.spring(progressAnim, { toValue: progress, useNativeDriver: false }).start();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadImage = async (taskId: string, taskDescription: string) => {
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

  const uploadPhoto = async (taskId: string, uri: string, taskDescription: string) => {
    setUploadingTaskId(taskId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${id}/${playerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, blob, { contentType: `image/${fileExt}`, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('submissions').insert({ task_id: taskId, player_id: playerId, photo_url: urlData.publicUrl, reactions: {} });
      if (dbError) throw dbError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setJustCompletedTaskId(taskId);
      Animated.sequence([
        Animated.spring(successAnim, { toValue: 1, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setJustCompletedTaskId(null));

      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo subir la foto');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploadingTaskId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const completedCount = tasks.filter((t) => t.submission).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{eventTitle}</Text>
        <View style={styles.playerBadge}>
          <Text style={styles.playerName}>👤 {playerName}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Text style={styles.progressText}>{completedCount}/{tasks.length} completadas 🎯</Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push({ pathname: '/feed/[id]', params: { id, playerId } })}>
            <ImageIcon size={20} color="#6366f1" />
            <Text style={styles.quickActionText}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push({ pathname: '/leaderboard/[id]', params: { id } })}>
            <Trophy size={20} color="#6366f1" />
            <Text style={styles.quickActionText}>Ranking</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.tasksList}>
        {tasks.map((task, index) => (
          <View key={task.id} style={[styles.taskCard, task.submission && styles.taskCardCompleted]}>
            <View style={styles.taskHeader}>
              <View style={styles.taskNumberContainer}>
                <Text style={styles.taskNumber}>#{index + 1}</Text>
              </View>
              {task.submission && (
                <View style={styles.completedBadge}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.completedText}>Completada</Text>
                </View>
              )}
            </View>

            <Text style={styles.taskDescription}>{task.description}</Text>

            {task.submission ? (
              <View style={styles.completedContainer}>
                <Image source={{ uri: task.submission.photo_url }} style={styles.taskImage} />
                {justCompletedTaskId === task.id && (
                  <Animated.View style={[styles.successOverlay, { opacity: successAnim, transform: [{ scale: successAnim }] }]}>
                    <Zap size={48} color="#fbbf24" fill="#fbbf24" />
                    <Text style={styles.successText}>¡Task Completada! 🎉</Text>
                  </Animated.View>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickAndUploadImage(task.id, task.description)} disabled={uploadingTaskId === task.id}>
                {uploadingTaskId === task.id ? (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  playerBadge: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  playerName: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  progressContainer: { gap: 8, marginBottom: 16 },
  progressBar: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 6 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#eef2ff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1' },
  quickActionText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  tasksList: { flex: 1, padding: 16 },
  taskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#e5e7eb', marginBottom: 16 },
  taskCardCompleted: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  taskNumberContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  taskNumber: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#d1fae5' },
  completedText: { fontSize: 12, fontWeight: '600', color: '#10b981' },
  taskDescription: { fontSize: 16, color: '#374151', marginBottom: 12, lineHeight: 22 },
  completedContainer: { position: 'relative' },
  taskImage: { width: '100%', height: 220, borderRadius: 12 },
  successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16, 185, 129, 0.9)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 12 },
  successText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, backgroundColor: '#eef2ff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1', borderStyle: 'dashed' },
  uploadButtonText: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
  uploadingText: { fontSize: 14, fontWeight: '500', color: '#6366f1' },
});