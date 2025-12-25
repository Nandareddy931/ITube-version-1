-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Subscriptions viewable by everyone" ON public.subscriptions;

-- Create a new policy that restricts SELECT to only the user's own subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = subscriber_id);

-- Also allow channel owners to see their subscriber count (but not individual subscriber details)
-- This is done via a security definer function to get aggregated counts
CREATE OR REPLACE FUNCTION public.get_channel_subscriber_count(channel_uuid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.subscriptions
  WHERE channel_id = channel_uuid;
$$;