import { useEffect, useState } from 'react';
import { uploadService, type UploadTask } from '@/services/uploadService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, X, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UploadQueue() {
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = uploadService.subscribe((task) => {
      setUploads(prev => {
        const index = prev.findIndex(u => u.id === task.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = task;
          return updated;
        }
        return [...prev, task];
      });
    });

    return () => unsubscribe();
  }, []);

  const activeUploads = uploads.filter(u => u.status !== 'completed' && u.status !== 'failed');
  const hasIssues = uploads.some(u => u.status === 'failed');

  if (activeUploads.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="font-medium text-sm sm:text-base">
              {activeUploads.length} upload{activeUploads.length !== 1 ? 's' : ''} in progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasIssues && <AlertCircle className="h-4 w-4 text-destructive" />}
            <span className="text-xs text-muted-foreground">
              {isExpanded ? '▼' : '▲'}
            </span>
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border p-3 sm:p-4 space-y-3 max-h-96 overflow-y-auto">
            {activeUploads.map((upload) => (
              <div key={upload.id} className="space-y-2 pb-3 border-b border-border last:border-b-0 last:pb-0">
                {/* Title */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.videoMetadata.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{upload.fileName}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded',
                    upload.status === 'uploading' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                    upload.status === 'paused' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                    upload.status === 'pending' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  )}>
                    {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                  </span>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <Progress value={upload.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {upload.progress}% • {formatBytes(upload.uploadedSize)} / {formatBytes(upload.fileSize)}
                  </p>
                </div>

                {/* Error Message */}
                {upload.error && (
                  <p className="text-xs text-destructive">{upload.error}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {upload.status === 'uploading' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => uploadService.pauseUpload(upload.id)}
                      className="flex-1 h-8 text-xs"
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  )}
                  {upload.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => uploadService.resumeUpload(upload.id)}
                      className="flex-1 h-8 text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => uploadService.cancelUpload(upload.id)}
                    className="flex-1 h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
