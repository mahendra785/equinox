"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "◇", label: "Dashboard" },
  { href: "/alerts", icon: "◎", label: "Alerts" },
  { href: "/heatmap", icon: "□", label: "Heatmap" },
  { href: "/analytics", icon: "◫", label: "Analytics" },
  { href: "/settings", icon: "◧", label: "Settings" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <nav
      className="sidebar"
      style={{
        padding: "20px 12px",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "4px 8px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            background: "var(--amber)",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            color: "#0a0d11",
            flexShrink: 0,
          }}
        >
          FN
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
            }}
          >
            FOGNET
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
            }}
          >
            v1.0.0
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          className="pulse-green"
          style={{
            width: 7,
            height: 7,
            background: "var(--green)",
            borderRadius: "50%",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--green)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Operational
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "0 12px",
            marginBottom: 8,
          }}
        >
          Navigation
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link ${path === item.href ? "active" : ""}`}
              href={item.href}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          marginTop: "auto",
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ padding: "8px 12px", marginBottom: 8 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Operator
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            demo@fognet.io
          </div>
        </div>
        <Link className="nav-link" href="/dashboard" style={{ fontSize: 10 }}>
          <span>↩</span> Return
        </Link>
      </div>
    </nav>
  );
}
