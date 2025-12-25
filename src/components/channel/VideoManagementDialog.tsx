import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Trash2, Pencil, MoreVertical, Eye, EyeOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

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

interface VideoManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: Video[];
  onVideosUpdate: (videos: Video[]) => void;
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return `${views}`;
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

export function VideoManagementDialog({
  open,
  onOpenChange,
  videos,
  onVideosUpdate,
}: VideoManagementDialogProps) {
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);

  const handleEditClick = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditIsPublic(video.is_public ?? true);
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          title: editTitle,
          description: editDescription,
          is_public: editIsPublic,
        })
        .eq('id', editingVideo.id);

      if (error) throw error;

      const updatedVideos = videos.map((v) =>
        v.id === editingVideo.id
          ? { ...v, title: editTitle, description: editDescription, is_public: editIsPublic }
          : v
      );
      onVideosUpdate(updatedVideos);
      setEditingVideo(null);
      toast.success('Video updated successfully');
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!deletingVideoId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', deletingVideoId);

      if (error) throw error;

      const updatedVideos = videos.filter((v) => v.id !== deletingVideoId);
      onVideosUpdate(updatedVideos);
      setDeletingVideoId(null);
      toast.success('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    } finally {
      setDeleting(false);
    }
  };

  const toggleVisibility = async (video: Video) => {
    const newIsPublic = !video.is_public;
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_public: newIsPublic })
        .eq('id', video.id);

      if (error) throw error;

      const updatedVideos = videos.map((v) =>
        v.id === video.id ? { ...v, is_public: newIsPublic } : v
      );
      onVideosUpdate(updatedVideos);
      toast.success(newIsPublic ? 'Video is now public' : 'Video is now private');
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Videos</DialogTitle>
          </DialogHeader>

          {editingVideo ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={editingVideo.thumbnail_url || '/placeholder.svg'}
                  alt={editingVideo.title}
                  className="w-32 aspect-video object-cover rounded-lg"
                />
                <div>
                  <p className="text-sm text-muted-foreground">Editing video</p>
                  <p className="font-medium">{editingVideo.title}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    {editIsPublic ? 'Video is public' : 'Video is private'}
                  </p>
                </div>
                <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingVideo(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {videos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No videos uploaded yet
                </p>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={video.thumbnail_url || '/placeholder.svg'}
                        alt={video.title}
                        className="w-28 aspect-video object-cover rounded-lg"
                      />
                      <div className="absolute bottom-1 right-1 bg-background/90 text-foreground text-xs px-1 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatViews(video.views_count)} views</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {video.is_public ? (
                            <>
                              <Eye className="h-3 w-3" /> Public
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Private
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(video)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleVisibility(video)}>
                          {video.is_public ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Make Private
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Make Public
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingVideoId(video.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingVideoId} onOpenChange={() => setDeletingVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
