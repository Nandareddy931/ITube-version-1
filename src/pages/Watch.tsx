import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Share2, Play, Pause, Volume2, VolumeX, Maximize, Reply, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    subscribers_count: number;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  replies?: Comment[];
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [userLike, setUserLike] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [shareStartAt, setShareStartAt] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const viewCountedRef = useRef(false);
  const watchTimeRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    
    async function fetchVideo() {
      setLoading(true);
      
      const { data: videoData, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles (
            id,
            display_name,
            avatar_url,
            subscribers_count
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !videoData) {
        console.error('Error fetching video:', error);
        setLoading(false);
        return;
      }

      setVideo(videoData);

      // Reset view tracking for new video
      viewCountedRef.current = false;
      watchTimeRef.current = 0;
      lastTimeRef.current = 0;

      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_id,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', id)
        .order('created_at', { ascending: false });

      // Organize comments into threads
      const parentComments: Comment[] = [];
      const repliesMap: Map<string, Comment[]> = new Map();
      
      (commentsData || []).forEach((comment: Comment) => {
        if (comment.parent_id) {
          const existing = repliesMap.get(comment.parent_id) || [];
          existing.push(comment);
          repliesMap.set(comment.parent_id, existing);
        } else {
          parentComments.push(comment);
        }
      });

      // Attach replies to parent comments
      parentComments.forEach(comment => {
        comment.replies = repliesMap.get(comment.id) || [];
      });

      setComments(parentComments);

      const { data: relatedData } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          views_count,
          created_at,
          duration,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .neq('id', id)
        .eq('is_public', true)
        .limit(10);

      setRelatedVideos(relatedData || []);

      // Fetch like counts using RPC
      const { data: likeCounts } = await supabase.rpc('get_video_like_counts', { video_uuid: id });
      if (likeCounts && likeCounts[0]) {
        setLikesCount(likeCounts[0].likes_count || 0);
        setDislikesCount(likeCounts[0].dislikes_count || 0);
      }

      // Fetch subscriber count using RPC
      if (videoData.user_id) {
        const { data: subCount } = await supabase.rpc('get_channel_subscriber_count', { channel_uuid: videoData.user_id });
        if (subCount !== null) {
          setSubscriberCount(subCount);
        }
      }

      if (user) {
        const { data: likeData } = await supabase
          .from('video_likes')
          .select('is_like')
          .eq('video_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeData) {
          setUserLike(likeData.is_like);
        }

        // Check subscription status
        if (videoData.user_id) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('channel_id', videoData.user_id)
            .eq('subscriber_id', user.id)
            .maybeSingle();

          setIsSubscribed(!!subData);
        }
      }

      setLoading(false);
    }

    fetchVideo();
  }, [id, user]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = async () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const videoDuration = videoRef.current.duration;
    const progress = (currentTime / videoDuration) * 100;
    setProgress(progress);

    // Track watch time and increment view based on video duration
    // For videos >= 20s: require 20 seconds watched
    // For videos < 20s: require 20% of duration watched
    if (!viewCountedRef.current && id && videoDuration > 0) {
      const timeDiff = currentTime - lastTimeRef.current;
      // Only count forward progress (not seeking backwards)
      if (timeDiff > 0 && timeDiff < 1) {
        watchTimeRef.current += timeDiff;
      }
      lastTimeRef.current = currentTime;

      const requiredWatchTime = videoDuration >= 20 ? 20 : videoDuration * 0.2;

      if (watchTimeRef.current >= requiredWatchTime) {
        viewCountedRef.current = true;
        // Use RPC to atomically increment the view count
        const { data: newCount, error } = await supabase.rpc('increment_view_count' as any, { video_uuid: id });
        if (!error && video && typeof newCount === 'number') {
          setVideo({ ...video, views_count: newCount });
        }
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * videoRef.current.duration;
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleLike = async (isLike: boolean) => {
    if (!user || !video) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like videos",
        variant: "destructive",
      });
      return;
    }

    const previousLike = userLike;

    if (userLike === isLike) {
      // Remove like/dislike
      await supabase
        .from('video_likes')
        .delete()
        .eq('video_id', video.id)
        .eq('user_id', user.id);
      setUserLike(null);
      
      // Update counts
      if (isLike) {
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        setDislikesCount(prev => Math.max(0, prev - 1));
      }
    } else {
      // Add or change like/dislike
      await supabase
        .from('video_likes')
        .upsert({
          video_id: video.id,
          user_id: user.id,
          is_like: isLike,
        });
      setUserLike(isLike);
      
      // Update counts
      if (isLike) {
        setLikesCount(prev => prev + 1);
        if (previousLike === false) {
          setDislikesCount(prev => Math.max(0, prev - 1));
        }
      } else {
        setDislikesCount(prev => prev + 1);
        if (previousLike === true) {
          setLikesCount(prev => Math.max(0, prev - 1));
        }
      }
    }
  };

  const handleSubscribe = async () => {
    if (!user || !video) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe",
        variant: "destructive",
      });
      return;
    }

    if (isSubscribed) {
      await supabase
        .from('subscriptions')
        .delete()
        .eq('channel_id', video.user_id)
        .eq('subscriber_id', user.id);
      setIsSubscribed(false);
      setSubscriberCount(prev => Math.max(0, prev - 1));
      toast({ title: "Unsubscribed" });
    } else {
      await supabase
        .from('subscriptions')
        .insert({ channel_id: video.user_id, subscriber_id: user.id });
      setIsSubscribed(true);
      setSubscriberCount(prev => prev + 1);
      toast({ title: "Subscribed!" });
    }
  };

  const handleComment = async () => {
    if (!user || !video || !newComment.trim()) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        video_id: video.id,
        user_id: user.id,
        content: newComment.trim(),
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      return;
    }

    const newCommentData: Comment = { ...data, replies: [] };
    setComments([newCommentData, ...comments]);
    setNewComment('');
    toast({ title: "Comment posted" });
  };

  const handleReply = async (parentId: string) => {
    if (!user || !video || !replyContent.trim()) {
      toast({
        title: "Sign in required",
        description: "Please sign in to reply",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        video_id: video.id,
        user_id: user.id,
        content: replyContent.trim(),
        parent_id: parentId,
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive",
      });
      return;
    }

    // Add reply to parent comment
    setComments(comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), data],
        };
      }
      return comment;
    }));

    setReplyingTo(null);
    setReplyContent('');
    setExpandedReplies(prev => new Set([...prev, parentId]));
    toast({ title: "Reply posted" });
  };

  const handleDeleteComment = async (commentId: string, parentId?: string | null) => {
    if (!user) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
      return;
    }

    if (parentId) {
      // It's a reply, remove from parent's replies
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: (comment.replies || []).filter(r => r.id !== commentId),
          };
        }
        return comment;
      }));
    } else {
      // It's a top-level comment
      setComments(comments.filter(c => c.id !== commentId));
    }

    toast({ title: "Comment deleted" });
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96">
          <h1 className="text-2xl font-bold mb-4">Video not found</h1>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-0 sm:p-4">
        {/* Main Content */}
        <div className="flex-1 max-w-5xl">
          {/* Video Player */}
          <div
            className="relative aspect-video bg-black sm:rounded-xl overflow-hidden group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            <video
              ref={videoRef}
              src={video.video_url}
              className="w-full h-full"
              onClick={handlePlayPause}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              poster={video.thumbnail_url || undefined}
              playsInline
            />
            
            {/* Video Controls */}
            <div
              className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress Bar */}
              <div
                className="h-1 mx-2 sm:mx-4 mb-2 bg-muted/50 rounded-full cursor-pointer group/progress"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-primary rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between px-2 sm:px-4 pb-2 sm:pb-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="ghost" size="icon" onClick={handlePlayPause} className="h-8 w-8 sm:h-10 sm:w-10">
                    {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8 sm:h-10 sm:w-10">
                    {isMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={handleFullscreen} className="h-8 w-8 sm:h-10 sm:w-10">
                  <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Video Info */}
          <div className="mt-3 sm:mt-4 px-3 sm:px-0">
            <h1 className="text-lg sm:text-xl font-bold">{video.title}</h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-3 sm:mt-4">
              {/* Channel Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                  <AvatarImage src={video.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {video.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{video.profiles?.display_name || 'Unknown'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatViews(subscriberCount)} subscribers
                  </p>
                </div>
                {user?.id !== video.user_id && (
                  <Button 
                    variant={isSubscribed ? 'subscribed' : 'subscribe'} 
                    size="sm" 
                    className="shrink-0"
                    onClick={handleSubscribe}
                    disabled={!user}
                  >
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </Button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <div className="flex items-center bg-secondary rounded-full shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-l-full gap-1.5 px-3 ${userLike === true ? 'text-primary' : ''}`}
                    onClick={() => handleLike(true)}
                  >
                    <ThumbsUp className={`h-4 w-4 ${userLike === true ? 'fill-current' : ''}`} />
                    <span className="text-sm">{formatViews(likesCount)}</span>
                  </Button>
                  <div className="w-px h-5 bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-r-full px-3 gap-1.5 ${userLike === false ? 'text-primary' : ''}`}
                    onClick={() => handleLike(false)}
                  >
                    <ThumbsDown className={`h-4 w-4 ${userLike === false ? 'fill-current' : ''}`} />
                    <span className="text-sm">{formatViews(dislikesCount)}</span>
                  </Button>
                </div>
                <Button variant="secondary" size="sm" className="gap-1.5 shrink-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-1.5 shrink-0">
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share</DialogTitle>
                        <DialogDescription>Share this video with others — copy link or use your device share.</DialogDescription>
                      </DialogHeader>

                      <div className="mt-2">
                        <label className="flex items-center gap-2 text-sm mb-2">
                          <input
                            type="checkbox"
                            checked={shareStartAt}
                            onChange={(e) => setShareStartAt(e.target.checked)}
                          />
                          Start at current time
                        </label>

                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={(() => {
                              if (!video) return '';
                              const url = new URL(window.location.href);
                              let href = url.origin + `/watch/${video.id}`;
                              if (shareStartAt && videoRef.current) {
                                const t = Math.floor(videoRef.current.currentTime || 0);
                                href += `?t=${t}`;
                              }
                              return href;
                            })()}
                            className="flex-1 bg-muted/10 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            className="btn bg-primary text-primary-foreground px-3 rounded text-sm"
                            onClick={async (e) => {
                              e.preventDefault();
                              const url = new URL(window.location.href);
                              let href = url.origin + `/watch/${video?.id}`;
                              if (shareStartAt && videoRef.current) {
                                const t = Math.floor(videoRef.current.currentTime || 0);
                                href += `?t=${t}`;
                              }
                              try {
                                await navigator.clipboard.writeText(href);
                                toast({ title: 'Link copied', description: 'Video link copied to clipboard.' });
                              } catch (err) {
                                console.error('Copy failed', err);
                                toast({ title: 'Copy failed', description: 'Unable to copy link.' });
                              }
                            }}
                          >
                            Copy
                          </button>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            className="btn border px-3 py-1 rounded text-sm"
                            onClick={async () => {
                              if (!video) return;
                              const url = new URL(window.location.href);
                              let href = url.origin + `/watch/${video.id}`;
                              if (shareStartAt && videoRef.current) {
                                const t = Math.floor(videoRef.current.currentTime || 0);
                                href += `?t=${t}`;
                              }
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: video.title, url: href });
                                } catch (err) {
                                  console.error('Web share failed', err);
                                }
                              } else {
                                try {
                                  await navigator.clipboard.writeText(href);
                                  toast({ title: 'Link copied', description: 'Link copied to clipboard.' });
                                } catch (err) {
                                  toast({ title: 'Copy failed', description: 'Unable to copy link.' });
                                }
                              }
                            }}
                          >
                            Share via device
                          </button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-secondary rounded-xl">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                {formatViews(video.views_count)} views • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
              </p>
              <p className="text-xs sm:text-sm whitespace-pre-wrap">{video.description}</p>
            </div>

            {/* Comments */}
            <div className="mt-4 sm:mt-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{comments.length} Comments</h2>
              
              {user && (
                <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => setNewComment('')}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleComment} disabled={!newComment.trim()}>
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 sm:space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-3">
                    {/* Parent Comment */}
                    <div className="flex gap-2 sm:gap-4">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-xs">
                          {comment.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm">{comment.profiles?.display_name || 'User'}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm mt-0.5 sm:mt-1">{comment.content}</p>
                        
                        {/* Comment Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          {user && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                setReplyContent('');
                              }}
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </Button>
                          )}
                          {user?.id === comment.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          )}
                        </div>

                        {/* Reply Input */}
                        {replyingTo === comment.id && (
                          <div className="mt-3 flex gap-2">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {user?.email?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Textarea
                                placeholder="Add a reply..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                rows={2}
                                className="text-sm"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()}>
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show/Hide Replies Toggle */}
                        {comment.replies && comment.replies.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 mt-2 text-xs gap-1 text-primary"
                            onClick={() => toggleReplies(comment.id)}
                          >
                            {expandedReplies.has(comment.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                              </>
                            )}
                          </Button>
                        )}

                        {/* Replies */}
                        {expandedReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3 pl-2 border-l-2 border-border">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={reply.profiles?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-secondary text-xs">
                                    {reply.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-xs">{reply.profiles?.display_name || 'User'}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className="text-xs mt-0.5">{reply.content}</p>
                                  {user?.id === reply.user_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive mt-1"
                                      onClick={() => handleDeleteComment(reply.id, comment.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Videos - Below Main Content */}
            <div className="mt-6 sm:mt-8 lg:hidden">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Suggested Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {relatedVideos.map((suggestedVideo) => (
                  <Link
                    key={suggestedVideo.id}
                    to={`/watch/${suggestedVideo.id}`}
                    className="flex gap-3 group"
                  >
                    <div className="relative w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-secondary">
                      <img
                        src={suggestedVideo.thumbnail_url || '/placeholder.svg'}
                        alt={suggestedVideo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {suggestedVideo.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestedVideo.profiles?.display_name || 'Unknown Channel'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatViews(suggestedVideo.views_count)} views
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Videos */}
        <div className="lg:w-96 px-3 sm:px-0 mt-4 lg:mt-0">
          <h2 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Related Videos</h2>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
            {relatedVideos.map((relVideo) => (
              <Link key={relVideo.id} to={`/watch/${relVideo.id}`} className="flex flex-col lg:flex-row gap-2 group">
                <div className="relative w-full lg:w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={relVideo.thumbnail_url || '/placeholder.svg'}
                    alt={relVideo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {relVideo.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    {relVideo.profiles?.display_name || 'Unknown'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatViews(relVideo.views_count)} views
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
