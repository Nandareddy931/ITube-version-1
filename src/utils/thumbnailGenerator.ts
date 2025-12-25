/**
 * Extract a random frame from a video file and generate a thumbnail
 */
export async function generateThumbnailFromVideo(
  videoFile: File,
  randomFrame?: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      video.src = reader.result as string;

      video.onloadedmetadata = () => {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Get a random frame (or first frame if not random)
        let frameTime = 0;
        if (randomFrame && video.duration > 0) {
          // Exclude first and last 10% of video to get a meaningful frame
          const startTime = video.duration * 0.1;
          const endTime = video.duration * 0.9;
          frameTime = startTime + Math.random() * (endTime - startTime);
        }

        video.currentTime = frameTime;
      };

      video.onseeked = () => {
        try {
          // Draw the frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to create thumbnail blob"));
              }
              // Clean up
              video.remove();
              canvas.remove();
            },
            "image/jpeg",
            0.85 // Quality
          );
        } catch (error) {
          reject(error);
          video.remove();
          canvas.remove();
        }
      };

      video.onerror = () => {
        reject(new Error("Failed to load video"));
        video.remove();
        canvas.remove();
      };
    };

    reader.onerror = () => {
      reject(new Error("Failed to read video file"));
    };

    reader.readAsDataURL(videoFile);
  });
}

/**
 * Get thumbnail URL for preview (canvas-based)
 */
export async function getVideoThumbnailPreview(
  videoFile: File
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      video.src = reader.result as string;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Pick a frame ~25% into the video for preview
        const frameTime = video.duration * 0.25;
        video.currentTime = frameTime;
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
          video.remove();
          canvas.remove();
        } catch (error) {
          reject(error);
          video.remove();
          canvas.remove();
        }
      };

      video.onerror = () => {
        reject(new Error("Failed to load video"));
        video.remove();
        canvas.remove();
      };
    };

    reader.onerror = () => {
      reject(new Error("Failed to read video file"));
    };

    reader.readAsDataURL(videoFile);
  });
}
