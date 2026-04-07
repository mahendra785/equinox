"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "../components/Sidebar";
import { fetchHeatmapSnapshot } from "../dashboard/services/fognet-api";
import { normalizeHeatmapCells, type HeatmapCell } from "./normalizeCells";

const HeatmapMap = dynamic(() => import("./HeatmapMap"), {
  ssr: false,
  loading: () => (
    <div className="card" style={{ padding: 24, minHeight: 520 }}>
      Loading OpenStreetMap tiles...
    </div>
  ),
});

export default function HeatmapPage() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [status, setStatus] = useState("Waiting for backend heatmap data...");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHeatmap() {
      try {
        const snapshot = await fetchHeatmapSnapshot();
        if (!active) {
          return;
        }

        const nextCells = normalizeHeatmapCells(snapshot.raw);
        setCells(nextCells);
        setLastRefresh(new Date().toLocaleTimeString());
        setStatus(
          nextCells.length
            ? `Loaded ${nextCells.length} heatmap cells from the backend.`
            : "Backend is reachable, but no heatmap cells are available yet.",
        );
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus(
          error instanceof Error
            ? error.message
            : "Heatmap request failed unexpectedly.",
        );
      }
    }

    void loadHeatmap();
    const intervalId = window.setInterval(() => {
      void loadHeatmap();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const stats = useMemo(() => {
    const totalEvents = cells.reduce((sum, cell) => sum + cell.event_count, 0);
    const maxDanger = cells.reduce(
      (maxValue, cell) => Math.max(maxValue, cell.max_danger_score, cell.danger_index),
      0,
    );
    const highestRisk =
      cells.find((cell) => cell.risk_level === "HIGH")?.risk_level ??
      cells.find((cell) => cell.risk_level === "MEDIUM")?.risk_level ??
      cells.find((cell) => cell.risk_level === "LOW")?.risk_level ??
      "UNKNOWN";

    return { totalEvents, maxDanger, highestRisk };
  }, [cells]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main" style={{ padding: 24 }}>
        <div className="heatmap-dashboard-card">
          <div className="heatmap-dashboard-header">
            <div className="heatmap-brand">FogNet</div>
            <div>
              <h1 className="heatmap-title">Road Danger Heatmap Dashboard</h1>
              <p className="heatmap-subtitle">
                View live heatmaps for road safety using free OpenStreetMap-based tiles.
              </p>
            </div>
            <div className="heatmap-badge">
              <span className="heatmap-badge-dot" />
              {stats.highestRisk}
            </div>
          </div>

          <HeatmapMap cells={cells} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Heatmap Cells
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{cells.length}</div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Aggregated Events
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totalEvents}</div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Peak Danger
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.maxDanger.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Last Refresh
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{lastRefresh ?? "never"}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 18, marginTop: 16 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Backend Feed
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {status} The backend should return dense `cells` across the route corridor to
            produce a natural heat surface instead of isolated blobs.
          </div>
        </div>
      </main>
    </div>
  );
}
