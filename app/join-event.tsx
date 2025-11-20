import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function JoinEventScreen() {
  const router = useRouter();
  const [eventId, setEventId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);

  const joinEvent = async () => {
    if (!eventId.trim() || !playerName.trim()) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }

    setLoading(true);

    try {
      // Check if event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title')
        .eq('id', eventId.trim())
        .single();

      if (eventError || !event) {
        Alert.alert('Error', 'Evento no encontrado');
        setLoading(false);
        return;
      }

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          event_id: event.id,
          name: playerName.trim(),
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Navigate to player view
      router.replace({
        pathname: '/play/[id]',
        params: { id: event.id, playerId: player.id },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo unir al evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unirse a Evento</Text>
        <Text style={styles.subtitle}>
          Ingresá el código del evento y tu nombre
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Código del Evento</Text>
          <TextInput
            style={styles.input}
            value={eventId}
            onChangeText={setEventId}
            placeholder="Ej: abc123..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tu Nombre</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Ej: Facundo"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.disabledButton]}
          onPress={joinEvent}
          disabled={loading}
        >
          <Text style={styles.joinButtonText}>
            {loading ? 'Uniéndote...' : 'Unirme'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
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
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  joinButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
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