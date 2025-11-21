import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase, generateEventCode } from '@/lib/supabase';
import { saveOwnerEvent } from '@/lib/storage';

export default function CreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const addTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTasks([...tasks, '']);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const createEvent = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El evento necesita un nombre');
      return;
    }

    const validTasks = tasks.filter((t) => t.trim().length > 0);
    if (validTasks.length === 0) {
      Alert.alert('Error', 'Agregá al menos una tarea');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Generate unique event code
      let eventCode = generateEventCode();
      let codeExists = true;
      let attempts = 0;

      while (codeExists && attempts < 10) {
        const { data } = await supabase
          .from('events')
          .select('code')
          .eq('code', eventCode)
          .maybeSingle();

        if (!data) {
          codeExists = false;
        } else {
          eventCode = generateEventCode();
          attempts++;
        }
      }

      // Generate owner ID
      const ownerId = `owner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          code: eventCode,
          title: title.trim(),
          description: description.trim(),
          owner_id: ownerId,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create tasks
      const tasksToInsert = validTasks.map((task, index) => ({
        event_id: event.id,
        description: task.trim(),
        order_number: index,
      }));

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;

      // Save to AsyncStorage
      await saveOwnerEvent({
        eventId: event.id,
        eventCode: event.code,
        ownerId: ownerId,
        title: event.title,
        createdAt: new Date().toISOString(),
      });

      // Success animation
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

      // Navigate to event management
      setTimeout(() => {
        router.replace({
          pathname: '/event/[id]',
          params: { id: event.id, ownerId, code: event.code },
        });
      }, 300);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo crear el evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={28} color="#6366f1" style={styles.headerIcon} />
        <Text style={styles.title}>Crear Evento</Text>
        <Text style={styles.subtitle}>Dale vida a tu fiesta 🎉</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Evento</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Cumple de Facu"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="De qué se trata..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.tasksSection}>
          <Text style={styles.label}>Desafíos Fotográficos</Text>
          <Text style={styles.helpText}>
            ¿Qué fotos querés que suban los jugadores?
          </Text>

          {tasks.map((task, index) => (
            <View key={index} style={styles.taskRow}>
              <TextInput
                style={[styles.input, styles.taskInput]}
                value={task}
                onChangeText={(value) => updateTask(index, value)}
                placeholder={`Ej: Foto con alguien de amarillo`}
                placeholderTextColor="#9ca3af"
              />
              {tasks.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeTask(index)}
                  style={styles.removeButton}
                >
                  <X size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={addTask} style={styles.addButton}>
            <Plus size={20} color="#6366f1" />
            <Text style={styles.addButtonText}>Agregar desafío</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={createEvent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>🚀 Crear Evento</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  form: {
    padding: 20,
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
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tasksSection: {
    gap: 12,
  },
  taskRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  taskInput: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#eef2ff',
  },
  addButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
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
  createButtonText: {
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