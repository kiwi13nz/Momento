import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

export default function JoinEventScreen() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const formatCode = (text: string) => {
    // Auto-uppercase and limit to 6 chars
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  const joinEvent = async () => {
    const trimmedCode = eventCode.trim();
    const trimmedName = playerName.trim();

    if (!trimmedCode || !trimmedName) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }

    if (trimmedCode.length !== 6) {
      Alert.alert('Error', 'El código debe tener 6 caracteres');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Check if event exists by code
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, code')
        .eq('code', trimmedCode)
        .maybeSingle();

      if (eventError || !event) {
        Alert.alert('Error', 'Evento no encontrado. Revisá el código 🤔');
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Check for duplicate names (case-insensitive)
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('name')
        .eq('event_id', event.id);

      const nameExists = existingPlayers?.some(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (nameExists) {
        Alert.alert(
          'Nombre en uso',
          'Ya hay alguien con ese nombre en el evento. Probá con otro! 😅'
        );
        setLoading(false);
        return;
      }

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          event_id: event.id,
          name: trimmedName,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate button
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      // Navigate to player view
      setTimeout(() => {
        router.replace({
          pathname: '/play/[id]',
          params: { id: event.id, playerId: player.id },
        });
      }, 300);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo unir al evento');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Users size={40} color="#6366f1" />
          <Zap
            size={24}
            color="#fbbf24"
            style={styles.zapIcon}
          />
        </View>
        <Text style={styles.title}>Unirse a Evento</Text>
        <Text style={styles.subtitle}>
          Ingresá el código y a jugar! 🎮
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Código del Evento</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={eventCode}
            onChangeText={(text) => setEventCode(formatCode(text))}
            placeholder="XY3K9P"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            maxLength={6}
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            6 caracteres (te lo pasó el organizador)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tu Nombre</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Ej: Facundo"
            placeholderTextColor="#9ca3af"
            maxLength={30}
          />
          <Text style={styles.helperText}>
            Tiene que ser único en este evento
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.joinButton, loading && styles.disabledButton]}
            onPress={joinEvent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>🎯 Unirme al Evento</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  header: {
    marginTop: 80,
    marginBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  zapIcon: {
    position: 'absolute',
    top: -8,
    right: -12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  joinButton: {
    backgroundColor: '#6366f1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});