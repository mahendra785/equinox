"use client";

import type { DebugEntry } from "../types";

interface DebugLogProps {
  logs: DebugEntry[];
}

function colorForLevel(level: DebugEntry["level"]) {
  if (level === "error") {
    return "var(--red)";
  }
  if (level === "warn") {
    return "var(--amber)";
  }
  return "var(--green)";
}

export default function DebugLog(props: DebugLogProps) {
  return (
    <section className="card" style={{ padding: 18 }}>
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
        Debug / Event Log
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        {props.logs.length ? (
          props.logs.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 52px 1fr",
                gap: 10,
                alignItems: "start",
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>{entry.time}</span>
              <span style={{ color: colorForLevel(entry.level), textTransform: "uppercase" }}>
                {entry.level}
              </span>
              <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {entry.message}
              </span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Event logs appear here once the dashboard starts talking to FogNet.
          </div>
        )}
      </div>
    </section>
  );
}
