import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Event = {
  id: string;
  code: string; // NEW: Short 6-char code
  title: string;
  description: string;
  owner_id: string;
  created_at: string;
  tasks: Task[];
};

export type Task = {
  id: string;
  event_id: string;
  description: string;
  order_number: number;
};

export type Player = {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
};

export type Submission = {
  id: string;
  task_id: string;
  player_id: string;
  photo_url: string;
  validated: boolean;
  created_at: string;
};

// Generate short 6-char event code
export const generateEventCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin confusión: no O/0, I/1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Photo upload success messages (random dopamine hits)
export const getUploadSuccessMessage = (taskDescription: string): string => {
  const isGroupPhoto = taskDescription.toLowerCase().includes('grupo') || 
                       taskDescription.toLowerCase().includes('todos');
  const isSelfie = taskDescription.toLowerCase().includes('selfie');
  const hasColor = /amarillo|rojo|azul|verde|blanco|negro/i.test(taskDescription);
  
  const groupMessages = [
    '🔥 Esa foto grupal está ON FIRE',
    '👑 El squad se ve impecable',
    '💯 Foto del año, sin dudas',
    '⚡ El grupo está que rompe todo',
  ];
  
  const selfieMessages = [
    '🌟 Uff, qué facha tenés',
    '💫 Selfie aprobada por el CEO de las selfies',
    '✨ Te va a venir a buscar Pancho Dotto con esa foto',
    '🎯 Cara de portada de revista',
  ];
  
  const colorMessages = [
    '🎨 Encontraste el color! Mirá vos',
    '👀 Buen ojo para los colores',
    '🌈 Detective cromático nivel experto',
  ];
  
  const genericMessages = [
    '🎊 Foto subida! Sos imparable',
    '⚡ Boom! Otra más en la bolsa',
    '🚀 Vas como piña, seguí así',
    '💪 Estás dominando este juego',
    '🏆 Otra fotito más para la colección',
  ];
  
  if (isGroupPhoto) {
    return groupMessages[Math.floor(Math.random() * groupMessages.length)];
  }
  if (isSelfie) {
    return selfieMessages[Math.floor(Math.random() * selfieMessages.length)];
  }
  if (hasColor) {
    return colorMessages[Math.floor(Math.random() * colorMessages.length)];
  }
  
  return genericMessages[Math.floor(Math.random() * genericMessages.length)];
};