-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;

-- Recreate as PERMISSIVE policy (default behavior, explicitly stated)
CREATE POLICY "Public videos are viewable by everyone" 
ON public.videos 
FOR SELECT 
TO public
USING (is_public = true);