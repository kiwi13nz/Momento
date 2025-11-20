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
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle, Share2, Trophy } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type Submission = {
  id: string;
  photo_url: string;
  validated: boolean;
  player: { name: string };
  task: { description: string };
  created_at: string;
};

export default function EventManagementScreen() {
  const { id, ownerId } = useLocalSearchParams();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Subscribe to new submissions
    const channel = supabase
      .channel('submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
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
      // Verify owner
      const { data: event } = await supabase
        .from('events')
        .select('title, owner_id')
        .eq('id', id)
        .single();

      if (!event || event.owner_id !== ownerId) {
        Alert.alert('Error', 'No tenés acceso a este evento');
        router.back();
        return;
      }

      setEventTitle(event.title);

      // Load submissions with player and task info
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select(
          `
          id,
          photo_url,
          validated,
          created_at,
          player:players(name),
          task:tasks(description)
        `
        )
        .eq('task.event_id', id)
        .order('created_at', { ascending: false });

      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateSubmission = async (submissionId: string, valid: boolean) => {
    setValidating(submissionId);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({ validated: valid })
        .eq('id', submissionId);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo actualizar');
    } finally {
      setValidating(null);
    }
  };

  const shareEvent = async () => {
    try {
      await Share.share({
        message: `Unite a mi evento "${eventTitle}"!\n\nCódigo: ${id}\n\nDescargá Rally y unite con este código.`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const pendingCount = submissions.filter((s) => !s.validated).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{eventTitle}</Text>
        <Text style={styles.eventId}>Código: {id}</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={shareEvent}>
            <Share2 size={20} color="#6366f1" />
            <Text style={styles.shareButtonText}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => router.push(`/leaderboard/${id}`)}
          >
            <Trophy size={20} color="#fff" />
            <Text style={styles.leaderboardButtonText}>Tabla</Text>
          </TouchableOpacity>
        </View>

        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>
              {pendingCount} {pendingCount === 1 ? 'foto' : 'fotos'} por validar
            </Text>
          </View>
        )}
      </View>

      <View style={styles.submissionsList}>
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Todavía no hay fotos subidas
            </Text>
            <Text style={styles.emptySubtext}>
              Compartí el código con los jugadores
            </Text>
          </View>
        ) : (
          submissions.map((submission) => (
            <View key={submission.id} style={styles.submissionCard}>
              <View style={styles.submissionHeader}>
                <View>
                  <Text style={styles.playerName}>{submission.player.name}</Text>
                  <Text style={styles.taskDescription}>
                    {submission.task.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    submission.validated && styles.validatedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      submission.validated && styles.validatedBadgeText,
                    ]}
                  >
                    {submission.validated ? 'Validada' : 'Pendiente'}
                  </Text>
                </View>
              </View>

              <Image
                source={{ uri: submission.photo_url }}
                style={styles.submissionImage}
              />

              {!submission.validated && (
                <View style={styles.validationButtons}>
                  <TouchableOpacity
                    style={[styles.validationButton, styles.approveButton]}
                    onPress={() => validateSubmission(submission.id, true)}
                    disabled={validating === submission.id}
                  >
                    <CheckCircle2 size={20} color="#fff" />
                    <Text style={styles.validationButtonText}>Aprobar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.validationButton, styles.rejectButton]}
                    onPress={() => validateSubmission(submission.id, false)}
                    disabled={validating === submission.id}
                  >
                    <XCircle size={20} color="#fff" />
                    <Text style={styles.validationButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>
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
  eventId: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6366f1',
  },
  leaderboardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  leaderboardButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  pendingBadge: {
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
    textAlign: 'center',
  },
  submissionsList: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
  },
  validatedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
  },
  validatedBadgeText: {
    color: '#065f46',
  },
  submissionImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  validationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  validationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  validationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});