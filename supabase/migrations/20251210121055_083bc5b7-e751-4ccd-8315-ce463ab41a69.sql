-- Remove policy that exposes individual user IDs to video owners
DROP POLICY IF EXISTS "Video owners can view their video likes" ON public.video_likes;

-- Create a security definer function to get aggregated like/dislike counts without exposing user IDs
CREATE OR REPLACE FUNCTION public.get_video_like_counts(video_uuid uuid)
RETURNS TABLE(likes_count bigint, dislikes_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE is_like = true) as likes_count,
    COUNT(*) FILTER (WHERE is_like = false) as dislikes_count
  FROM public.video_likes
  WHERE video_id = video_uuid;
$$;