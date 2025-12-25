-- Create notifications table for subscription-based video notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  channel_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Allow inserts for authenticated users (for the notification creation logic)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify subscribers when a video is uploaded
CREATE OR REPLACE FUNCTION public.notify_subscribers_on_video_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify for public videos
  IF NEW.is_public = true THEN
    INSERT INTO public.notifications (user_id, video_id, channel_id)
    SELECT s.subscriber_id, NEW.id, NEW.user_id
    FROM public.subscriptions s
    WHERE s.channel_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to call the function on video insert
CREATE TRIGGER on_video_upload_notify_subscribers
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subscribers_on_video_upload();