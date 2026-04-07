"use client";

import { useState } from "react";
import type {
  AnalyticsResult,
  BroadcastState,
  ConnectionState,
  HealthSnapshot,
  HeatmapSnapshot,
  RiskLevel,
  TransportMode,
} from "../types";

interface AnalyticsPanelProps {
  analytics: AnalyticsResult | null;
  batchOutputPath: string | null;
  broadcastState: BroadcastState;
  connectionState: ConnectionState;
  effectiveFps: number;
  errorText: string | null;
  health: HealthSnapshot | null;
  heatmap: HeatmapSnapshot | null;
  pendingFrames: number;
  processedFrames: number;
  droppedFrames: number;
  reportUrl: string;
  streamUrl: string;
  transportMode: TransportMode;
  onBroadcast: (latitude: number, longitude: number) => void;
}

function riskColor(risk: RiskLevel | undefined) {
  if (risk === "HIGH") {
    return "var(--red)";
  }
  if (risk === "MEDIUM") {
    return "var(--amber)";
  }
  if (risk === "LOW") {
    return "var(--green)";
  }
  return "var(--text-secondary)";
}

function transportLabel(mode: TransportMode) {
  if (mode === "websocket") {
    return "WebSocket";
  }
  if (mode === "http-frame") {
    return "HTTP Frames";
  }
  return "Batch Video";
}

export default function AnalyticsPanel(props: AnalyticsPanelProps) {
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const color = riskColor(props.analytics?.risk);
  const dangerValue = props.analytics?.dangerScore ?? 0;
  const visibility = props.analytics?.visibility ?? 0;
  const objects = props.analytics?.objects ?? {};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
      <section className="card card-warn" style={{ padding: 18 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Live Analytics
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${color}44`,
              background: `${color}15`,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Risk
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>
              {props.analytics?.risk ?? "WAITING"}
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Danger Score
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{dangerValue.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Visibility
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {(visibility * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <span>Visibility meter</span>
            <span>{visibility.toFixed(2)}</span>
          </div>
          <div
            style={{
              height: 8,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(0, Math.min(100, visibility * 100))}%`,
                background:
                  visibility < 0.35
                    ? "var(--red)"
                    : visibility < 0.65
                      ? "var(--amber)"
                      : "var(--green)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {Object.entries(objects).length ? (
            Object.entries(objects).map(([key, value]) => (
              <div key={key} className="card" style={{ padding: 12 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {key}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1", color: "var(--text-muted)", fontSize: 13 }}>
              Object counts will appear as processed frames return.
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Effective FPS
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{props.effectiveFps.toFixed(1)}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Processed Frames
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{props.processedFrames}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Dropped / Pending
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {props.droppedFrames} / {props.pendingFrames}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Transport: <strong>{transportLabel(props.transportMode)}</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Connection: <strong>{props.connectionState}</strong>
          </div>
          {props.batchOutputPath ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                wordBreak: "break-all",
              }}
            >
              Batch output path: <strong>{props.batchOutputPath}</strong>
            </div>
          ) : null}
          {props.errorText ? (
            <div style={{ fontSize: 12, color: "var(--red)" }}>{props.errorText}</div>
          ) : null}
        </div>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        <section className="card card-info" style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Backend Status
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Health: <strong>{props.health?.label ?? "unknown"}</strong>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Heatmap points: <strong>{props.heatmap?.points ?? 0}</strong>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Max heatmap danger: <strong>{(props.heatmap?.maxDanger ?? 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <a className="btn" href={props.streamUrl} rel="noreferrer" target="_blank">
                Open /stream
              </a>
              <a className="btn" href={props.reportUrl} rel="noreferrer" target="_blank">
                Download /report
              </a>
            </div>
          </div>
        </section>

        <section className="card card-ok" style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Broadcast Alert
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <input
              className="input"
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="Latitude"
              value={latitude}
            />
            <input
              className="input"
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="Longitude"
              value={longitude}
            />
            <button
              className="btn btn-primary"
              disabled={props.broadcastState.pending}
              onClick={() => props.onBroadcast(Number(latitude), Number(longitude))}
              type="button"
            >
              {props.broadcastState.pending ? "Sending..." : "POST /broadcast"}
            </button>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {props.broadcastState.message ??
                "Push the current danger score and location to the backend alert pipeline."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
