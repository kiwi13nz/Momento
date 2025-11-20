import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function CreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    setTasks([...tasks, '']);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
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

    try {
      // Generate owner ID
      const ownerId = `owner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
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

      // Navigate to event management
      router.replace({
        pathname: '/event/[id]',
        params: { id: event.id, ownerId },
      });
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
        <Text style={styles.title}>Crear Evento</Text>
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
          <Text style={styles.label}>Tareas / Desafíos</Text>
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
            <Text style={styles.addButtonText}>Agregar tarea</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.disabledButton]}
          onPress={createEvent}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creando...' : 'Crear Evento'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
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
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
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
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
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