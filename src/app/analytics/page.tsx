"use client";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

function LineChart({ data, color, label, height = 80 }: { data: number[]; color: string; label: string; height?: number }) {
  const w = 300, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 0.001;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 10) - 5}`).join(" ");
  const lastVal = data[data.length - 1];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color }}>{lastVal.toFixed(3)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1="0" y1={h * (1 - t)} x2={w} y2={h * (1 - t)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#grad-${label})`} stroke="none" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Last point dot */}
        {(() => {
          const lastPt = pts.split(" ").pop()?.split(",");
          if (!lastPt) return null;
          return <circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r="3" fill={color} />;
        })()}
      </svg>
    </div>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: `${color}22`, border: `1px solid ${color}44`, borderRadius: "3px 3px 0 0", height: `${(d.value / max) * 70}px`, transition: "height 0.6s ease" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.04em" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function generateTimeSeries(base: number, variance: number, n = 120) {
  const arr = [base];
  for (let i = 1; i < n; i++) arr.push(Math.max(0.05, Math.min(0.99, arr[i - 1] + (Math.random() - 0.5) * variance)));
  return arr;
}

const initialSeries = {
  visibility: generateTimeSeries(0.5, 0.06),
  roadContrast: generateTimeSeries(0.4, 0.05),
  skyFog: generateTimeSeries(0.5, 0.07),
  fps: Array.from({ length: 120 }, () => 13 + Math.random() * 3),
};

const hourlyAlerts = [
  { label: "00", value: 2 }, { label: "02", value: 5 }, { label: "04", value: 8 },
  { label: "06", value: 12 }, { label: "08", value: 6 }, { label: "10", value: 3 },
  { label: "12", value: 4 }, { label: "14", value: 2 }, { label: "16", value: 7 },
  { label: "18", value: 14 }, { label: "20", value: 18 }, { label: "22", value: 11 },
];

export default function AnalyticsPage() {
  const [series, setSeries] = useState(initialSeries);
  const [uptime] = useState("99.7%");

  useEffect(() => {
    const interval = setInterval(() => {
      setSeries(prev => ({
        visibility: [...prev.visibility.slice(1), Math.max(0.05, Math.min(0.95, prev.visibility[prev.visibility.length - 1] + (Math.random() - 0.5) * 0.06))],
        roadContrast: [...prev.roadContrast.slice(1), Math.max(0.05, Math.min(0.95, prev.roadContrast[prev.roadContrast.length - 1] + (Math.random() - 0.5) * 0.05))],
        skyFog: [...prev.skyFog.slice(1), Math.max(0.05, Math.min(0.95, prev.skyFog[prev.skyFog.length - 1] + (Math.random() - 0.5) * 0.07))],
        fps: [...prev.fps.slice(1), 13 + Math.random() * 3],
      }));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const avgVis = (series.visibility.reduce((a, b) => a + b, 0) / series.visibility.length).toFixed(3);
  const avgFps = (series.fps.reduce((a, b) => a + b, 0) / series.fps.length).toFixed(1);
  const alerts24h = hourlyAlerts.reduce((s, h) => s + h.value, 0);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main" style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 4 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Performance metrics · 24-hour rolling window</p>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Avg Visibility", value: avgVis, color: "var(--amber)", sub: "0–1 index" },
            { label: "Avg Frame Rate", value: `${avgFps}fps`, color: "var(--cyan)", sub: "target: 15fps" },
            { label: "Alerts (24h)", value: alerts24h, color: "var(--red)", sub: "broadcast events" },
            { label: "System Uptime", value: uptime, color: "var(--green)", sub: "last 30 days" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "20px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <LineChart data={series.visibility} color="var(--amber)" label="Visibility Score (last 120 readings)" height={100} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <LineChart data={series.skyFog} color="var(--red)" label="Sky Fog Signal (last 120 readings)" height={100} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <LineChart data={series.roadContrast} color="var(--cyan)" label="Road Contrast (last 120 readings)" height={100} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <LineChart data={series.fps} color="var(--green)" label="Frame Rate (fps)" height={100} />
          </div>
        </div>

        {/* Hourly alerts bar chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Hourly Alert Distribution (today)</div>
          <BarChart data={hourlyAlerts} color="var(--amber)" />
        </div>

        {/* Classification distribution */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16 }}>
          {[
            { label: "Dense Fog Events", pct: 18, color: "var(--red)" },
            { label: "Light Fog Events", pct: 47, color: "var(--amber)" },
            { label: "Clear Events", pct: 35, color: "var(--green)" },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{c.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, color: c.color, marginBottom: 12 }}>{c.pct}%</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${c.pct}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}