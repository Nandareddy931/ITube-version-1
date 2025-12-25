-- Add parent_id column to comments for threaded replies
ALTER TABLE public.comments 
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster reply queries
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);

-- Add index on video_id for faster comment fetching
CREATE INDEX idx_comments_video_id ON public.comments(video_id);