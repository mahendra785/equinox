"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface FrameMetric {
  brightness: number;
  contrast: number;
  score: number;
}

// ── analyse a canvas snapshot ─────────────────────────────────────────────────

function analyzeCanvas(canvas: HTMLCanvasElement): FrameMetric {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { brightness: 0, contrast: 0, score: 0 };
  const w = Math.min(canvas.width, 160);
  const h = Math.min(canvas.height, 90);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, sumSq = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    sum += lum;
    sumSq += lum * lum;
  }
  const mean = sum / n;
  const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  const brightness = +(mean / 255).toFixed(3);
  const contrast = +(std / 128).toFixed(3);
  const score = +Math.min(1, contrast * 0.6 + brightness * 0.4).toFixed(3);
  return { brightness, contrast, score };
}

// ── Corner brackets ───────────────────────────────────────────────────────────

function Brackets() {
  const s: React.CSSProperties = { position: "absolute", width: 14, height: 14 };
  const b = "2px solid var(--cyan, #22d3ee)";
  return (
    <>
      <div style={{ ...s, top: 6, left: 6, borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 6, right: 6, borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 6, left: 6, borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 6, right: 6, borderBottom: b, borderRight: b }} />
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [procProgress, setProcProgress] = useState(0);
  const [procText, setProcText] = useState("");
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // live metrics for current displayed frame
  const [metrics, setMetrics] = useState<FrameMetric & {
    label: string; labelColor: string; history: number[];
  }>({
    brightness: 0, contrast: 0, score: 0,
    label: "NO SIGNAL", labelColor: "#888",
    history: Array(60).fill(0),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement | null>(null);
  const rawBoxRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processingVideoRef = useRef<HTMLVideoElement | null>(null);
  const uploadUrlRef = useRef<string | null>(null);
  const extractionRunRef = useRef(0);

  // stored frames + metrics
  const framesRef = useRef<string[]>([]);
  const frameMetricsRef = useRef<FrameMetric[]>([]);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIdxRef = useRef(0);
  const historyRef = useRef<number[]>(Array(60).fill(0));

  // ── stop any running playback ──────────────────────────────────────────────
  function stopPlayback() {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }

  function stopProcessing() {
    extractionRunRef.current += 1;

    if (rawVideoRef.current) {
      rawVideoRef.current.pause();
      rawVideoRef.current.src = "";
      rawVideoRef.current.load();
      rawVideoRef.current.remove();
      rawVideoRef.current = null;
    }

    if (processingVideoRef.current) {
      processingVideoRef.current.pause();
      processingVideoRef.current.src = "";
      processingVideoRef.current.load();
      processingVideoRef.current = null;
    }

    if (uploadUrlRef.current) {
      URL.revokeObjectURL(uploadUrlRef.current);
      uploadUrlRef.current = null;
    }
  }

  function resetDisplay() {
    setReady(false);
    setProcessing(false);
    setProcProgress(0);
    setProcText("");
    framesRef.current = [];
    frameMetricsRef.current = [];
    frameIdxRef.current = 0;
    historyRef.current = Array(60).fill(0);
    setMetrics({
      brightness: 0,
      contrast: 0,
      score: 0,
      label: "NO SIGNAL",
      labelColor: "#888",
      history: Array(60).fill(0),
    });
  }

  // ── play extracted frames at 15fps ────────────────────────────────────────
  function playFrames() {
    const frames = framesRef.current;
    const metricsArr = frameMetricsRef.current;
    const canvas = displayCanvasRef.current;
    if (!frames.length || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const idx = frameIdxRef.current;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // 15fps stamp overlay
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(8, canvas.height - 26, 140, 18);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 10px 'Space Mono', monospace";
      ctx.fillText(`15 FPS · ${new Date().toLocaleTimeString()}`, 14, canvas.height - 13);

      const m = metricsArr[idx];
      let label = "CLEAR";
      let labelColor = "#22c55e";
      if (m.score < 0.25) { label = "DENSE FOG"; labelColor = "#ef4444"; }
      else if (m.score < 0.55) { label = "LIGHT FOG"; labelColor = "#fbbf24"; }

      historyRef.current.push(m.score);
      historyRef.current.shift();

      setMetrics({
        ...m,
        label,
        labelColor,
        history: [...historyRef.current],
      });

      frameIdxRef.current = (idx + 1) % frames.length;
      playTimerRef.current = setTimeout(playFrames, 1000 / 15);
    };
    img.src = frames[idx];
  }

  async function extractFrames(videoUrl: string, runId: number) {
    const processingVideo = document.createElement("video");
    processingVideo.src = videoUrl;
    processingVideo.muted = true;
    processingVideo.playsInline = true;
    processingVideo.preload = "auto";
    processingVideoRef.current = processingVideo;

    await new Promise<void>((resolve, reject) => {
      processingVideo.onloadedmetadata = () => resolve();
      processingVideo.onerror = () => reject(new Error("Unable to load video metadata"));
    });

    if (extractionRunRef.current !== runId) {
      return;
    }

    const fps = 15;
    const total = Math.max(1, Math.floor(processingVideo.duration * fps));
    const offCanvas = document.createElement("canvas");
    offCanvas.width = processingVideo.videoWidth || 640;
    offCanvas.height = processingVideo.videoHeight || 360;
    const offCtx = offCanvas.getContext("2d");

    if (!offCtx) {
      throw new Error("Unable to create processing context");
    }

    const displayCanvas = displayCanvasRef.current;
    if (displayCanvas) {
      displayCanvas.width = offCanvas.width;
      displayCanvas.height = offCanvas.height;
    }

    setDuration(processingVideo.duration);
    setFrameCount(total);
    setProcText(`Streaming conversion to ${fps} fps...`);

    for (let i = 0; i < total; i += 1) {
      if (extractionRunRef.current !== runId) {
        return;
      }

      processingVideo.currentTime = i / fps;
      await new Promise<void>((resolve) => {
        processingVideo.onseeked = () => resolve();
      });

      if (extractionRunRef.current !== runId) {
        return;
      }

      offCtx.drawImage(processingVideo, 0, 0);
      framesRef.current.push(offCanvas.toDataURL("image/jpeg", 0.85));
      frameMetricsRef.current.push(analyzeCanvas(offCanvas));

      if (i === 0) {
        setReady(true);
        playFrames();
      }

      const pct = Math.round(((i + 1) / total) * 100);
      setProcProgress(pct);
      setProcText(`Converted ${i + 1} of ${total} frames to 15 fps`);

      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    if (extractionRunRef.current === runId) {
      setProcessing(false);
      setProcText("15 fps stream ready");
    }
  }

  // ── handle file upload & extraction ──────────────────────────────────────
  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    stopPlayback();
    stopProcessing();
    resetDisplay();
    setProcessing(true);
    setProcText("Starting background conversion...");
    setFileName(file.name);

    const url = URL.createObjectURL(file);
    uploadUrlRef.current = url;
    const runId = extractionRunRef.current + 1;
    extractionRunRef.current = runId;

    // Mount raw video for left panel display
    const rawVideo = document.createElement("video");
    rawVideo.src = url;
    rawVideo.muted = true;
    rawVideo.playsInline = true;
    rawVideo.preload = "auto";
    rawVideo.style.cssText = "width:100%;height:100%;object-fit:contain;display:block";
    rawVideo.loop = true;

    const rawBox = rawBoxRef.current;
    if (rawBox) {
      // remove any previous video
      rawBox.querySelectorAll("video").forEach(v => v.remove());
      rawBox.appendChild(rawVideo);
    }

    await new Promise<void>(res => { rawVideo.onloadedmetadata = () => res(); });
    rawVideoRef.current = rawVideo;
    rawVideo.play().catch(() => {});

    setDuration(rawVideo.duration);

    void extractFrames(url, runId).catch(() => {
      if (extractionRunRef.current !== runId) {
        return;
      }

      resetDisplay();
      setFileName(file.name);
      setProcText("Unable to convert video to 15 fps");
    });


    
  }

  // cleanup on unmount
  useEffect(() => () => {
    stopPlayback();
    stopProcessing();
  }, []);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString());

    updateTime();
    const intervalId = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  // ── derive vis info ───────────────────────────────────────────────────────
  const pipelineSteps = [
    { name: "Video Input",      detail: "MP4 · browser decode",  active: !!fileName },
    { name: "Frame Sampler",    detail: "15 fps · canvas 2D",    active: processing || ready },
    { name: "Pixel Analysis",   detail: "Brightness · Stddev",   active: processing || ready },
    { name: "Visibility Score", detail: "Weighted fusion",        active: processing || ready },
    { name: "Classification",   detail: "3-class threshold",      active: processing || ready },
  ];

  const signals = [
    { label: "Brightness", value: metrics.brightness, color: "#fbbf24" },
    { label: "Contrast",   value: metrics.contrast,   color: "#22d3ee" },
    { label: "Vis Score",  value: metrics.score,      color: metrics.labelColor },
  ];

  const advice = metrics.score < 0.25
    ? "Stop · Hazard lights on"
    : metrics.score < 0.55
    ? "Reduce speed · High beam off"
    : fileName ? "Normal conditions" : "Upload a video to analyse";

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main" style={{ padding: 24 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 4 }}>
              Live Feed
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Upload an MP4 — auto-converts to 15 fps · raw left · processed right
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              {currentTime || "--:--:--"} · {ready ? "15 FPS" : processing ? "PROCESSING" : "IDLE"}
            </span>
            {ready ? (
              <span className="badge badge-green" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="animate-blink" style={{ width: 5, height: 5, background: "var(--green)", borderRadius: "50%", display: "inline-block" }} />
                LIVE
              </span>
            ) : (
              <span className="badge" style={{ fontSize: 10 }}>{processing ? "PROCESSING" : "NO SIGNAL"}</span>
            )}
          </div>
        </div>

        {/* ── Upload strip ── */}
        <div
          className="card"
          style={{ padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
          onClick={() => !processing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/*"
            style={{ display: "none" }}
            onChange={handleFile}
          />
          <div style={{ width: 36, height: 36, borderRadius: 8, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
              {fileName || "Click to upload MP4"}
            </div>
            {fileName && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                {processing ? procText : `${frameCount} frames · ${formatTime(duration)} · 15 fps`}
              </div>
            )}
          </div>
        </div>

        {/* ── Processing progress bar ── */}
        {processing && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "#22d3ee", borderRadius: "50%", flexShrink: 0, animation: "spin 0.8s linear infinite" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", marginBottom: 5 }}>{procText}</div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${procProgress}%`, background: "#22d3ee", borderRadius: 2, transition: "width 0.2s" }} />
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#22d3ee" }}>{procProgress}%</span>
          </div>
        )}

        {/* ── Video row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Left: raw playback */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Raw Camera Input
            </div>
            <div
              ref={rawBoxRef}
              style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {!fileName && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Upload MP4 to begin</span>
                </div>
              )}
              <Brackets />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "6px 12px", display: "flex", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)", pointerEvents: "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>CAM-01 RAW</span>
                {fileName && <span className="animate-blink" style={{ width: 6, height: 6, background: "#ef4444", borderRadius: "50%", display: "inline-block", marginTop: 2 }} />}
              </div>
            </div>
          </div>

          {/* Right: 15fps canvas output */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan, #22d3ee)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              15 FPS Processed Output
            </div>
            <div style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <canvas
                ref={displayCanvasRef}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: ready ? "block" : "none" }}
              />
              {!ready && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    {processing ? "Processing…" : "15 fps output will appear here"}
                  </span>
                </div>
              )}
              <Brackets />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "6px 12px", display: "flex", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)", pointerEvents: "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan, #22d3ee)", letterSpacing: "0.08em" }}>15 FPS · CANVAS</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--amber, #fbbf24)" }}>{ready ? "15 fps" : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 220px", gap: 16 }}>

          {/* Visibility status */}
          <div className="card-amber" style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Visibility Status
            </div>
            <div style={{
              background: `${metrics.labelColor}18`,
              border: `1px solid ${metrics.labelColor}44`,
              borderRadius: 8, padding: "12px 14px", marginBottom: 16, transition: "all 0.6s"
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: metrics.labelColor, letterSpacing: "0.04em", transition: "color 0.6s" }}>
                {metrics.label}
              </div>
              <div style={{ fontSize: 11, color: `${metrics.labelColor}99`, marginTop: 4 }}>
                {advice}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: metrics.labelColor, transition: "color 0.6s" }}>
                {metrics.score.toFixed(3)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/ 1.00</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 6 }}>
              <div className="progress-fill" style={{ width: `${metrics.score * 100}%`, background: metrics.labelColor, transition: "width 0.4s, background 0.6s" }} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              1.0 = clear · 0.0 = zero visibility
            </div>
          </div>

          {/* Feature signals + history */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Feature Signals
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {signals.map(s => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: s.color }}>{s.value.toFixed(3)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${s.value * 100}%`, background: s.color, transition: "width 0.3s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Visibility History (Last 60 frames)
                </div>
                {ready && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--amber, #fbbf24)" }}>LIVE</div>}
              </div>
              <svg viewBox="0 0 60 40" style={{ width: "100%", height: 56, overflow: "visible" }}>
                {[0.25, 0.5, 0.75].map(t => (
                  <line key={t} x1="0" y1={40 - t * 40} x2="60" y2={40 - t * 40} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                ))}
                <polyline
                  points={metrics.history.map((v, i) => `${i},${40 - v * 40}`).join(" ")}
                  fill="none" stroke="var(--amber, #fbbf24)" strokeWidth="1" strokeLinejoin="round"
                />
                <line x1="0" y1={40 - 0.25 * 40} x2="60" y2={40 - 0.25 * 40} stroke="rgba(239,68,68,0.4)" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1="0" y1={40 - 0.55 * 40} x2="60" y2={40 - 0.55 * 40} stroke="rgba(34,197,94,0.4)" strokeWidth="0.8" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>

          {/* Pipeline */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Pipeline Status
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pipelineSteps.map(step => (
                <div key={step.name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    marginTop: 2, width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: step.active ? "var(--green, #22c55e)" : "var(--text-muted)",
                    boxShadow: step.active ? "0 0 6px var(--green, #22c55e)" : "none",
                    transition: "background 0.4s, box-shadow 0.4s",
                  }} />
                  <div>
                    <div style={{ fontSize: 11, color: step.active ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500, transition: "color 0.4s" }}>{step.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                Video Info
              </div>
              {fileName ? (
                <>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", marginBottom: 4, wordBreak: "break-all" }}>{fileName}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
                    {formatTime(duration)} · {frameCount} frames · 15 fps
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No video loaded</div>
              )}
            </div>
          </div>
        </div>

        {/* ── spinner keyframe ── */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </div>
  );
}
