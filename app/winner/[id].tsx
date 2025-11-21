import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Share2, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase, getWinner } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WinnerScreen() {
  const params = useLocalSearchParams();
const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [winner, setWinner] = useState<any>(null);
  const [confettiAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadWinner();
  }, []);

  const loadWinner = async () => {
    try {
      const { data: event } = await supabase.from('events').select('title').eq('id', id).single();
      if (event) setEventTitle(event.title);

      const winnerData = await getWinner(id as string);
      setWinner(winnerData);

      // Confetti animation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(confettiAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, delay: 300 }),
      ]).start();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const shareResult = async () => {
    try {
      await Share.share({
        message: `🎉 Evento "${eventTitle}" finalizado!\n\n👑 Ganador: ${winner.player.name}\n${winner.photoCount}/${winner.totalTasks} fotos completadas\n\n#RallyApp`,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  if (!winner) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró el ganador</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Confetti particles */}
      <Animated.View style={[styles.confettiContainer, { opacity: confettiAnim }]}>
        {[...Array(30)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#fbbf24', '#6366f1', '#ef4444', '#10b981'][Math.floor(Math.random() * 4)],
                transform: [
                  {
                    translateY: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 800],
                    }),
                  },
                  {
                    rotate: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${Math.random() * 720}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.content}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        <Text style={styles.subtitle}>Evento Finalizado 🎊</Text>

        <Animated.View style={[styles.winnerCard, { transform: [{ scale: scaleAnim }] }]}>
          <Trophy size={80} color="#fbbf24" />
          <Text style={styles.winnerLabel}>GANADOR</Text>
          <View style={styles.winnerAvatar}>
            <Text style={styles.winnerAvatarText}>{winner.player.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.winnerName}>{winner.player.name}</Text>
          <Text style={styles.winnerScore}>
            {winner.photoCount}/{winner.totalTasks} tareas completadas
          </Text>
          <Text style={styles.winnerBadge}>🏆 MVP del Evento</Text>
        </Animated.View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareButton} onPress={shareResult}>
            <Share2 size={24} color="#fff" />
            <Text style={styles.shareButtonText}>Compartir Resultado</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryButton} onPress={() => router.push({ pathname: '/feed/[id]', params: { id } })}>
            <Download size={24} color="#6366f1" />
            <Text style={styles.galleryButtonText}>Ver Galería</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>Volver al Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', padding: 20 },
  errorText: { fontSize: 18, color: '#fff', marginBottom: 20 },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 2 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  eventTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#9ca3af', textAlign: 'center', marginBottom: 40 },
  winnerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center', gap: 16, width: SCREEN_WIDTH - 40, maxWidth: 400, shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  winnerLabel: { fontSize: 14, fontWeight: '800', color: '#fbbf24', letterSpacing: 2, textTransform: 'uppercase' },
  winnerAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fbbf24' },
  winnerAvatarText: { fontSize: 48, fontWeight: '800', color: '#fff' },
  winnerName: { fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center' },
  winnerScore: { fontSize: 18, color: '#6b7280', textAlign: 'center' },
  winnerBadge: { fontSize: 16, fontWeight: '700', color: '#fbbf24', backgroundColor: '#fffbeb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  actions: { marginTop: 40, width: '100%', gap: 16 },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, backgroundColor: '#6366f1', borderRadius: 12, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  shareButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  galleryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1' },
  galleryButtonText: { fontSize: 18, fontWeight: '700', color: '#6366f1' },
  backButton: { padding: 16, alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#9ca3af' },
});