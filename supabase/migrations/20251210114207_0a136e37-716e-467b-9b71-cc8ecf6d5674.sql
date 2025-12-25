-- Fix: Remove public access to individual video likes to prevent user profiling
DROP POLICY IF EXISTS "Video likes viewable by everyone" ON public.video_likes;

-- Users can view their own likes (to know if they've liked a video)
CREATE POLICY "Users can view own likes" ON public.video_likes
  FOR SELECT USING (auth.uid() = user_id);

-- Video owners can view likes on their videos (for analytics)
CREATE POLICY "Video owners can view their video likes" ON public.video_likes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM videos WHERE videos.id = video_likes.video_id AND videos.user_id = auth.uid())
  );