-- Create profiles table for user channels
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  description TEXT,
  subscribers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  category TEXT DEFAULT 'Entertainment',
  tags TEXT[],
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_likes table for tracking likes/dislikes
CREATE TABLE public.video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  is_like BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, channel_id)
);

-- Create watch_history table
CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_duration INTEGER DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Videos policies
CREATE POLICY "Public videos are viewable by everyone" ON public.videos FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own videos" ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- Video likes policies
CREATE POLICY "Video likes viewable by everyone" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON public.video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own likes" ON public.video_likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Subscriptions viewable by everyone" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can manage subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = subscriber_id);
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = subscriber_id);

-- Watch history policies
CREATE POLICY "Users can view own history" ON public.watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.watch_history FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'New User'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Videos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id IN ('videos', 'thumbnails', 'avatars'));
CREATE POLICY "Users can upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('videos', 'thumbnails', 'avatars') AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id IN ('videos', 'thumbnails', 'avatars') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id IN ('videos', 'thumbnails', 'avatars') AND auth.uid()::text = (storage.foldername(name))[1]);