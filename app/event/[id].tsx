import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Share2, Trophy, Copy, Image as ImageIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase, closeEvent } from '@/lib/supabase';

export default function EventManagementScreen() {
  const params = useLocalSearchParams();
const id = params.id as string;
const ownerId = params.ownerId as string;
const code = params.code as string;
  const router = useRouter();
  const [eventTitle, setEventTitle] = useState('');
  const [eventCode, setEventCode] = useState(code as string || '');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPhotos: 0, totalPlayers: 0, completedTasks: 0 });
  const [copiedAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();
    const channel = supabase.channel('owner-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    try {
      const { data: event } = await supabase.from('events').select('title, owner_id, code').eq('id', id).single();
      if (!event || event.owner_id !== ownerId) {
        Alert.alert('Error', 'No tenés acceso a este evento');
        router.back();
        return;
      }

      setEventTitle(event.title);
      setEventCode(event.code);

      const { data: tasks } = await supabase.from('tasks').select('id').eq('event_id', id);
      const taskIds = tasks?.map((t) => t.id) || [];
      const { data: submissions } = await supabase.from('submissions').select('id, player_id, task_id').in('task_id', taskIds);
      const { data: players } = await supabase.from('players').select('id').eq('event_id', id);
      const uniqueTasksWithPhotos = new Set(submissions?.map((s) => s.task_id) || []).size;

      setStats({ totalPhotos: submissions?.length || 0, totalPlayers: players?.length || 0, completedTasks: uniqueTasksWithPhotos });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(eventCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(copiedAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(copiedAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const shareEvent = async () => {
    try {
      await Share.share({ message: `🎉 Unite a mi evento "${eventTitle}"!\n\n📱 Código: ${eventCode}\n\nDescargá Rally y unite con este código.` });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseEvent = async () => {
    Alert.alert('Cerrar Evento', '¿Querés cerrar el evento y declarar un ganador?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: players } = await supabase.from('players').select('id').eq('event_id', id);
            const { data: tasks } = await supabase.from('tasks').select('id').eq('event_id', id);
            const taskIds = tasks?.map((t) => t.id) || [];

            const leaderboard = await Promise.all(
              (players || []).map(async (player) => {
                const { data: submissions } = await supabase.from('submissions').select('id').eq('player_id', player.id).in('task_id', taskIds);
                return { playerId: player.id, count: submissions?.length || 0 };
              })
            );

            const winner = leaderboard.sort((a, b) => b.count - a.count)[0];
            await closeEvent(id as string, winner?.playerId);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({ pathname: '/winner/[id]', params: { id } });
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cerrar el evento');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Trophy size={28} color="#6366f1" />
          <Text style={styles.title}>{eventTitle}</Text>
        </View>

        <TouchableOpacity style={styles.codeContainer} onPress={copyCode}>
          <View style={styles.codeContent}>
            <Text style={styles.codeLabel}>Código del evento</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{eventCode}</Text>
              <Animated.View style={{ opacity: copiedAnim, position: 'absolute', right: 0, transform: [{ scale: copiedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
                <CheckCircle2 size={20} color="#10b981" />
              </Animated.View>
              <Animated.View style={{ opacity: copiedAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), position: 'absolute', right: 0 }}>
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
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
            <Text style={styles.statLabel}>📸 Fotos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPlayers}</Text>
            <Text style={styles.statLabel}>👥 Jugadores</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>✅ Tasks</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push({ pathname: '/feed/[id]', params: { id, ownerId, code } })}>
            <ImageIcon size={20} color="#6366f1" />
            <Text style={styles.quickActionText}>Ver Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push({ pathname: '/leaderboard/[id]', params: { id } })}>
            <Trophy size={20} color="#6366f1" />
            <Text style={styles.quickActionText}>Ranking</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCloseEvent}>
          <Text style={styles.closeButtonText}>🏁 Cerrar Evento y Declarar Ganador</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', flex: 1 },
  codeContainer: { backgroundColor: '#eef2ff', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#6366f1', borderStyle: 'dashed' },
  codeContent: { gap: 4 },
  codeLabel: { fontSize: 12, fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1 },
  codeRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  codeText: { fontSize: 32, fontWeight: 'bold', color: '#111827', fontFamily: 'monospace', letterSpacing: 4, flex: 1 },
  copyHint: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, backgroundColor: '#eef2ff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1' },
  shareButtonText: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#eef2ff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1' },
  quickActionText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  content: { padding: 20, gap: 16 },
  closeButton: { padding: 20, backgroundColor: '#6366f1', borderRadius: 12, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  closeButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});