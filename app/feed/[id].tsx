import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Flame, Award, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedItem = {
  id: string;
  photo_url: string;
  created_at: string;
  reactions: Record<string, number>;
  player: { id: string; name: string };
  task: { description: string };
};

export default function FeedScreen() {
  const params = useLocalSearchParams();
const id = params.id as string;
const playerId = params.playerId as string;
const ownerId = params.ownerId as string;
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const isOwner = !!ownerId;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFeed();

    const interval = setInterval(loadFeed, 5000);

    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadFeed)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFeed = async () => {
    try {
      const { data: eventTasks } = await supabase.from('tasks').select('id').eq('event_id', id);
      const taskIds = eventTasks?.map((t) => t.id) || [];

      if (taskIds.length === 0) {
        setFeed([]);
        setLoading(false);
        return;
      }

      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, photo_url, created_at, reactions, task_id, player_id')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false });

      const formatted = await Promise.all(
        (submissions || []).map(async (s) => {
          const { data: player } = await supabase.from('players').select('id, name').eq('id', s.player_id).single();
          const { data: task } = await supabase.from('tasks').select('description').eq('id', s.task_id).single();

          return {
            id: s.id,
            photo_url: s.photo_url,
            created_at: s.created_at,
            reactions: s.reactions || {},
            player: { id: player?.id || '', name: player?.name || 'Unknown' },
            task: { description: task?.description || 'Unknown' },
          };
        })
      );

      setFeed(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < feed.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) {
          goToPrev();
        } else if (gestureState.dx < -100) {
          goToNext();
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const addReaction = async (reactionType: string) => {
    if (!isOwner) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const submission = feed[currentIndex];
    const currentReactions = submission.reactions || {};
    const newCount = (currentReactions[reactionType] || 0) + 1;
    const updatedReactions = { ...currentReactions, [reactionType]: newCount };

    try {
      await supabase.from('submissions').update({ reactions: updatedReactions }).eq('id', submission.id);
      setFeed((prev) => prev.map((item) => (item.id === submission.id ? { ...item, reactions: updatedReactions } : item)));
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

  if (feed.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay fotos todavía</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentItem = feed[currentIndex];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <X size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={{ uri: currentItem.photo_url }} style={styles.image} resizeMode="contain" />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.playerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{currentItem.player.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.playerName}>{currentItem.player.name}</Text>
              <Text style={styles.taskDescription}>"{currentItem.task.description}"</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {isOwner ? (
            <View style={styles.reactionButtons}>
              <TouchableOpacity style={styles.reactionButton} onPress={() => addReaction('heart')}>
                <Heart size={32} color="#ef4444" fill={currentItem.reactions.heart ? '#ef4444' : 'transparent'} />
                {currentItem.reactions.heart > 0 && <Text style={styles.reactionCount}>{currentItem.reactions.heart}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.reactionButton} onPress={() => addReaction('fire')}>
                <Flame size={32} color="#f59e0b" fill={currentItem.reactions.fire ? '#f59e0b' : 'transparent'} />
                {currentItem.reactions.fire > 0 && <Text style={styles.reactionCount}>{currentItem.reactions.fire}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.reactionButton} onPress={() => addReaction('hundred')}>
                <Award size={32} color="#6366f1" fill={currentItem.reactions.hundred ? '#6366f1' : 'transparent'} />
                {currentItem.reactions.hundred > 0 && <Text style={styles.reactionCount}>{currentItem.reactions.hundred}</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.reactionsDisplay}>
              {currentItem.reactions.heart > 0 && (
                <View style={styles.reactionChip}>
                  <Heart size={20} color="#ef4444" fill="#ef4444" />
                  <Text style={styles.reactionChipText}>{currentItem.reactions.heart}</Text>
                </View>
              )}
              {currentItem.reactions.fire > 0 && (
                <View style={styles.reactionChip}>
                  <Flame size={20} color="#f59e0b" fill="#f59e0b" />
                  <Text style={styles.reactionChipText}>{currentItem.reactions.fire}</Text>
                </View>
              )}
              {currentItem.reactions.hundred > 0 && (
                <View style={styles.reactionChip}>
                  <Award size={20} color="#6366f1" fill="#6366f1" />
                  <Text style={styles.reactionChipText}>{currentItem.reactions.hundred}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.progressBar}>
          {feed.map((_, idx) => (
            <View key={idx} style={[styles.progressSegment, idx === currentIndex && styles.progressSegmentActive]} />
          ))}
        </View>

        {currentIndex > 0 && (
          <TouchableOpacity style={styles.navLeft} onPress={goToPrev}>
            <ChevronLeft size={40} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {currentIndex < feed.length - 1 && (
          <TouchableOpacity style={styles.navRight} onPress={goToNext}>
            <ChevronRight size={40} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        <Text style={styles.counter}>
          {currentIndex + 1} / {feed.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  emptyText: { fontSize: 20, color: '#fff', marginBottom: 20 },
  backButton: { padding: 16, backgroundColor: '#6366f1', borderRadius: 12 },
  backButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  closeButton: { position: 'absolute', top: 60, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  header: { position: 'absolute', top: 60, left: 20, right: 60 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  playerName: { fontSize: 18, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  taskDescription: { fontSize: 14, color: '#fff', fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  footer: { position: 'absolute', bottom: 100, left: 0, right: 0, paddingHorizontal: 20 },
  reactionButtons: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  reactionButton: { alignItems: 'center', gap: 4 },
  reactionCount: { fontSize: 16, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  reactionsDisplay: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  reactionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20 },
  reactionChipText: { fontSize: 14, fontWeight: '700', color: '#111' },
  progressBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressSegmentActive: { backgroundColor: '#fff' },
  navLeft: { position: 'absolute', left: 20, top: '50%', marginTop: -20 },
  navRight: { position: 'absolute', right: 20, top: '50%', marginTop: -20 },
  counter: { position: 'absolute', bottom: 60, alignSelf: 'center', fontSize: 16, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});