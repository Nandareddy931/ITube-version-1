import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  video_id: string;
  channel_id: string;
  is_read: boolean;
  created_at: string;
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  } | null;
  channel: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          video_id,
          channel_id,
          is_read,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Fetch video and channel details separately
      const enrichedNotifications = await Promise.all(
        (data || []).map(async (notif) => {
          const [videoRes, channelRes] = await Promise.all([
            supabase.from('videos').select('id, title, thumbnail_url').eq('id', notif.video_id).maybeSingle(),
            supabase.from('profiles').select('id, display_name, avatar_url').eq('id', notif.channel_id).maybeSingle()
          ]);

          return {
            ...notif,
            video: videoRes.data,
            channel: channelRes.data
          };
        })
      );

      setNotifications(enrichedNotifications);
      setUnreadCount(enrichedNotifications.filter(n => !n.is_read).length);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotif = payload.new as any;
          
          // Fetch video and channel details
          const [videoRes, channelRes] = await Promise.all([
            supabase.from('videos').select('id, title, thumbnail_url').eq('id', newNotif.video_id).maybeSingle(),
            supabase.from('profiles').select('id, display_name, avatar_url').eq('id', newNotif.channel_id).maybeSingle()
          ]);

          const enrichedNotif: Notification = {
            ...newNotif,
            video: videoRes.data,
            channel: channelRes.data
          };

          setNotifications(prev => [enrichedNotif, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-primary text-primary-foreground rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm mt-1">Subscribe to channels to get notified of new videos</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <Link
                  key={notif.id}
                  to={`/watch/${notif.video_id}`}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                    setOpen(false);
                  }}
                  className={`flex gap-3 p-3 hover:bg-accent/50 transition-colors ${
                    !notif.is_read ? 'bg-accent/20' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={notif.channel?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {notif.channel?.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      <span className="font-medium">{notif.channel?.display_name || 'Unknown'}</span>
                      {' uploaded: '}
                      <span className="text-muted-foreground">{notif.video?.title || 'Unknown video'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {notif.video?.thumbnail_url && (
                    <img
                      src={notif.video.thumbnail_url}
                      alt=""
                      className="w-20 h-12 object-cover rounded shrink-0"
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
