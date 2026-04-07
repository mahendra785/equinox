"use client";

import Image from "next/image";
import type { DashboardMedia } from "../types";

interface LiveVideoPaneProps {
  accentColor: string;
  badgeText: string;
  fallbackText: string;
  media: DashboardMedia | null;
  title: string;
  videoMode?: "muted" | "controls";
}

export default function LiveVideoPane(props: LiveVideoPaneProps) {
  return (
    <section>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: props.accentColor,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {props.title}
      </div>
      <div
        className="card"
        style={{
          padding: 0,
          position: "relative",
          overflow: "hidden",
          background: "#000",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {props.media ? (
          props.media.kind === "video" ? (
            <video
              autoPlay
              className="h-full w-full object-contain"
              controls={props.videoMode !== "muted"}
              loop
              muted={props.videoMode === "muted"}
              playsInline
              src={props.media.url}
            />
          ) : (
            <Image
              alt={props.title}
              className="h-full w-full object-contain"
              fill
              sizes="(max-width: 1200px) 100vw, 50vw"
              src={props.media.url}
              unoptimized
            />
          )
        ) : (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              fontSize: 13,
              color: "rgba(255,255,255,0.28)",
              lineHeight: 1.6,
            }}
          >
            {props.fallbackText}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 12px",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: props.accentColor,
              letterSpacing: "0.08em",
            }}
          >
            {props.badgeText}
          </span>
        </div>
      </div>
    </section>
  );
}
