"use client";
import { useState } from "react";
import Sidebar from "../components/Sidebar";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        background: value ? "var(--amber)" : "var(--border)",
        position: "relative", transition: "background 0.25s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: value ? "#0a0d11" : "var(--text-muted)",
        transition: "left 0.25s",
      }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--amber)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <div>
        <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    autoCycle: true,
    alertSound: true,
    meshBroadcast: true,
    heatmapUpdate: true,
    skipFrames: 3,
    resolution: "320x240",
    model: "MobileNetV3-Large",
    alertThreshold: 0.35,
    broadcastRadius: 2.0,
    fps: 15,
  });

  const set = (key: string, val: unknown) => setSettings(prev => ({ ...prev, [key]: val }));

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main" style={{ padding: 24, maxWidth: 800 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 4 }}>Settings</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pipeline configuration · alert thresholds · system preferences</p>
        </div>

        <Section title="Camera Pipeline">
          <Row label="Resolution" sub="Input frame dimensions for segmentation model">
            <select
              value={settings.resolution}
              onChange={e => set("resolution", e.target.value)}
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "6px 10px", outline: "none" }}
            >
              {["320x240", "640x480", "1280x720"].map(r => <option key={r}>{r}</option>)}
            </select>
          </Row>
          <Row label="Frame Skip" sub="Process every Nth frame to reduce CPU load">
            <input
              type="number" min={1} max={10} value={settings.skipFrames}
              onChange={e => set("skipFrames", +e.target.value)}
              className="input-field" style={{ width: 80, textAlign: "center", fontFamily: "var(--font-mono)" }}
            />
          </Row>
          <Row label="Target FPS" sub="Maximum frames per second for processing pipeline">
            <input
              type="number" min={1} max={30} value={settings.fps}
              onChange={e => set("fps", +e.target.value)}
              className="input-field" style={{ width: 80, textAlign: "center", fontFamily: "var(--font-mono)" }}
            />
          </Row>
          <Row label="Segmentation Model" sub="Neural network backbone for scene parsing">
            <select
              value={settings.model}
              onChange={e => set("model", e.target.value)}
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "6px 10px", outline: "none" }}
            >
              {["MobileNetV3-Large", "MobileNetV3-Small", "ResNet-50", "ResNet-101"].map(m => <option key={m}>{m}</option>)}
            </select>
          </Row>
          <Row label="Auto Cycle Demo" sub="Automatically vary fog intensity in simulation mode">
            <Toggle value={settings.autoCycle} onChange={v => set("autoCycle", v)} />
          </Row>
        </Section>

        <Section title="Alert Configuration">
          <Row label="Dense Fog Threshold" sub={`Alert triggers when visibility score drops below ${settings.alertThreshold}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--amber)", width: 40, textAlign: "right" }}>{settings.alertThreshold.toFixed(2)}</span>
              <input
                type="range" min="0.1" max="0.6" step="0.01"
                value={settings.alertThreshold}
                onChange={e => set("alertThreshold", +e.target.value)}
                style={{ width: 120, accentColor: "var(--amber)" }}
              />
            </div>
          </Row>
          <Row label="Broadcast Radius" sub="Mesh alert radius in kilometers">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", width: 40, textAlign: "right" }}>{settings.broadcastRadius.toFixed(1)}km</span>
              <input
                type="range" min="0.5" max="5" step="0.5"
                value={settings.broadcastRadius}
                onChange={e => set("broadcastRadius", +e.target.value)}
                style={{ width: 120, accentColor: "var(--cyan)" }}
              />
            </div>
          </Row>
          <Row label="Alert Sound" sub="Play audio notification on critical events">
            <Toggle value={settings.alertSound} onChange={v => set("alertSound", v)} />
          </Row>
          <Row label="Mesh Broadcast" sub="Auto-broadcast alerts to nearby vehicles via P2P mesh">
            <Toggle value={settings.meshBroadcast} onChange={v => set("meshBroadcast", v)} />
          </Row>
          <Row label="Live Heatmap Updates" sub="Push visibility data to authority dashboard API">
            <Toggle value={settings.heatmapUpdate} onChange={v => set("heatmapUpdate", v)} />
          </Row>
        </Section>

        <Section title="Account">
          <Row label="Operator Email" sub="Currently signed in account">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>demo@fognet.io</span>
          </Row>
          <Row label="API Key" sub="For heatmap dashboard integration">
            <div style={{ display: "flex", gap: 8 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", background: "var(--bg-surface)", padding: "4px 10px", borderRadius: 6 }}>fn_••••••••••••••••</code>
              <button className="btn-ghost" style={{ fontSize: 9, padding: "4px 10px" }}>REVEAL</button>
            </div>
          </Row>
        </Section>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost">Reset Defaults</button>
          <button className="btn-primary">Save Settings →</button>
        </div>
      </main>
    </div>
  );
}