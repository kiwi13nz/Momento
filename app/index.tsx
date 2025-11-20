import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, Users } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rally</Text>
        <Text style={styles.subtitle}>Gamifica tus eventos</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/create-event')}
        >
          <Trophy size={32} color="#fff" />
          <Text style={styles.buttonText}>Crear Evento</Text>
          <Text style={styles.buttonSubtext}>Soy el organizador</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/join-event')}
        >
          <Users size={32} color="#6366f1" />
          <Text style={[styles.buttonText, styles.secondaryText]}>
            Unirme a Evento
          </Text>
          <Text style={[styles.buttonSubtext, styles.secondarySubtext]}>
            Tengo un código
          </Text>
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
    marginBottom: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryText: {
    color: '#6366f1',
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  secondarySubtext: {
    color: '#a5b4fc',
  },
});