import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VideoGrid } from '@/components/video/VideoGrid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Bell, BellOff } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Subscription {
  channel_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  duration: number;
  category: string | null;
  user_id: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSubscriptions = async () => {
      setLoading(true);

      // Fetch user's subscriptions with channel profiles
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('subscriber_id', user.id);

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        setLoading(false);
        return;
      }

      if (!subs || subs.length === 0) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const channelIds = subs.map(s => s.channel_id);

      // Fetch profiles for subscribed channels
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', channelIds);

      // Combine subscriptions with profiles
      const subsWithProfiles = subs.map(sub => ({
        channel_id: sub.channel_id,
        profiles: profiles?.find(p => p.id === sub.channel_id) || null
      }));

      setSubscriptions(subsWithProfiles);

      // Fetch videos from subscribed channels
      const { data: vids, error: vidsError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          views_count,
          created_at,
          duration,
          category,
          user_id,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .in('user_id', channelIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (vidsError) {
        console.error('Error fetching videos:', vidsError);
      } else {
        setVideos(vids || []);
      }

      setLoading(false);
    };

    fetchSubscriptions();
  }, [user]);

  const filteredVideos = selectedChannel 
    ? videos.filter(v => v.user_id === selectedChannel)
    : videos;

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to see your subscriptions</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Subscribe to channels to get notified about new videos and see them all in one place.
          </p>
          <Link to="/auth">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>

        {subscriptions.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">No subscriptions yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Subscribe to your favorite channels to see their latest videos here.
            </p>
            <Link to="/">
              <Button>Explore Videos</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Channel Pills */}
            <ScrollArea className="w-full mb-6">
              <div className="flex items-center gap-3 pb-2">
                <Button
                  variant={selectedChannel === null ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedChannel(null)}
                  className="shrink-0"
                >
                  All
                </Button>
                {subscriptions.map((sub) => (
                  <button
                    key={sub.channel_id}
                    onClick={() => setSelectedChannel(
                      selectedChannel === sub.channel_id ? null : sub.channel_id
                    )}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors shrink-0 ${
                      selectedChannel === sub.channel_id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={sub.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {sub.profiles?.display_name?.charAt(0).toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {sub.profiles?.display_name || 'Channel'}
                    </span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>

            {/* Videos Grid */}
            {filteredVideos.length === 0 && !loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {selectedChannel 
                    ? 'This channel has no videos yet'
                    : 'No videos from your subscriptions yet'}
                </p>
              </div>
            ) : (
              <VideoGrid videos={filteredVideos} loading={loading} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
