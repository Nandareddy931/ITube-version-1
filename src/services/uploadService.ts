// Upload service with pause/resume and background support
interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedSize: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  videoFile: File;
  thumbnailFile?: File;
  videoMetadata: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    duration: number;
  };
  startedAt: number;
  pausedAt?: number;
  error?: string;
}

const STORAGE_KEY = 'itube_uploads';

class UploadServiceClass {
  private uploads: Map<string, UploadTask> = new Map();
  private activeUploads: Set<string> = new Set();
  private listeners: Set<(task: UploadTask) => void> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadUploadsFromStorage();
      this.setupNetworkListener();
    }
  }

  private setupNetworkListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Connection restored - resuming uploads');
      this.resumeAllPausedUploads();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Connection lost - pausing uploads');
      this.pauseAllUploads();
    });
  }

  private loadUploadsFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const uploads = JSON.parse(stored) as UploadTask[];
        uploads.forEach(upload => {
          if (upload.status === 'uploading') {
            upload.status = 'paused'; // Reset uploading to paused
          }
          // Don't restore the file objects as they can't be serialized
          if (upload.status !== 'completed' && upload.status !== 'failed') {
            this.uploads.set(upload.id, upload);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load uploads from storage:', error);
    }
  }

  private saveUploadsToStorage() {
    try {
      const uploads = Array.from(this.uploads.values()).map(u => ({
        ...u,
        videoFile: undefined,
        thumbnailFile: undefined,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
    } catch (error) {
      console.error('Failed to save uploads to storage:', error);
    }
  }

  createUploadTask(
    videoFile: File,
    videoMetadata: UploadTask['videoMetadata'],
    thumbnailFile?: File
  ): UploadTask {
    const task: UploadTask = {
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: videoFile.name,
      fileSize: videoFile.size,
      uploadedSize: 0,
      status: 'pending',
      progress: 0,
      videoFile,
      thumbnailFile,
      videoMetadata,
      startedAt: Date.now(),
    };

    this.uploads.set(task.id, task);
    this.saveUploadsToStorage();
    this.notifyListeners(task);
    return task;
  }

  async uploadTask(task: UploadTask, supabase: any): Promise<any> {
    try {
      task.status = 'uploading';
      task.startedAt = Date.now();
      this.activeUploads.add(task.id);
      this.notifyListeners(task);

      // Check internet connection
      if (!this.isOnline) {
        task.status = 'paused';
        this.activeUploads.delete(task.id);
        this.saveUploadsToStorage();
        this.notifyListeners(task);
        return null;
      }

      // Upload video
      const videoResult = await this.uploadFile(
        task,
        task.videoFile,
        supabase,
        'videos'
      );

      if (!videoResult) {
        throw new Error('Video upload failed');
      }

      task.progress = 75;
      this.notifyListeners(task);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (task.thumbnailFile) {
        thumbnailUrl = await this.uploadFile(
          task,
          task.thumbnailFile,
          supabase,
          'thumbnails'
        );
      }

      task.uploadedSize = task.fileSize;
      task.progress = 100;
      task.status = 'completed';
      this.activeUploads.delete(task.id);
      this.saveUploadsToStorage();
      this.notifyListeners(task);

      return {
        videoUrl: videoResult,
        thumbnailUrl,
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      this.activeUploads.delete(task.id);
      this.saveUploadsToStorage();
      this.notifyListeners(task);
      throw error;
    }
  }

  private async uploadFile(
    task: UploadTask,
    file: File,
    supabase: any,
    bucket: string
  ): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      
      task.uploadedSize += file.size / 2;
      task.progress = Math.min(50, (task.uploadedSize / task.fileSize) * 100);
      this.notifyListeners(task);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      throw error;
    }
  }

  pauseUpload(uploadId: string) {
    const task = this.uploads.get(uploadId);
    if (task && task.status === 'uploading') {
      task.status = 'paused';
      task.pausedAt = Date.now();
      this.activeUploads.delete(uploadId);
      this.saveUploadsToStorage();
      this.notifyListeners(task);
    }
  }

  resumeUpload(uploadId: string) {
    const task = this.uploads.get(uploadId);
    if (task && task.status === 'paused') {
      if (this.isOnline) {
        task.status = 'pending';
        this.saveUploadsToStorage();
        this.notifyListeners(task);
      } else {
        console.log('Cannot resume - no internet connection');
      }
    }
  }

  private pauseAllUploads() {
    this.activeUploads.forEach(uploadId => {
      const task = this.uploads.get(uploadId);
      if (task && task.status === 'uploading') {
        task.status = 'paused';
        this.notifyListeners(task);
      }
    });
    this.activeUploads.clear();
    this.saveUploadsToStorage();
  }

  private resumeAllPausedUploads() {
    this.uploads.forEach(task => {
      if (task.status === 'paused') {
        task.status = 'pending';
        this.notifyListeners(task);
      }
    });
    this.saveUploadsToStorage();
  }

  cancelUpload(uploadId: string) {
    this.uploads.delete(uploadId);
    this.activeUploads.delete(uploadId);
    this.saveUploadsToStorage();
  }

  getUpload(uploadId: string): UploadTask | undefined {
    return this.uploads.get(uploadId);
  }

  getAllUploads(): UploadTask[] {
    return Array.from(this.uploads.values());
  }

  getPendingUploads(): UploadTask[] {
    return Array.from(this.uploads.values()).filter(
      task => task.status === 'pending' || task.status === 'paused'
    );
  }

  subscribe(listener: (task: UploadTask) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(task: UploadTask) {
    this.listeners.forEach(listener => {
      try {
        listener(task);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const uploadService = new UploadServiceClass();
export type { UploadTask };
