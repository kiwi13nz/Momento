-- Rally App Database Schema - UPDATED
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table (UPDATED with code column)
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE aNOT NULL, -- NEW: 6-char short code
  title TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, player_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_players_event_id ON players(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_player_id ON submissions(player_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all operations for now - adjust for production)
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true);
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all on submissions" ON submissions FOR ALL USING (true);

-- Migration: Add code column to existing events table (if upgrading)
-- Only run this if you already have the events table without the code column
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
-- UPDATE events SET code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)) WHERE code IS NULL;
-- ALTER TABLE events ALTER COLUMN code SET NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);

-- Storage bucket for submissions (Run this separately in Storage section)
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "submissions"
-- 3. Make it public
-- 4. Set the following policies:

-- INSERT policy for submissions bucket:
-- CREATE POLICY "Allow authenticated uploads"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'submissions');

-- SELECT policy for submissions bucket:
-- CREATE POLICY "Allow public access"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'submissions');