import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagsInput } from '@/components/ui/tags-input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload as UploadIcon, Film, Image, X, Loader2, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateThumbnailFromVideo, getVideoThumbnailPreview } from '@/utils/thumbnailGenerator';
import { uploadService } from '@/services/uploadService';

const categories = [
  'Entertainment',
  'Music',
  'Gaming',
  'Education',
  'Sports',
  'News',
  'Technology',
  'Comedy',
  'Movies',
  'Travel',
];

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [tags, setTags] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a video under 500MB",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !title.trim() || !user) {
      toast({
        title: "Missing information",
        description: "Please add a title and video file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get video duration
      let duration = 0;
      if (videoPreview) {
        const video = document.createElement('video');
        video.src = videoPreview;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            duration = Math.floor(video.duration);
            resolve(null);
          };
        });
      }

      // Create upload task
      const uploadTask = uploadService.createUploadTask(
        videoFile,
        {
          title: title.trim(),
          description: description.trim(),
          category,
          tags,
          duration,
        },
        thumbnailFile || undefined
      );

      toast({
        title: "Upload started",
        description: "Your video is uploading in the background. You can continue browsing.",
      });

      // Process the upload in background
      const results = await uploadService.uploadTask(uploadTask, supabase);

      if (results) {
        // Get thumbnail URL
        let thumbnailUrl = results.thumbnailUrl;

        // Priority 1: Use custom thumbnail if provided by user
        if (!thumbnailUrl && !thumbnailFile && videoFile) {
          try {
            setGeneratingThumbnail(true);
            const thumbnailBlob = await generateThumbnailFromVideo(videoFile, true);
            const thumbnailFileName = `${user.id}/${Date.now()}-auto-thumbnail.jpg`;
            const { error: thumbError } = await supabase.storage
              .from('thumbnails')
              .upload(thumbnailFileName, thumbnailBlob);

            if (!thumbError) {
              const { data: thumbUrlData } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(thumbnailFileName);
              thumbnailUrl = thumbUrlData.publicUrl;
            }
          } catch (thumbGenError) {
            console.error("Failed to auto-generate thumbnail:", thumbGenError);
          } finally {
            setGeneratingThumbnail(false);
          }
        }

        // Insert into database
        const { error: dbError } = await supabase
          .from('videos')
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            video_url: results.videoUrl,
            thumbnail_url: thumbnailUrl,
            category,
            duration,
            tags: tags.length > 0 ? tags : null,
          });

        if (dbError) throw dbError;

        toast({
          title: "Video uploaded!",
          description: "Your video is now live",
        });

        // Reset form
        setVideoFile(null);
        setThumbnailFile(null);
        setVideoPreview(null);
        setThumbnailPreview(null);
        setTitle('');
        setDescription('');
        setTags([]);
        setCategory('Entertainment');
        setUploadProgress(0);

        navigate('/');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Upload Video</h1>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Video Upload */}
          <div className="space-y-4">
            <Label>Video File</Label>
            {!videoFile ? (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 sm:p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Film className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-base sm:text-lg font-medium mb-2">Select video to upload</p>
                <p className="text-xs sm:text-sm text-muted-foreground">MP4, WebM, or MOV (max 500MB)</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-secondary">
                <video
                  src={videoPreview || undefined}
                  className="w-full aspect-video object-cover"
                  controls
                />
                <Button
                  variant="secondary"
                  size="iconSm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />

            {/* Thumbnail Upload */}
            <Label>Thumbnail (Optional - Auto-generated if not provided)</Label>
            {!thumbnailPreview ? (
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Image className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-muted-foreground">Upload custom thumbnail</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-secondary">
                <img
                  src={thumbnailPreview || undefined}
                  alt="Thumbnail"
                  className="w-full aspect-video object-cover"
                />
                <Button
                  variant="secondary"
                  size="iconSm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
          </div>

          {/* Video Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Add a title that describes your video"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell viewers about your video"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagsInput 
                tags={tags}
                onChange={setTags}
                maxTags={10}
                placeholder="Add tags to help viewers find your video"
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!videoFile || !title.trim() || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
