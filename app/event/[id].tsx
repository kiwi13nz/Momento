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
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle, Share2, Trophy, Copy, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
  const { id, ownerId, code } = useLocalSearchParams();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCode, setEventCode] = useState(code as string || '');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [copiedAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();

    // Subscribe to new submissions
    const channel = supabase
      .channel('submissions')
      .on(
        'postgres_changes',
        {
          event: '*',
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
    // Verify owner and get event details
    const { data: event } = await supabase
      .from('events')
      .select('title, owner_id, code')
      .eq('id', id)
      .single();

    if (!event || event.owner_id !== ownerId) {
      Alert.alert('Error', 'No tenés acceso a este evento');
      router.back();
      return;
    }

    setEventTitle(event.title);
    setEventCode(event.code);

    // Load submissions with player and task info
    const { data: submissionsData, error } = await supabase
      .from('submissions')
      .select(`
        id,
        photo_url,
        validated,
        created_at,
        players!inner(name),
        tasks!inner(description)
      `)
      .eq('task.event_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to match your Submission type
    const formatted = (submissionsData || []).map((s: any) => ({
      id: s.id,
      photo_url: s.photo_url,
      validated: s.validated,
      created_at: s.created_at,
      player: s.players[0], // flatten array
      task: s.tasks[0],     // flatten array
    }));

    setSubmissions(formatted);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  const validateSubmission = async (submissionId: string, valid: boolean) => {
    setValidating(submissionId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({ validated: valid })
        .eq('id', submissionId);

      if (error) throw error;

      if (valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo actualizar');
    } finally {
      setValidating(null);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(eventCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate check
    Animated.sequence([
      Animated.timing(copiedAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(copiedAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shareEvent = async () => {
    try {
      await Share.share({
        message: `🎉 Unite a mi evento "${eventTitle}"!\n\n📱 Código: ${eventCode}\n\nDescargá Rally y unite con este código.`,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando evento...</Text>
      </View>
    );
  }

  const pendingCount = submissions.filter((s) => !s.validated).length;
  const validatedCount = submissions.filter((s) => s.validated).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Trophy size={28} color="#6366f1" />
          <Text style={styles.title}>{eventTitle}</Text>
        </View>

        {/* Code Display with Copy */}
        <TouchableOpacity style={styles.codeContainer} onPress={copyCode}>
          <View style={styles.codeContent}>
            <Text style={styles.codeLabel}>Código del evento</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{eventCode}</Text>
              <Animated.View
                style={{
                  opacity: copiedAnim,
                  transform: [
                    {
                      scale: copiedAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                }}
              >
                <CheckCircle2 size={20} color="#10b981" />
              </Animated.View>
              <Animated.View
                style={{
                  opacity: copiedAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                }}
              >
                <Copy size={20} color="#6366f1" />
              </Animated.View>
            </View>
          </View>
          <Text style={styles.copyHint}>Tocá para copiar</Text>
        </TouchableOpacity>

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

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{submissions.length}</Text>
            <Text style={styles.statLabel}>📸 Total</Text>
          </View>
          <View style={[styles.statCard, styles.statCardPending]}>
            <Text style={[styles.statNumber, styles.statNumberPending]}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>⏳ Pendientes</Text>
          </View>
          <View style={[styles.statCard, styles.statCardValidated]}>
            <Text style={[styles.statNumber, styles.statNumberValidated]}>
              {validatedCount}
            </Text>
            <Text style={styles.statLabel}>✅ Validadas</Text>
          </View>
        </View>
      </View>

      <View style={styles.submissionsList}>
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Todavía no hay fotos</Text>
            <Text style={styles.emptySubtext}>
              Compartí el código {eventCode} con los jugadores y empezá el juego!
            </Text>
          </View>
        ) : (
          submissions.map((submission) => (
            <View key={submission.id} style={styles.submissionCard}>
              <View style={styles.submissionHeader}>
                <View>
                  <Text style={styles.playerName}>
                    👤 {submission.player.name}
                  </Text>
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
                    {submission.validated ? '✅ Validada' : '⏳ Pendiente'}
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
                    {validating === submission.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={20} color="#fff" />
                        <Text style={styles.validationButtonText}>
                          Aprobar
                        </Text>
                      </>
                    )}
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
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  codeContainer: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  codeContent: {
    gap: 4,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'monospace',
    letterSpacing: 4,
    flex: 1,
  },
  copyHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  leaderboardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  leaderboardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statCardPending: {
    backgroundColor: '#fef3c7',
  },
  statCardValidated: {
    backgroundColor: '#d1fae5',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statNumberPending: {
    color: '#f59e0b',
  },
  statNumberValidated: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
  submissionsList: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 16,
  },
  validatedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  validatedBadgeText: {
    color: '#10b981',
  },
  submissionImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
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
    padding: 14,
    borderRadius: 12,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  validationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});