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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CheckCircle2, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    loadData();
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (taskId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadPhoto(taskId, result.assets[0].uri);
    }
  };

  const uploadPhoto = async (taskId: string, uri: string) => {
    setUploading(taskId);

    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${id}/${playerId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(filePath);

      // Create submission record
      const { error: dbError } = await supabase.from('submissions').insert({
        task_id: taskId,
        player_id: playerId,
        photo_url: urlData.publicUrl,
        validated: false,
      });

      if (dbError) throw dbError;

      Alert.alert('Listo!', 'Foto subida exitosamente');
      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploading(null);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{eventTitle}</Text>
        <Text style={styles.playerName}>Jugador: {playerName}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedCount / tasks.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedCount} de {tasks.length} completadas
        </Text>
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
              <Text style={styles.taskNumber}>#{index + 1}</Text>
              {task.submission && (
                <View style={styles.statusBadge}>
                  <CheckCircle2
                    size={16}
                    color={task.submission.validated ? '#10b981' : '#f59e0b'}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      task.submission.validated
                        ? styles.validatedText
                        : styles.pendingText,
                    ]}
                  >
                    {task.submission.validated ? 'Validada' : 'Pendiente'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.taskDescription}>{task.description}</Text>

            {task.submission ? (
              <Image
                source={{ uri: task.submission.photo_url }}
                style={styles.taskImage}
              />
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage(task.id)}
                disabled={uploading === task.id}
              >
                {uploading === task.id ? (
                  <ActivityIndicator color="#6366f1" />
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
        <Text style={styles.leaderboardButtonText}>Ver Tabla de Posiciones</Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  tasksList: {
    padding: 16,
    gap: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  taskCardCompleted: {
    borderColor: '#6366f1',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  validatedText: {
    color: '#10b981',
  },
  pendingText: {
    color: '#f59e0b',
  },
  taskDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  taskImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6366f1',
  },
  leaderboardButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
  },
  leaderboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});