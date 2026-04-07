"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Sidebar from "../components/Sidebar";
import AnalyticsPanel from "./components/AnalyticsPanel";
import DebugLog from "./components/DebugLog";
import LiveVideoPane from "./components/LiveVideoPane";
import UploadPanel from "./components/UploadPanel";
import { useLiveVideoProcessing } from "./hooks/useLiveVideoProcessing";
import { normalizeHeatmapCells } from "../heatmap/normalizeCells";

const HeatmapMap = dynamic(() => import("../heatmap/HeatmapMap"), {
  ssr: false,
  loading: () => (
    <div className="card" style={{ padding: 24, minHeight: 420 }}>
      Loading heat overlay...
    </div>
  ),
});

export default function DashboardPage() {
  const live = useLiveVideoProcessing();
  const heatmapCells = useMemo(
    () => normalizeHeatmapCells(live.heatmap?.raw),
    [live.heatmap],
  );

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
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
                marginBottom: 8,
              }}
            >
              FogNet Control Room
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
              Real-time media processing dashboard
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 760 }}>
              The browser decodes local video, samples frames at 15 FPS, sends them
              over WebSocket first, falls back to HTTP frame inference, and only uses
              batch upload if live transport is unavailable.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span className="badge badge-clear">
              <span className="badge-dot" />
              Health: {live.health?.label ?? "checking"}
            </span>
            <span className="badge badge-warn">
              <span className="badge-dot" />
              Transport: {live.transportMode}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <UploadPanel
            connectionState={live.connectionState}
            disabled={live.connectionState === "batch-processing"}
            fileName={live.selectedFileName}
            onFileSelect={live.startProcessing}
            statusText={live.statusText}
            targetFps={live.targetFps}
            transportMode={live.transportMode}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <LiveVideoPane
              accentColor="var(--text-secondary)"
              badgeText="LOCAL SOURCE"
              fallbackText="Original preview starts as soon as you choose a file."
              media={
                live.originalPreviewUrl
                  ? { kind: "video", url: live.originalPreviewUrl }
                  : null
              }
              title="Original Preview"
              videoMode="muted"
            />
            <LiveVideoPane
              accentColor="var(--cyan)"
              badgeText={
                live.processedMedia?.kind === "video"
                  ? "BATCH OUTPUT"
                  : "LIVE PROCESSED"
              }
              fallbackText="Processed frames from FogNet will appear here."
              media={live.processedMedia}
              title="Processed Preview"
              videoMode="controls"
            />
          </div>

          <AnalyticsPanel
            analytics={live.analytics}
            batchOutputPath={live.batchOutputPath}
            broadcastState={live.broadcastState}
            connectionState={live.connectionState}
            droppedFrames={live.droppedFrames}
            effectiveFps={live.effectiveFps}
            errorText={live.errorText}
            geoTrack={live.geoTrack}
            health={live.health}
            heatmap={live.heatmap}
            onBroadcast={live.submitBroadcast}
            pendingFrames={live.pendingFrames}
            processedFrames={live.processedFrames}
            reportUrl={live.reportUrl}
            streamUrl={live.streamUrl}
            transportMode={live.transportMode}
          />

          <section className="card" style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
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
                  Live Heat Overlay
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  Backend `cells` rendered as a smoothed heat layer using `danger_index`.
                </div>
              </div>
              <span className="badge badge-warn">
                <span className="badge-dot" />
                {heatmapCells.length} cells
              </span>
            </div>
            <HeatmapMap cells={heatmapCells} />
          </section>

          <DebugLog logs={live.logs} />
        </div>
      </main>
    </div>
  );
}
