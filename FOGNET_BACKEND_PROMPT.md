Build the FogNet FastAPI backend to support near-live frontend processing.

Routes required:
- `GET /`
- `GET /health`
- `POST /process-video`
- `POST /process-image`
- `WS /ws/process-stream`
- `GET /stream`
- `GET /report`
- `POST /broadcast`
- `GET /heatmap`

Core behavior:
- `POST /process-video`
  Accepts multipart form-data with `video`
  Processes the full video
  Returns `video/mp4`
  Sets `X-Processed-Video-Path`
  Keeps the per-frame report downloadable from `GET /report`

- `POST /process-image`
  Accepts multipart form-data with:
  `image`
  optional `frame_index`
  optional `timestamp`
  Returns JSON:

```json
{
  "frame_index": 12,
  "timestamp": 0.8,
  "visibility": 0.42,
  "danger_score": 3.8,
  "risk": "MEDIUM",
  "objects": {
    "cars": 2,
    "people": 1,
    "animals": 0
  },
  "processed_image": "<base64-jpeg>"
}
```

- `WS /ws/process-stream`
  Accepts:

```json
{"type":"start","filename":"dashcam.mp4","target_fps":15}
```

```json
{"type":"frame","frame_index":12,"timestamp":0.8,"image":"<base64-jpeg>"}
```

```json
{"type":"end"}
```

  Sends:

```json
{"type":"status","detail":"stream_started","filename":"dashcam.mp4","target_fps":15}
```

```json
{
  "type":"result",
  "frame_index":12,
  "timestamp":0.8,
  "visibility":0.42,
  "danger_score":3.8,
  "risk":"MEDIUM",
  "objects":{"cars":2,"people":1,"animals":0},
  "processed_image":"<base64-jpeg>"
}
```

```json
{"type":"complete","detail":"stream_finished"}
```

```json
{"type":"error","detail":"..."}
```

Implementation notes:
- Reuse the same frame-analysis helpers across `/process-video`, `/process-image`, and `/ws/process-stream`
- Return processed JPEG frames as base64 in live responses
- Keep `GET /stream` compatible with MJPEG browser viewing
- Keep `GET /report` returning the latest frame report text file
- `POST /broadcast` should accept current danger score plus a location payload and return nearby alerts
- `GET /heatmap` should return all tracked points with danger scores
- `GET /health` should expose model/runtime readiness

Frontend compatibility target:
- Browser decodes local video and samples at 15 FPS
- Primary transport is `WS /ws/process-stream`
- Fallback is repeated `POST /process-image`
- Final fallback is `POST /process-video`
- Live dashboard expects latest-frame-wins behavior, low queue growth, and graceful error messages
