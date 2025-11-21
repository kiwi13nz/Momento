import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Trophy, Users, Sparkles, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getOwnerEvents, OwnerEvent } from '@/lib/storage';
import React from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const [ownerEvents, setOwnerEvents] = useState<OwnerEvent[]>([]);
  const [scaleAnim] = useState(new Animated.Value(1));

  useFocusEffect(
    React.useCallback(() => {
      loadOwnerEvents();
    }, [])
  );

  const loadOwnerEvents = async () => {
    const events = await getOwnerEvents();
    setOwnerEvents(events);
  };

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    action();
  };

  const goToEvent = (event: OwnerEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/event/[id]',
      params: {
        id: event.eventId,
        ownerId: event.ownerId,
        code: event.eventCode,
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Sparkles size={32} color="#6366f1" />
        </View>
        <Text style={styles.title}>Rally</Text>
        <Text style={styles.subtitle}>Gamificá tus eventos 🎉</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handlePress(() => router.push('/create-event'))}
          activeOpacity={0.8}
        >
          <Trophy size={32} color="#fff" />
          <Text style={styles.buttonText}>Crear Evento</Text>
          <Text style={styles.buttonSubtext}>Soy el organizador</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => handlePress(() => router.push('/join-event'))}
          activeOpacity={0.8}
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

      {/* My Events Section */}
      {ownerEvents.length > 0 && (
        <View style={styles.myEventsSection}>
          <Text style={styles.myEventsTitle}>📋 Mis Eventos</Text>
          <View style={styles.eventsList}>
            {ownerEvents.map((event) => (
              <TouchableOpacity
                key={event.eventId}
                style={styles.eventCard}
                onPress={() => goToEvent(event)}
                activeOpacity={0.7}
              >
                <View style={styles.eventCardContent}>
                  <View style={styles.eventCardLeft}>
                    <Text style={styles.eventCardTitle}>{event.title}</Text>
                    <Text style={styles.eventCardCode}>
                      Código: {event.eventCode}
                    </Text>
                  </View>
                  <ChevronRight size={24} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Creá desafíos fotográficos y dejá que los invitados compitan 📸
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    marginTop: 80,
    marginBottom: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    paddingHorizontal: 20,
    gap: 16,
  },
  button: {
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryText: {
    color: '#6366f1',
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  secondarySubtext: {
    color: '#a5b4fc',
  },
  myEventsSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  myEventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventCardLeft: {
    flex: 1,
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventCardCode: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});