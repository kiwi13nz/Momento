import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react-native';
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
  const [fadeAnim] = useState(new Animated.Value(0));

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

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
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
        <Text style={styles.loadingText}>Cargando posiciones...</Text>
      </View>
    );
  }

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={24} color="#6366f1" />
          <Text style={styles.title}>Tabla de Posiciones</Text>
        </View>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
      </View>

      <ScrollView style={styles.leaderboard}>
        {scores.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Todavía no hay jugadores</Text>
            <Text style={styles.emptySubtext}>
              Los jugadores aparecerán acá cuando se unan al evento
            </Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Top 3 Podium */}
            {scores.length >= 3 && (
              <View style={styles.podium}>
                {/* Second Place */}
                <View style={[styles.podiumCard, styles.secondPlaceCard]}>
                  <Medal size={32} color="#94a3b8" />
                  <Text style={styles.podiumName}>
                    {scores[1].player_name}
                  </Text>
                  <Text style={styles.podiumScore}>
                    {scores[1].validated_count}
                  </Text>
                  <Text style={styles.podiumLabel}>validadas</Text>
                </View>

                {/* First Place */}
                <View style={[styles.podiumCard, styles.firstPlaceCard]}>
                  <Trophy size={40} color="#fbbf24" />
                  <Text style={[styles.podiumName, styles.firstPlaceName]}>
                    {scores[0].player_name}
                  </Text>
                  <Text style={[styles.podiumScore, styles.firstPlaceScore]}>
                    {scores[0].validated_count}
                  </Text>
                  <Text style={styles.podiumLabel}>validadas</Text>
                </View>

                {/* Third Place */}
                <View style={[styles.podiumCard, styles.thirdPlaceCard]}>
                  <Award size={28} color="#d97706" />
                  <Text style={styles.podiumName}>
                    {scores[2].player_name}
                  </Text>
                  <Text style={styles.podiumScore}>
                    {scores[2].validated_count}
                  </Text>
                  <Text style={styles.podiumLabel}>validadas</Text>
                </View>
              </View>
            )}

            {/* Full List */}
            <View style={styles.scoresList}>
              <Text style={styles.scoresListTitle}>
                Todos los Jugadores
              </Text>
              {scores.map((score, index) => (
                <View
                  key={score.player_id}
                  style={[
                    styles.scoreCard,
                    index < 3 && styles.topThreeCard,
                    getPositionStyle(index),
                  ]}
                >
                  <View style={styles.scoreLeft}>
                    <View style={styles.positionContainer}>
                      {index < 3 ? (
                        getMedalIcon(index)
                      ) : (
                        <Text style={styles.positionNumber}>
                          #{index + 1}
                        </Text>
                      )}
                    </View>
                    <View style={styles.playerInfo}>
                      <Text
                        style={[
                          styles.playerName,
                          index === 0 && styles.firstPlaceNameText,
                        ]}
                      >
                        {score.player_name}
                      </Text>
                      <Text style={styles.submissionCount}>
                        {score.total_count}{' '}
                        {score.total_count === 1 ? 'foto' : 'fotos'} subidas
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreRight}>
                    <Text
                      style={[
                        styles.scoreNumber,
                        index === 0 && styles.firstPlaceScoreText,
                      ]}
                    >
                      {score.validated_count}
                    </Text>
                    <Text style={styles.scoreLabel}>validadas</Text>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  eventTitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  leaderboard: {
    flex: 1,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  podiumCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    flex: 1,
  },
  firstPlaceCard: {
    borderColor: '#fbbf24',
    marginTop: -20,
    paddingVertical: 20,
  },
  secondPlaceCard: {
    borderColor: '#94a3b8',
    marginTop: 0,
  },
  thirdPlaceCard: {
    borderColor: '#d97706',
    marginTop: 10,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  firstPlaceName: {
    fontSize: 16,
  },
  podiumScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  firstPlaceScore: {
    fontSize: 40,
    color: '#fbbf24',
  },
  podiumLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  scoresList: {
    padding: 16,
    gap: 12,
  },
  scoresListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  topThreeCard: {
    borderWidth: 2,
  },
  firstPlace: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  secondPlace: {
    borderColor: '#94a3b8',
    backgroundColor: '#f8fafc',
  },
  thirdPlace: {
    borderColor: '#d97706',
    backgroundColor: '#fff7ed',
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  positionContainer: {
    width: 44,
    alignItems: 'center',
  },
  positionNumber: {
    fontSize: 18,
    fontWeight: '700',
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
  firstPlaceNameText: {
    color: '#f59e0b',
  },
  submissionCount: {
    fontSize: 13,
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
  firstPlaceScoreText: {
    color: '#fbbf24',
    fontSize: 36,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});