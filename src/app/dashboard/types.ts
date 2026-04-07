export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type TransportMode = "websocket" | "http-frame" | "batch";
export type ConnectionState =
  | "idle"
  | "connecting"
  | "streaming"
  | "falling-back"
  | "batch-processing"
  | "complete"
  | "error";
export type MediaKind = "image" | "video";
export type LogLevel = "info" | "warn" | "error";

export interface DashboardMedia {
  kind: MediaKind;
  url: string;
}

export interface AnalyticsResult {
  frameIndex: number;
  timestamp: number;
  visibility: number;
  dangerScore: number;
  risk: RiskLevel;
  objects: Record<string, number>;
  processedImage: string;
}

export interface ProcessingFrame {
  frameIndex: number;
  timestamp: number;
  blob: Blob;
  base64: string;
  width: number;
  height: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  filename: string;
}

export interface DebugEntry {
  id: string;
  level: LogLevel;
  message: string;
  time: string;
}

export interface HealthSnapshot {
  label: string;
  details: string;
  raw: unknown;
}

export interface HeatmapSnapshot {
  points: number;
  maxDanger: number;
  raw: unknown;
}

export interface BroadcastState {
  pending: boolean;
  message: string | null;
  alerts: number | null;
}

export interface BroadcastPayload {
  danger_score: number;
  risk: RiskLevel;
  latitude: number;
  longitude: number;
  timestamp: number;
  source: string;
}

export interface GeoSample {
  frameIndex: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  source: "synthetic-track";
}

export interface GeoTrack {
  samples: GeoSample[];
  hasEmbeddedLocation: boolean;
  metadata: Record<string, string>;
  note: string;
}
