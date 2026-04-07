import type { ProcessingFrame, VideoInfo } from "../types";

interface StartVideoFrameExtractorOptions {
  file: File;
  targetFps: number;
  onStart: (info: VideoInfo, previewUrl: string) => void;
  onFrame: (frame: ProcessingFrame) => Promise<void> | void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface VideoFrameExtractorSession {
  previewUrl: string;
  stop: () => void;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to encode frame as JPEG."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.82,
    );
  });
}

export function startVideoFrameExtractor(
  options: StartVideoFrameExtractorOptions,
): VideoFrameExtractorSession {
  if (typeof document === "undefined") {
    throw new Error("Frame extraction requires a browser environment.");
  }

  const previewUrl = URL.createObjectURL(options.file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx || typeof canvas.toBlob !== "function") {
    throw new Error("This browser cannot encode video frames.");
  }

  let stopped = false;
  let captureBusy = false;
  let frameIndex = 0;
  let lastCaptureTime = -1;
  let completeSent = false;
  let intervalId: number | null = null;

  const finish = () => {
    if (completeSent) {
      return;
    }
    completeSent = true;
    options.onComplete();
  };

  const stop = () => {
    stopped = true;
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
    video.pause();
    video.removeAttribute("src");
    video.load();
  };

  video.src = previewUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  video.addEventListener("error", () => {
    if (!stopped) {
      options.onError(new Error("Unable to decode the selected video file."));
    }
  });

  video.addEventListener("ended", () => {
    if (!stopped) {
      finish();
    }
  });

  video.addEventListener("loadedmetadata", () => {
    if (stopped) {
      return;
    }

    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    canvas.width = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
    canvas.height = Math.max(
      1,
      Math.round((video.videoHeight || (maxWidth * 9) / 16) * scale),
    );

    options.onStart(
      {
        duration: video.duration || 0,
        width: canvas.width,
        height: canvas.height,
        filename: options.file.name,
      },
      previewUrl,
    );

    void video.play().catch(() => {
      options.onError(
        new Error("The browser blocked background playback for frame extraction."),
      );
    });

    intervalId = window.setInterval(async () => {
      if (stopped || captureBusy) {
        return;
      }

      if (video.ended) {
        finish();
        return;
      }

      if (video.currentTime <= lastCaptureTime + 1 / options.targetFps / 2) {
        return;
      }

      captureBusy = true;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await canvasToBlob(canvas);
        const base64 = await blobToBase64(blob);
        lastCaptureTime = video.currentTime;

        await options.onFrame({
          frameIndex,
          timestamp: Number(video.currentTime.toFixed(3)),
          blob,
          base64,
          width: canvas.width,
          height: canvas.height,
        });

        frameIndex += 1;
      } catch (error) {
        if (!stopped) {
          options.onError(
            error instanceof Error
              ? error
              : new Error("Frame extraction failed unexpectedly."),
          );
        }
      } finally {
        captureBusy = false;
      }
    }, Math.round(1000 / options.targetFps));
  });

  return {
    previewUrl,
    stop,
  };
}
