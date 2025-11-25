-- ============================================================================
-- REACTION RPC FUNCTIONS
-- ============================================================================
-- Add these to your Supabase project via SQL Editor
-- These functions enable atomic reaction increment/decrement on submissions

-- Increment reaction count (add reaction)
CREATE OR REPLACE FUNCTION public.add_reaction(
  p_submission_id UUID,
  p_reaction_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  new_reactions JSONB;
BEGIN
  -- Get current count for this reaction type
  SELECT COALESCE((reactions->>p_reaction_type)::INTEGER, 0)
  INTO current_count
  FROM submissions
  WHERE id = p_submission_id;
  
  -- Increment and update
  UPDATE submissions
  SET reactions = jsonb_set(
    COALESCE(reactions, '{}'::jsonb),
    ARRAY[p_reaction_type],
    to_jsonb(current_count + 1)
  )
  WHERE id = p_submission_id
  RETURNING reactions INTO new_reactions;
  
  RETURN new_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement reaction count (remove reaction)
CREATE OR REPLACE FUNCTION public.remove_reaction(
  p_submission_id UUID,
  p_reaction_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  new_reactions JSONB;
BEGIN
  -- Get current count
  SELECT COALESCE((reactions->>p_reaction_type)::INTEGER, 0)
  INTO current_count
  FROM submissions
  WHERE id = p_submission_id;
  
  -- Decrement (don't go below 0)
  UPDATE submissions
  SET reactions = jsonb_set(
    COALESCE(reactions, '{}'::jsonb),
    ARRAY[p_reaction_type],
    to_jsonb(GREATEST(current_count - 1, 0))
  )
  WHERE id = p_submission_id
  RETURNING reactions INTO new_reactions;
  
  RETURN new_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.add_reaction TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.remove_reaction TO authenticated, anon;

-- Verification queries (optional - run these to test):
-- SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('add_reaction', 'remove_reaction');
-- SELECT public.add_reaction((SELECT id FROM submissions LIMIT 1), 'heart');
