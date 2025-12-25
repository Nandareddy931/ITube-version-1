import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelId: string;
  channelName: string;
  channelAvatar?: string;
  views: number;
  createdAt: string;
  duration: number;
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

export function VideoCard({
  id,
  title,
  thumbnailUrl,
  channelId,
  channelName,
  channelAvatar,
  views,
  createdAt,
  duration,
}: VideoCardProps) {
  return (
    <Link to={`/watch/${id}`} className="group block animate-fade-in">
      <div className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-secondary mb-2 sm:mb-3">
        <img
          src={thumbnailUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-background/90 text-foreground text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded">
          {formatDuration(duration)}
        </div>
      </div>
      <div className="flex gap-2 sm:gap-3">
        <Link to={`/channel/${channelId}`} onClick={(e) => e.stopPropagation()}>
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 hover:ring-2 hover:ring-primary transition-all">
            <AvatarImage src={channelAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
              {channelName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="text-xs text-muted-foreground mt-1">
            <div>
              <Link
                to={`/channel/${channelId}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-foreground transition-colors"
              >
                {channelName}
              </Link>
            </div>
            <div className="mt-0.5">
              {formatViews(views)} • {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
