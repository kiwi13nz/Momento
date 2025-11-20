import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Trophy, Medal, Award } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type PlayerScore = {
  player_id: string;
  player_name: string;
  validated_count: number;
  total_count: number;
};

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams();
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();

    // Subscribe to submission changes
    const channel = supabase
      .channel('leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
        },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLeaderboard = async () => {
    try {
      // Load event title
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', id)
        .single();

      if (event) setEventTitle(event.title);

      // Get all players in this event
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .eq('event_id', id);

      if (!players) return;

      // Get submission counts for each player
      const leaderboardData = await Promise.all(
        players.map(async (player) => {
          const { data: submissions } = await supabase
            .from('submissions')
            .select('id, validated, task:tasks!inner(event_id)')
            .eq('player_id', player.id)
            .eq('task.event_id', id);

          const validatedCount =
            submissions?.filter((s) => s.validated).length || 0;
          const totalCount = submissions?.length || 0;

          return {
            player_id: player.id,
            player_name: player.name,
            validated_count: validatedCount,
            total_count: totalCount,
          };
        })
      );

      // Sort by validated count (desc), then total count (desc)
      const sorted = leaderboardData.sort((a, b) => {
        if (b.validated_count !== a.validated_count) {
          return b.validated_count - a.validated_count;
        }
        return b.total_count - a.total_count;
      });

      setScores(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const getMedalIcon = (position: number) => {
    if (position === 0)
      return <Trophy size={24} color="#fbbf24" />;
    if (position === 1)
      return <Medal size={24} color="#94a3b8" />;
    if (position === 2)
      return <Award size={24} color="#d97706" />;
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tabla de Posiciones</Text>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
      </View>

      <ScrollView style={styles.leaderboard}>
        {scores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Todavía no hay jugadores</Text>
          </View>
        ) : (
          scores.map((score, index) => (
            <View
              key={score.player_id}
              style={[
                styles.scoreCard,
                index < 3 && styles.topThreeCard,
              ]}
            >
              <View style={styles.scoreLeft}>
                <View style={styles.positionContainer}>
                  {index < 3 ? (
                    getMedalIcon(index)
                  ) : (
                    <Text style={styles.positionNumber}>#{index + 1}</Text>
                  )}
                </View>
                <View style={styles.playerInfo}>
                  <Text
                    style={[
                      styles.playerName,
                      index === 0 && styles.firstPlaceName,
                    ]}
                  >
                    {score.player_name}
                  </Text>
                  <Text style={styles.submissionCount}>
                    {score.total_count}{' '}
                    {score.total_count === 1 ? 'foto' : 'fotos'}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreRight}>
                <Text
                  style={[
                    styles.scoreNumber,
                    index === 0 && styles.firstPlaceScore,
                  ]}
                >
                  {score.validated_count}
                </Text>
                <Text style={styles.scoreLabel}>validadas</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  eventTitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  leaderboard: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  topThreeCard: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  positionContainer: {
    width: 40,
    alignItems: 'center',
  },
  positionNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  firstPlaceName: {
    color: '#6366f1',
  },
  submissionCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  scoreRight: {
    alignItems: 'flex-end',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  firstPlaceScore: {
    color: '#fbbf24',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});