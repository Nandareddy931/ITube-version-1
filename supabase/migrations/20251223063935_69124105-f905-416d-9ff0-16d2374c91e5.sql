-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create a restrictive policy that only allows the trigger (SECURITY DEFINER) to insert
-- No direct user inserts are allowed - notifications are created by the system trigger only
-- This prevents spam and impersonation attacks