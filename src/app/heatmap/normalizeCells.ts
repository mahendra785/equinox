export type HeatmapCell = {
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

export function normalizeHeatmapCells(payload: unknown): HeatmapCell[] {
  if (payload && typeof payload === "object") {
    const record = payload as { cells?: unknown; points?: unknown };

    if (Array.isArray(record.cells)) {
      return record.cells
        .filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry && typeof entry === "object"),
        )
        .map((entry, index) => ({
          cell_id: String(entry.cell_id ?? `cell-${index}`),
          center_latitude: Number(entry.center_latitude ?? entry.latitude ?? 0),
          center_longitude: Number(
            entry.center_longitude ?? entry.longitude ?? 0,
          ),
          event_count: Number(entry.event_count ?? entry.count ?? 0),
          avg_danger_score: Number(
            entry.avg_danger_score ?? entry.danger_score ?? 0,
          ),
          max_danger_score: Number(
            entry.max_danger_score ?? entry.danger_score ?? 0,
          ),
          danger_index: Number(entry.danger_index ?? entry.score ?? 0),
          risk_level: String(entry.risk_level ?? entry.risk ?? "UNKNOWN"),
          last_seen: String(entry.last_seen ?? ""),
        }))
        .filter(
          (entry) =>
            Number.isFinite(entry.center_latitude) &&
            Number.isFinite(entry.center_longitude),
        );
    }

    if (Array.isArray(record.points)) {
      return record.points
        .filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry && typeof entry === "object"),
        )
        .map((entry, index) => ({
          cell_id: String(entry.cell_id ?? `point-${index}`),
          center_latitude: Number(entry.center_latitude ?? entry.latitude ?? 0),
          center_longitude: Number(
            entry.center_longitude ?? entry.longitude ?? 0,
          ),
          event_count: Number(entry.event_count ?? entry.count ?? 1),
          avg_danger_score: Number(
            entry.avg_danger_score ?? entry.danger_score ?? 0,
          ),
          max_danger_score: Number(
            entry.max_danger_score ?? entry.danger_score ?? 0,
          ),
          danger_index: Number(entry.danger_index ?? entry.score ?? 0),
          risk_level: String(entry.risk_level ?? entry.risk ?? "UNKNOWN"),
          last_seen: String(entry.last_seen ?? ""),
        }))
        .filter(
          (entry) =>
            Number.isFinite(entry.center_latitude) &&
            Number.isFinite(entry.center_longitude),
        );
    }
  }

  return [];
}
