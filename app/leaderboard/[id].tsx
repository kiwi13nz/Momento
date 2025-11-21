import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Medal, Award, Sparkles, Camera, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type PlayerScore = {
  player_id: string;
  player_name: string;
  completed_count: number;
  total_tasks: number;
};

export default function LeaderboardScreen() {
  const params = useLocalSearchParams();
const id = params.id as string;
const playerId = params.playerId as string;
const ownerId = params.ownerId as string;
  const router = useRouter();
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5000);
    const channel = supabase.channel('leaderboard').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadLeaderboard).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data: event } = await supabase.from('events').select('title').eq('id', id).single();
      if (event) setEventTitle(event.title);

      const { data: tasks } = await supabase.from('tasks').select('id').eq('event_id', id);
      const totalTasks = tasks?.length || 0;
      const { data: players } = await supabase.from('players').select('id, name').eq('event_id', id);
      if (!players) return;

      const taskIds = tasks?.map((t) => t.id) || [];

      const leaderboardData = await Promise.all(
        players.map(async (player) => {
          const { data: submissions } = await supabase.from('submissions').select('id, task_id').eq('player_id', player.id).in('task_id', taskIds);
          const completedCount = submissions?.length || 0;
          return { player_id: player.id, player_name: player.name, completed_count: completedCount, total_tasks: totalTasks };
        })
      );

      const sorted = leaderboardData.sort((a, b) => b.completed_count - a.completed_count);
      setScores(sorted);

      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy size={28} color="#fbbf24" />;
    if (position === 1) return <Medal size={28} color="#94a3b8" />;
    if (position === 2) return <Award size={28} color="#d97706" />;
    return null;
  };

  const getPositionStyle = (position: number) => {
    if (position === 0) return styles.firstPlace;
    if (position === 1) return styles.secondPlace;
    if (position === 2) return styles.thirdPlace;
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isPlayer = !!playerId;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={24} color="#6366f1" />
          <Text style={styles.title}>Ranking Live</Text>
        </View>
        <Text style={styles.eventTitle}>{eventTitle}</Text>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.back()}>
            <Camera size={18} color="#6366f1" />
            <Text style={styles.quickActionText}>Tareas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push({ pathname: '/feed/[id]', params: isPlayer ? { id, playerId } : { id, ownerId, code: (useLocalSearchParams() as any).code } })}>
            <ImageIcon size={18} color="#6366f1" />
            <Text style={styles.quickActionText}>Feed</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.leaderboard} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {scores.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Todavía no hay jugadores</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {scores.length >= 3 && (
              <View style={styles.podium}>
                <View style={[styles.podiumCard, styles.secondPlaceCard]}>
                  <Medal size={32} color="#94a3b8" />
                  <Text style={styles.podiumName}>{scores[1].player_name}</Text>
                  <Text style={styles.podiumScore}>{scores[1].completed_count}</Text>
                  <Text style={styles.podiumLabel}>de {scores[1].total_tasks}</Text>
                </View>
                <View style={[styles.podiumCard, styles.firstPlaceCard]}>
                  <Trophy size={40} color="#fbbf24" />
                  <Text style={[styles.podiumName, styles.firstPlaceName]}>{scores[0].player_name}</Text>
                  <Text style={[styles.podiumScore, styles.firstPlaceScore]}>{scores[0].completed_count}</Text>
                  <Text style={styles.podiumLabel}>de {scores[0].total_tasks}</Text>
                </View>
                <View style={[styles.podiumCard, styles.thirdPlaceCard]}>
                  <Award size={28} color="#d97706" />
                  <Text style={styles.podiumName}>{scores[2].player_name}</Text>
                  <Text style={styles.podiumScore}>{scores[2].completed_count}</Text>
                  <Text style={styles.podiumLabel}>de {scores[2].total_tasks}</Text>
                </View>
              </View>
            )}

            <View style={styles.scoresList}>
              <Text style={styles.scoresListTitle}>Todos los Jugadores</Text>
              {scores.map((score, index) => (
                <View key={score.player_id} style={[styles.scoreCard, index < 3 && styles.topThreeCard, getPositionStyle(index), isPlayer && score.player_id === playerId && styles.myScoreCard]}>
                  <View style={styles.scoreLeft}>
                    <View style={styles.positionContainer}>{index < 3 ? getMedalIcon(index) : <Text style={styles.positionNumber}>#{index + 1}</Text>}</View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, index === 0 && styles.firstPlaceNameText]}>
                        {score.player_name}
                        {isPlayer && score.player_id === playerId && ' (Vos)'}
                      </Text>
                      <View style={styles.progressBarSmall}>
                        <View style={[styles.progressFillSmall, { width: `${(score.completed_count / score.total_tasks) * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.scoreRight}>
                    <Text style={[styles.scoreNumber, index === 0 && styles.firstPlaceScoreText]}>
                      {score.completed_count}/{score.total_tasks}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  eventTitle: { fontSize: 16, color: '#6b7280', marginBottom: 12 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#eef2ff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1' },
  quickActionText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  leaderboard: { flex: 1 },
  emptyState: { padding: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', padding: 20, gap: 12 },
  podiumCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 2, flex: 1 },
  firstPlaceCard: { borderColor: '#fbbf24', marginTop: -20, paddingVertical: 20 },
  secondPlaceCard: { borderColor: '#94a3b8', marginTop: 0 },
  thirdPlaceCard: { borderColor: '#d97706', marginTop: 10 },
  podiumName: { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'center' },
  firstPlaceName: { fontSize: 16 },
  podiumScore: { fontSize: 32, fontWeight: 'bold', color: '#6366f1' },
  firstPlaceScore: { fontSize: 40, color: '#fbbf24' },
  podiumLabel: { fontSize: 11, color: '#6b7280' },
  scoresList: { padding: 16, gap: 12 },
  scoresListTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  scoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  topThreeCard: { borderWidth: 2 },
  firstPlace: { borderColor: '#fbbf24', backgroundColor: '#fffbeb' },
  secondPlace: { borderColor: '#94a3b8', backgroundColor: '#f8fafc' },
  thirdPlace: { borderColor: '#d97706', backgroundColor: '#fff7ed' },
  myScoreCard: { borderColor: '#6366f1', borderWidth: 3, backgroundColor: '#eef2ff' },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  positionContainer: { width: 44, alignItems: 'center' },
  positionNumber: { fontSize: 18, fontWeight: '700', color: '#6b7280' },
  playerInfo: { flex: 1, gap: 6 },
  playerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  firstPlaceNameText: { color: '#f59e0b' },
  progressBarSmall: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFillSmall: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  scoreRight: { alignItems: 'flex-end' },
  scoreNumber: { fontSize: 24, fontWeight: 'bold', color: '#374151' },
  firstPlaceScoreText: { color: '#fbbf24', fontSize: 28 },
});