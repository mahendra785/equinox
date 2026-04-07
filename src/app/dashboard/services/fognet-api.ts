import type {
  AnalyticsResult,
  BroadcastPayload,
  HealthSnapshot,
  HeatmapSnapshot,
  ProcessingFrame,
  TransportMode,
} from "../types";

const HTTP_BASE = "http://localhost:8000";
const WS_BASE = HTTP_BASE.replace(/^http/, "ws");

export const fognetEndpoints = {
  root: `${HTTP_BASE}/`,
  processVideo: `${HTTP_BASE}/process-video`,
  processImage: `${HTTP_BASE}/process-image`,
  stream: `${HTTP_BASE}/stream`,
  report: `${HTTP_BASE}/report`,
  broadcast: `${HTTP_BASE}/broadcast`,
  heatmap: `${HTTP_BASE}/heatmap`,
  health: `${HTTP_BASE}/health`,
  processStream: `${WS_BASE}/ws/process-stream`,
};

export function buildProcessedImageUrl(base64Image: string) {
  return `data:image/jpeg;base64,${base64Image}`;
}

function normalizeObjects(input: unknown) {
  if (!input || typeof input !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, Number(value) || 0]),
  );
}

export function normalizeAnalyticsPayload(payload: unknown): AnalyticsResult {
  const source = payload && typeof payload === "object" ? payload : {};
  const record = source as Record<string, unknown>;

  return {
    frameIndex: Number(record.frame_index) || 0,
    timestamp: Number(record.timestamp) || 0,
    visibility: Number(record.visibility) || 0,
    dangerScore: Number(record.danger_score) || 0,
    risk:
      typeof record.risk === "string"
        ? (record.risk.toUpperCase() as AnalyticsResult["risk"])
        : "UNKNOWN",
    objects: normalizeObjects(record.objects),
    processedImage:
      typeof record.processed_image === "string" ? record.processed_image : "",
  };
}

export async function fetchHealthSnapshot(): Promise<HealthSnapshot> {
  const response = await fetch(fognetEndpoints.health, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Health check failed with ${response.status}.`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const label =
    typeof payload.status === "string"
      ? payload.status
      : typeof payload.detail === "string"
        ? payload.detail
        : "available";

  return {
    label,
    details: JSON.stringify(payload),
    raw: payload,
  };
}

export async function fetchHeatmapSnapshot(): Promise<HeatmapSnapshot> {
  const response = await fetch(fognetEndpoints.heatmap, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Heatmap request failed with ${response.status}.`);
  }

  const payload = await response.json();
  const points = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { points?: unknown }).points)
      ? ((payload as { points: unknown[] }).points ?? [])
      : [];

  const maxDanger = points.reduce((maxValue, entry) => {
    if (!entry || typeof entry !== "object") {
      return maxValue;
    }

    const record = entry as Record<string, unknown>;
    const nextDanger =
      Number(record.danger_score) ||
      Number(record.dangerScore) ||
      Number(record.score) ||
      0;

    return Math.max(maxValue, nextDanger);
  }, 0);

  return {
    points: points.length,
    maxDanger,
    raw: payload,
  };
}

export async function postBroadcastAlert(payload: BroadcastPayload) {
  const response = await fetch(fognetEndpoints.broadcast, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new Error(
      errorPayload?.detail ||
        errorPayload?.error ||
        `Broadcast failed with ${response.status}.`,
    );
  }

  return response.json();
}

export async function processBatchVideo(file: File) {
  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch(fognetEndpoints.processVideo, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new Error(
      payload?.detail ||
        payload?.error ||
        `Batch processing failed with ${response.status}.`,
    );
  }

  return {
    blob: await response.blob(),
    outputPath: response.headers.get("X-Processed-Video-Path"),
  };
}

interface TransportEventHandlers {
  onStatus: (message: string, mode: TransportMode) => void;
  onError: (message: string, mode: TransportMode) => void;
}

export interface FrameTransport {
  mode: Extract<TransportMode, "websocket" | "http-frame">;
  start(session: { filename: string; targetFps: number }): Promise<void>;
  sendFrame(frame: ProcessingFrame): Promise<AnalyticsResult>;
  complete(): Promise<void>;
  dispose(): void;
}

export class HttpFrameTransport implements FrameTransport {
  mode = "http-frame" as const;

  async start() {}

  async sendFrame(frame: ProcessingFrame) {
    const formData = new FormData();
    formData.append(
      "image",
      frame.blob,
      `frame-${String(frame.frameIndex).padStart(6, "0")}.jpg`,
    );
    formData.append("frame_index", String(frame.frameIndex));
    formData.append("timestamp", String(frame.timestamp));

    const response = await fetch(fognetEndpoints.processImage, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { detail?: string; error?: string }
        | null;
      throw new Error(
        payload?.detail ||
          payload?.error ||
          `Frame processing failed with ${response.status}.`,
      );
    }

    return normalizeAnalyticsPayload(await response.json());
  }

  async complete() {}

  dispose() {}
}

export class WebSocketFrameTransport implements FrameTransport {
  mode = "websocket" as const;
  private socket: WebSocket | null = null;
  private pending:
    | {
        resolve: (value: AnalyticsResult) => void;
        reject: (reason?: unknown) => void;
      }
    | null = null;
  private readonly handlers: TransportEventHandlers;

  constructor(handlers: TransportEventHandlers) {
    this.handlers = handlers;
  }

  async start(session: { filename: string; targetFps: number }) {
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(fognetEndpoints.processStream);
      this.socket = socket;

      const timeoutId = window.setTimeout(() => {
        socket.close();
        reject(new Error("WebSocket connection timed out."));
      }, 3000);

      socket.onopen = () => {
        window.clearTimeout(timeoutId);
        socket.send(
          JSON.stringify({
            type: "start",
            filename: session.filename,
            target_fps: session.targetFps,
          }),
        );
        this.handlers.onStatus("WebSocket stream connected.", this.mode);
        resolve();
      };

      socket.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Unable to open WebSocket transport."));
      };

      socket.onclose = () => {
        if (this.pending) {
          this.pending.reject(new Error("WebSocket transport closed."));
          this.pending = null;
        }
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(String(event.data)) as Record<string, unknown>;
        const messageType = typeof payload.type === "string" ? payload.type : "";

        if (messageType === "status") {
          this.handlers.onStatus(
            typeof payload.detail === "string"
              ? payload.detail
              : "WebSocket status update.",
            this.mode,
          );
          return;
        }

        if (messageType === "complete") {
          this.handlers.onStatus(
            typeof payload.detail === "string"
              ? payload.detail
              : "WebSocket stream complete.",
            this.mode,
          );
          return;
        }

        if (messageType === "error") {
          const detail =
            typeof payload.detail === "string"
              ? payload.detail
              : "WebSocket frame processing failed.";
          this.handlers.onError(detail, this.mode);
          if (this.pending) {
            this.pending.reject(new Error(detail));
            this.pending = null;
          }
          return;
        }

        if (messageType === "result" && this.pending) {
          this.pending.resolve(normalizeAnalyticsPayload(payload));
          this.pending = null;
        }
      };
    });
  }

  async sendFrame(frame: ProcessingFrame) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket transport is not open.");
    }

    return new Promise<AnalyticsResult>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.socket?.send(
        JSON.stringify({
          type: "frame",
          frame_index: frame.frameIndex,
          timestamp: frame.timestamp,
          image: frame.base64,
        }),
      );
    });
  }

  async complete() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({ type: "end" }));
  }

  dispose() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.pending = null;
  }
}
