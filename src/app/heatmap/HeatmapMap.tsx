"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Pane,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatmapCell = {
  cell_id: string;
  center_latitude: number;
  center_longitude: number;
  event_count: number;
  avg_danger_score: number;
  max_danger_score: number;
  danger_index: number;
  risk_level: string;
  last_seen: string;
};

interface HeatmapMapProps {
  cells: HeatmapCell[];
}

function heatIntensity(cell: HeatmapCell) {
  return Math.max(0.18, Math.min(1, cell.danger_index));
}

function ringColor(cell: HeatmapCell) {
  if (cell.danger_index >= 0.9) {
    return "#ff4d4f";
  }
  if (cell.danger_index >= 0.4) {
    return "#f4b740";
  }
  return "#57c86d";
}

function HeatLayer({ cells }: { cells: HeatmapCell[] }) {
  const map = useMap();

  useEffect(() => {
    const heatPoints = cells.map((cell) => [
      cell.center_latitude,
      cell.center_longitude,
      heatIntensity(cell),
    ]) as [number, number, number][];

    const heatLayer = (
      L as typeof L & {
        heatLayer: (
          latlngs: [number, number, number][],
          options: Record<string, unknown>,
        ) => L.Layer;
      }
    ).heatLayer(heatPoints, {
      radius: 38,
      blur: 32,
      maxZoom: 15,
      minOpacity: 0.28,
      gradient: {
        0.15: "#4ea45d",
        0.39: "#68cc73",
        0.4: "#f3b340",
        0.89: "#ffb347",
        0.9: "#ff8c32",
        1.0: "#ef4444",
      },
    });

    heatLayer.addTo(map);

    return () => {
      heatLayer.remove();
    };
  }, [cells, map]);

  return null;
}

function FitBounds({ cells }: { cells: HeatmapCell[] }) {
  const map = useMap();

  useEffect(() => {
    if (!cells.length) {
      return;
    }

    const bounds = L.latLngBounds(
      cells.map(
        (cell) =>
          [cell.center_latitude, cell.center_longitude] as [number, number],
      ),
    );
    map.fitBounds(bounds.pad(0.22), {
      animate: true,
      duration: 0.8,
    });
  }, [cells, map]);

  return null;
}

export default function HeatmapMap(props: HeatmapMapProps) {
  const center = props.cells[0]
    ? ([props.cells[0].center_latitude, props.cells[0].center_longitude] as [
        number,
        number,
      ])
    : ([12.9716, 77.5946] as [number, number]);

  return (
    <div className="heatmap-shell">
      <MapContainer
        center={center}
        className="heatmap-canvas"
        scrollWheelZoom
        zoom={12}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <Pane name="glow-rings" style={{ zIndex: 450 }}>
          {props.cells.map((cell) => (
            <CircleMarker
              key={cell.cell_id}
              center={[cell.center_latitude, cell.center_longitude]}
              color={ringColor(cell)}
              fillColor={ringColor(cell)}
              fillOpacity={0.12}
              opacity={0.9}
              radius={Math.max(8, Math.min(20, 6 + cell.event_count * 0.9))}
              weight={2}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    {cell.cell_id}
                  </div>
                  <div>Risk: {cell.risk_level}</div>
                  <div>Danger index: {cell.danger_index.toFixed(2)}</div>
                  <div>Events: {cell.event_count}</div>
                  <div>Avg danger: {cell.avg_danger_score.toFixed(2)}</div>
                  <div>Max danger: {cell.max_danger_score.toFixed(2)}</div>
                  <div>Last seen: {cell.last_seen || "n/a"}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </Pane>

        <HeatLayer cells={props.cells} />
        <FitBounds cells={props.cells} />
      </MapContainer>

      <div className="heatmap-legend">
        <div className="heatmap-legend-title">Danger Scale</div>
        <div className="heatmap-legend-item">
          <span className="heatmap-dot heatmap-dot-safe" />
          Safe
        </div>
        <div className="heatmap-legend-item">
          <span className="heatmap-dot heatmap-dot-moderate" />
          Moderate
        </div>
        <div className="heatmap-legend-item">
          <span className="heatmap-dot heatmap-dot-danger" />
          Danger
        </div>
      </div>
    </div>
  );
}
