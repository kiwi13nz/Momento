import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Event = {
  id: string;
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