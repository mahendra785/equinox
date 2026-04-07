"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import type { ConnectionState, TransportMode } from "../types";

interface UploadPanelProps {
  disabled: boolean;
  fileName: string;
  onFileSelect: (file: File) => void;
  connectionState: ConnectionState;
  transportMode: TransportMode;
  targetFps: number;
  statusText: string;
}

function formatTransport(mode: TransportMode) {
  if (mode === "websocket") {
    return "WS /ws/process-stream";
  }
  if (mode === "http-frame") {
    return "POST /process-image";
  }
  return "POST /process-video";
}

export default function UploadPanel(props: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);

  function commitFile(file: File | null) {
    if (!file) {
      return;
    }
    props.onFileSelect(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    commitFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    commitFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <section className="card fade-in" style={{ padding: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Input Pipeline
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Start processing on file select
          </div>
        </div>
        <span
          className={`badge ${
            props.connectionState === "error"
              ? "badge-crit"
              : props.connectionState === "streaming"
                ? "badge-clear"
                : "badge-warn"
          }`}
        >
          <span className="badge-dot" />
          {props.connectionState.replace("-", " ")}
        </span>
      </div>

      <label
        style={{
          display: "grid",
          gap: 12,
          padding: 20,
          borderRadius: 12,
          border: dragActive
            ? "1px solid rgba(103,232,249,0.45)"
            : "1px dashed rgba(255,255,255,0.18)",
          background: dragActive ? "rgba(103,232,249,0.06)" : "var(--bg3)",
          cursor: props.disabled ? "not-allowed" : "pointer",
          opacity: props.disabled ? 0.75 : 1,
        }}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept="video/*"
          disabled={props.disabled}
          onChange={handleInputChange}
          style={{ display: "none" }}
          type="file"
        />
        <div style={{ fontSize: 15, fontWeight: 600 }}>
          Drag in dashcam footage or click to browse
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          FogNet starts frame extraction immediately, samples at {props.targetFps}{" "}
          FPS, and pushes frames over the fastest supported transport.
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
          }}
        >
          <span>Active transport: {formatTransport(props.transportMode)}</span>
          <span>Selected file: {props.fileName || "none"}</span>
        </div>
      </label>

      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.03)",
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        {props.statusText}
      </div>
    </section>
  );
}
