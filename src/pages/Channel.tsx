import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Settings, Video as VideoIcon } from 'lucide-react';
import { ChannelSettingsDialog } from '@/components/channel/ChannelSettingsDialog';
import { VideoManagementDialog } from '@/components/channel/VideoManagementDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
}

interface Video {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  duration: number;
  is_public?: boolean;
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videosDialogOpen, setVideosDialogOpen] = useState(false);
  const [allVideos, setAllVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchChannelData = async () => {
      setLoading(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, banner_url, description')
        .eq('id', id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch videos (all for owner, public for others)
      const isOwner = user?.id === id;
      let videosQuery = supabase
        .from('videos')
        .select('id, title, description, thumbnail_url, views_count, created_at, duration, is_public')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (!isOwner) {
        videosQuery = videosQuery.eq('is_public', true);
      }

      const { data: videosData } = await videosQuery;

      if (videosData) {
        setAllVideos(videosData);
        // Only show public videos in the grid
        setVideos(videosData.filter(v => v.is_public !== false));
      }

      // Fetch subscriber count
      const { data: countData } = await supabase.rpc('get_channel_subscriber_count', {
        channel_uuid: id
      });

      if (countData !== null) {
        setSubscriberCount(countData);
      }

      // Check subscription status
      if (user) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('channel_id', id)
          .eq('subscriber_id', user.id)
          .single();

        setIsSubscribed(!!subData);
      }

      setLoading(false);
    };

    fetchChannelData();
  }, [id, user]);

  const handleSubscribe = async () => {
    if (!user || !id) return;

    if (isSubscribed) {
      await supabase
        .from('subscriptions')
        .delete()
        .eq('channel_id', id)
        .eq('subscriber_id', user.id);
      setIsSubscribed(false);
      setSubscriberCount(prev => prev - 1);
    } else {
      await supabase
        .from('subscriptions')
        .insert({ channel_id: id, subscriber_id: user.id });
      setIsSubscribed(true);
      setSubscriberCount(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-32 sm:h-48 bg-secondary" />
          <div className="max-w-6xl mx-auto px-4 -mt-12 sm:-mt-16">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-secondary border-4 border-background" />
              <div className="flex-1 text-center sm:text-left">
                <div className="h-6 w-48 bg-secondary rounded mb-2" />
                <div className="h-4 w-32 bg-secondary rounded" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Channel not found</p>
        </div>
      </Layout>
    );
  }

  const isOwnChannel = user?.id === id;

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleVideosUpdate = (updatedVideos: Video[]) => {
    setAllVideos(updatedVideos);
    setVideos(updatedVideos.filter(v => v.is_public !== false));
  };

  return (
    <Layout>
      {/* Banner */}
      <div 
        className="h-32 sm:h-48 bg-cover bg-center"
        style={{
          backgroundImage: profile.banner_url 
            ? `url(${profile.banner_url})` 
            : 'linear-gradient(to right, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.1))'
        }}
      />

      {/* Channel Info */}
      <div className="max-w-6xl mx-auto px-4 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 pb-6 border-b border-border">
          {isOwnChannel ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative group cursor-pointer">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                      {profile.display_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings className="h-6 w-6" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Channel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVideosDialogOpen(true)}>
                  <VideoIcon className="h-4 w-4 mr-2" />
                  Manage Videos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {profile.display_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">{profile.display_name || 'Unknown Channel'}</h1>
            <p className="text-muted-foreground mt-1">
              {subscriberCount.toLocaleString()} subscribers • {videos.length} videos
            </p>
            {profile.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{profile.description}</p>
            )}
          </div>

          {isOwnChannel ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Channel
              </Button>
              <Button variant="outline" onClick={() => setVideosDialogOpen(true)}>
                <VideoIcon className="h-4 w-4 mr-2" />
                Manage Videos
              </Button>
            </div>
          ) : (
            <Button
              variant={isSubscribed ? 'subscribed' : 'subscribe'}
              onClick={handleSubscribe}
              disabled={!user}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </Button>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <ChannelSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Video Management Dialog */}
      <VideoManagementDialog
        open={videosDialogOpen}
        onOpenChange={setVideosDialogOpen}
        videos={allVideos}
        onVideosUpdate={handleVideosUpdate}
      />

      {/* Videos */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">Videos</h2>
        
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No videos uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Link key={video.id} to={`/watch/${video.id}`} className="group block">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary mb-2">
                  <img
                    src={video.thumbnail_url || '/placeholder.svg'}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs font-medium px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatViews(video.views_count)} • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
