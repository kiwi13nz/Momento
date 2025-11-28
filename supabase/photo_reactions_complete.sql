-- ============================================================================
-- PHOTO REACTIONS - COMPLETE IMPLEMENTATION
-- ============================================================================
-- Production-ready schema for photo reactions feature
-- Optimized for 10s-100s of concurrent users
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- TABLE: photo_reactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.photo_reactions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'fire', 'hundred')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT photo_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT photo_reactions_submission_id_fkey FOREIGN KEY (submission_id) 
    REFERENCES public.submissions(id) ON DELETE CASCADE,
  CONSTRAINT photo_reactions_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- CRITICAL: Prevent duplicate reactions from same user
  CONSTRAINT photo_reactions_unique_per_user 
    UNIQUE (submission_id, user_id, reaction_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast lookups for aggregating reaction counts per photo
CREATE INDEX IF NOT EXISTS idx_photo_reactions_submission_id 
  ON public.photo_reactions(submission_id);

-- Fast lookups for finding user's reactions
CREATE INDEX IF NOT EXISTS idx_photo_reactions_user_id 
  ON public.photo_reactions(user_id);

-- Composite index for quick toggle checks
CREATE INDEX IF NOT EXISTS idx_photo_reactions_toggle 
  ON public.photo_reactions(submission_id, user_id, reaction_type);

-- ============================================================================
-- RPC FUNCTION: toggle_reaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_submission_id UUID,
  p_reaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated permissions
AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
  v_reaction_counts JSONB;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to react';
  END IF;
  
  -- Validate reaction type
  IF p_reaction_type NOT IN ('heart', 'fire', 'hundred') THEN
    RAISE EXCEPTION 'Invalid reaction type: %', p_reaction_type;
  END IF;
  
  -- Check if user already reacted with this type
  SELECT id INTO v_existing_id
  FROM public.photo_reactions
  WHERE submission_id = p_submission_id
    AND user_id = v_user_id
    AND reaction_type = p_reaction_type;
  
  IF v_existing_id IS NOT NULL THEN
    -- Reaction exists, remove it
    DELETE FROM public.photo_reactions
    WHERE id = v_existing_id;
  ELSE
    -- Reaction doesn't exist, add it
    INSERT INTO public.photo_reactions (submission_id, user_id, reaction_type)
    VALUES (p_submission_id, v_user_id, p_reaction_type)
    ON CONFLICT (submission_id, user_id, reaction_type) DO NOTHING; -- Safety net
  END IF;
  
  -- Return aggregated counts for this submission
  SELECT jsonb_object_agg(reaction_type, count)
  INTO v_reaction_counts
  FROM (
    SELECT 
      reaction_type,
      COUNT(*)::int AS count
    FROM public.photo_reactions
    WHERE submission_id = p_submission_id
    GROUP BY reaction_type
  ) counts;
  
  -- Return empty object if no reactions
  RETURN COALESCE(v_reaction_counts, '{}'::jsonb);
END;
$$;

-- ============================================================================
-- LEGACY RPC FUNCTIONS (Updated for backward compatibility)
-- ============================================================================

-- Note: These functions are kept for backward compatibility but should not be used
-- The frontend should use toggle_reaction instead

CREATE OR REPLACE FUNCTION public.increment_reaction(
  submission_id UUID,
  reaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Redirect to toggle_reaction
  RETURN public.toggle_reaction(submission_id, reaction_type);
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read reactions" ON public.photo_reactions;
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON public.photo_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.photo_reactions;

-- SELECT: Anyone can view reactions (public social media app)
CREATE POLICY "Anyone can read reactions"
  ON public.photo_reactions FOR SELECT
  USING (true);

-- INSERT: Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions"
  ON public.photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- DELETE: Users can only delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON public.photo_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to all authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.toggle_reaction TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_reaction TO authenticated, anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify everything works:

-- 1. Check table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'photo_reactions';

-- 2. Check function exists
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'toggle_reaction';

-- 3. Test toggle (add reaction)
-- SELECT toggle_reaction((SELECT id FROM submissions LIMIT 1), 'heart');

-- 4. View reactions
-- SELECT * FROM photo_reactions;

-- 5. Test toggle again (remove reaction)
-- SELECT toggle_reaction((SELECT id FROM submissions LIMIT 1), 'heart');

-- 6. Verify it was removed
-- SELECT * FROM photo_reactions;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- For 10s-100s of concurrent users:
-- ✅ Unique constraint prevents duplicate reactions (race condition safe)
-- ✅ Indexes optimize lookups (submission_id, user_id, composite)
-- ✅ SECURITY DEFINER allows RPC to bypass RLS for performance
-- ✅ ON CONFLICT DO NOTHING provides additional safety
-- ✅ CASCADE deletes clean up orphaned reactions automatically

-- Expected performance:
-- - Toggle reaction: <10ms per operation
-- - Get reaction counts: <5ms per photo (with index)
-- - Get user reactions: <10ms for 100 photos

-- ============================================================================
-- MIGRATION FROM OLD SYSTEM
-- ============================================================================

-- If you have old reactions in submissions.reactions JSONB, run this to migrate:
-- (Only run if you have existing data you want to preserve)

/*
INSERT INTO photo_reactions (submission_id, user_id, reaction_type)
SELECT 
  s.id as submission_id,
  s.player_id::uuid as user_id,
  reaction_key as reaction_type
FROM submissions s,
  jsonb_each(s.reactions) as reaction(reaction_key, reaction_value)
WHERE s.reactions IS NOT NULL
  AND s.reactions != '{}'::jsonb
ON CONFLICT (submission_id, user_id, reaction_type) DO NOTHING;
*/
