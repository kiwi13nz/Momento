import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Camera, CheckCircle2 } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import type { Task } from '@/types';

interface TaskPromptProps {
  tasks: Task[];
  completedTaskIds: string[];
  onTaskSelect: (task: Task) => void;
  onClose: () => void;
}

export function TaskPrompt({ tasks, completedTaskIds, onTaskSelect, onClose }: TaskPromptProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Task</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {tasks.map((task, index) => {
          const isCompleted = completedTaskIds.includes(task.id);

          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
              onPress={() => !isCompleted && onTaskSelect(task)}
              disabled={isCompleted}
              activeOpacity={0.7}
            >
              <View style={styles.taskNumber}>
                {isCompleted ? (
                  <CheckCircle2 size={20} color={colors.success} />
                ) : (
                  <Text style={styles.taskNumberText}>#{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.taskDescription, isCompleted && styles.taskDescriptionCompleted]}>
                {task.description}
              </Text>
              {!isCompleted && <Camera size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  title: {
    ...typography.headline,
    color: colors.text,
  },
  closeButton: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  list: {
    flex: 1,
    padding: spacing.m,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardCompleted: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.6,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskNumberText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  taskDescription: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  taskDescriptionCompleted: {
    color: colors.textSecondary,
  },
});