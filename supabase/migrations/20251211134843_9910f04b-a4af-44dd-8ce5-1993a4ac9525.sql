CREATE OR REPLACE FUNCTION public.increment_view_count(video_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.videos
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = video_uuid
  RETURNING views_count INTO new_count;
  
  RETURN new_count;
END;
$$;