"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

type Alert = {
  id: string;
  time: string;
  severity: "critical" | "warning" | "info";
  location: string;
  score: number;
  label: string;
  vehicles: number;
  broadcast: string;
  acked: boolean;
};

function generateAlert(): Alert {
  const locs = ["NH-48 · KM 142", "OMR Flyover", "ECR · KM 28", "GST Road · KM 17", "Poonamallee Highway"];
  const score = Math.random() * 0.9 + 0.05;

  return {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    time: new Date().toLocaleTimeString(),
    severity: score < 0.3 ? "critical" : score < 0.6 ? "warning" : "info",
    location: locs[Math.floor(Math.random() * locs.length)],
    score: +score.toFixed(3),
    label: score < 0.3 ? "DENSE FOG" : score < 0.6 ? "LIGHT FOG" : "CLEAR",
    vehicles: Math.floor(Math.random() * 18) + 2,
    broadcast: `${(Math.random() * 2 + 0.5).toFixed(1)}km radius`,
    acked: false,
  };
}

const initialAlerts: Alert[] = Array.from({ length: 8 }, generateAlert).map((a, i) => ({
  ...a,
  time: new Date(Date.now() - i * 95000).toLocaleTimeString(),
  acked: i > 4,
}));

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        setAlerts(prev => [generateAlert(), ...prev.slice(0, 49)]);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const ack = (id: string) =>
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, acked: true } : a)));

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);

  const counts = {
    critical: alerts.filter(a => a.severity === "critical" && !a.acked).length,
    warning: alerts.filter(a => a.severity === "warning" && !a.acked).length,
    info: alerts.filter(a => a.severity === "info" && !a.acked).length,
  };

  const severityConfig = {
    critical: { color: "var(--red)", label: "CRITICAL" },
    warning: { color: "var(--amber)", label: "WARNING" },
    info: { color: "var(--green)", label: "CLEAR" },
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content" style={{ padding: 24 }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Alerts</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Real-time visibility events · mesh broadcast log
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p>Total Alerts</p>
            <h2>{alerts.length}</h2>
          </div>
          <div className="card">
            <p style={{ color: "var(--red)" }}>Critical</p>
            <h2>{counts.critical}</h2>
          </div>
          <div className="card">
            <p style={{ color: "var(--amber)" }}>Warnings</p>
            <h2>{counts.warning}</h2>
          </div>
          <div className="card">
            <p style={{ color: "var(--green)" }}>Acknowledged</p>
            <h2>{alerts.filter(a => a.acked).length}</h2>
          </div>
        </div>

        {/* FILTER */}
        <div style={{ marginBottom: 16 }}>
          {["all", "critical", "warning", "info"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className="btn"
              style={{ marginRight: 8 }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Severity</th>
                <th>Location</th>
                <th>Score</th>
                <th>Vehicles</th>
                <th>Broadcast</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(alert => {
                const cfg = severityConfig[alert.severity];

                return (
                  <tr key={alert.id}>
                    <td>{alert.id}</td>
                    <td>{alert.time}</td>
                    <td style={{ color: cfg.color }}>{cfg.label}</td>
                    <td>{alert.location}</td>
                    <td style={{ color: cfg.color }}>{alert.score}</td>
                    <td>{alert.vehicles}</td>
                    <td>{alert.broadcast}</td>
                    <td>
                      {alert.acked ? (
                        "ACKED"
                      ) : (
                        <button className="btn" onClick={() => ack(alert.id)}>
                          ACK
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}