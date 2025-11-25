// Complete type definitions for the entire app

export type Event = {
  id: string;
  code: string;
  title: string;
  description: string;
  owner_id: string;
  created_at: string;
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

export type Reaction = 'heart' | 'fire' | 'hundred';

// app/types.ts
export type Reactions = {
  heart?: number;
  fire?: number;
  hundred?: number;
  [key: string]: number | undefined;
};

export type Submission = {
  id: string;
  task_id: string;
  player_id: string;
  photo_url: string;
  reactions: Reactions;
  created_at: string;
};

export type Photo = {
  id: string;
  photo_url: string;
  created_at: string;
  reactions: Reactions;
  player: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    description: string;
  };
};

export type PlayerScore = {
  player_id: string;
  player_name: string;
  reaction_count: number;
  photo_count: number;
  rank: number;
};

export type EventWithDetails = {
  event: Event;
  tasks: Task[];
  player_count: number;
  photo_count: number;
};
