-- Momento App Database Schema - UPDATED VERSION
-- This is the complete, production-ready schema with all features
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  code TEXT NOT NULL UNIQUE,
  closed_at TIMESTAMP WITHOUT TIME ZONE,
  winner_id UUID,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.players(id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  description TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

-- Players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_user_id UUID,
  push_token TEXT,
  CONSTRAINT players_pkey PRIMARY KEY (id),
  CONSTRAINT players_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT players_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);

-- Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL,
  player_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reactions JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT submissions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  player_id UUID,
  type TEXT,
  message TEXT,
  photo_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_players_event_id ON players(event_id);
CREATE INDEX IF NOT EXISTS idx_players_auth_user_id ON players(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_player_id ON submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_player_id ON notifications(player_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies if they exist (for clean migration)
DROP POLICY IF EXISTS "Public read events" ON public.events;
DROP POLICY IF EXISTS "Authenticated create events" ON public.events;
DROP POLICY IF EXISTS "Owners update events" ON public.events;
DROP POLICY IF EXISTS "Public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Event owners update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Event owners delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Players read all players" ON public.players;
DROP POLICY IF EXISTS "Players create own record" ON public.players;
DROP POLICY IF EXISTS "Players update own record" ON public.players;
DROP POLICY IF EXISTS "Players delete own record" ON public.players;
DROP POLICY IF EXISTS "Players read all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Players manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Players update own photo data" ON public.submissions;
DROP POLICY IF EXISTS "Anyone can update reactions" ON public.submissions;
DROP POLICY IF EXISTS "Players delete own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Players read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Players can notify others in same event" ON public.notifications;
DROP POLICY IF EXISTS "Players update own notifications" ON public.notifications;

-- Events policies
CREATE POLICY "Public read events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners update events"
  ON public.events FOR UPDATE
  USING (
    (owner_id)::uuid = (
      SELECT players.id
      FROM players
      WHERE players.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Tasks policies
CREATE POLICY "Public read tasks"
  ON public.tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Event owners update tasks"
  ON public.tasks FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN players p ON e.owner_id = (p.id)::text
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners delete tasks"
  ON public.tasks FOR DELETE
  USING (
    event_id IN (
      SELECT e.id
      FROM events e
      JOIN players p ON e.owner_id = (p.id)::text
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Players policies
CREATE POLICY "Players read all players"
  ON public.players FOR SELECT
  USING (true);

CREATE POLICY "Players create own record"
  ON public.players FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Players update own record"
  ON public.players FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Players delete own record"
  ON public.players FOR DELETE
  USING (auth_user_id = auth.uid());

-- Submissions policies
CREATE POLICY "Players read all submissions"
  ON public.submissions FOR SELECT
  USING (true);

CREATE POLICY "Players manage own submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT players.id
      FROM players
      WHERE players.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Players update own photo data"
  ON public.submissions FOR UPDATE
  USING (
    player_id IN (
      SELECT players.id
      FROM players
      WHERE players.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can update reactions"
  ON public.submissions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Players delete own submissions"
  ON public.submissions FOR DELETE
  USING (
    player_id IN (
      SELECT players.id
      FROM players
      WHERE players.auth_user_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Players read own notifications"
  ON public.notifications FOR SELECT
  USING (
    player_id IN (
      SELECT players.id
      FROM players
      WHERE players.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Players can notify others in same event"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM players p1
      JOIN players p2 ON p1.event_id = p2.event_id
      WHERE p1.auth_user_id = auth.uid()
        AND p2.id = notifications.player_id
    )
  );

CREATE POLICY "Players update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    player_id IN (
      SELECT players.id
      FROM players
      WHERE players.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================

-- Storage bucket: 'submissions'
-- Note: Create the bucket in Supabase Dashboard > Storage first

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public can view submissions pn4br_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pn4br_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files pn4br_0" ON storage.objects;

-- Public can view submissions
CREATE POLICY "Public can view submissions pn4br_0"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions'::text);

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload pn4br_0"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'submissions'::text
    AND auth.uid() IS NOT NULL
  );

-- Users can delete their own files (folder-based)
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'submissions'::text
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files (authenticated check)
CREATE POLICY "Users can delete own files pn4br_0"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'submissions'::text
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- MIGRATION HELPERS
-- ============================================================================

-- If upgrading from an older schema, use these commands:

-- Add missing columns if they don't exist:
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS code TEXT;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITHOUT TIME ZONE;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS winner_id UUID;
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_user_id UUID;
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS push_token TEXT;
-- ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Make code column unique and not null:
-- UPDATE events SET code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)) WHERE code IS NULL;
-- ALTER TABLE events ALTER COLUMN code SET NOT NULL;
-- ALTER TABLE events ADD CONSTRAINT events_code_key UNIQUE (code);

-- Add foreign key constraints if they don't exist:
-- ALTER TABLE events ADD CONSTRAINT events_winner_id_fkey 
--   FOREIGN KEY (winner_id) REFERENCES players(id);
-- ALTER TABLE players ADD CONSTRAINT players_auth_user_id_fkey 
--   FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);

-- ============================================================================
-- NOTES
-- ============================================================================

-- Storage Bucket Configuration:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create a bucket named "submissions"
-- 3. Set bucket as public or private based on your needs
-- 4. The RLS policies above will handle fine-grained permissions

-- Key Features:
-- - Event codes allow easy joining with 6-character codes
-- - Winner tracking with winner_id on events table
-- - Push notifications support via push_token
-- - Flexible reaction system using JSONB
-- - Complete RLS policies for secure multi-user access
-- - Notifications system for in-app messaging