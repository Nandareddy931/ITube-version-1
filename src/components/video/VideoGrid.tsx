import { VideoCard } from './VideoCard';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  duration: number;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
}

function VideoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video rounded-lg sm:rounded-xl bg-secondary mb-2 sm:mb-3" />
      <div className="flex gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-secondary shrink-0" />
        <div className="flex-1">
          <div className="h-3 sm:h-4 bg-secondary rounded mb-2 w-full" />
          <div className="h-2.5 sm:h-3 bg-secondary rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function VideoGrid({ videos, loading }: VideoGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground">
            <path fill="currentColor" d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2">No videos yet</h3>
        <p className="text-sm sm:text-base text-muted-foreground">Be the first to upload a video!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          id={video.id}
          title={video.title}
          thumbnailUrl={video.thumbnail_url || '/placeholder.svg'}
          channelId={video.user_id}
          channelName={video.profiles?.display_name || 'Unknown'}
          channelAvatar={video.profiles?.avatar_url || undefined}
          views={video.views_count}
          createdAt={video.created_at}
          duration={video.duration}
        />
      ))}
    </div>
  );
}
