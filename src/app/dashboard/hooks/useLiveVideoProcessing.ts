"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildProcessedImageUrl,
  buildSyntheticGeoTrack,
  fetchHealthSnapshot,
  fetchHeatmapSnapshot,
  fognetEndpoints,
  HttpFrameTransport,
  postBroadcastAlert,
  processBatchVideo,
  WebSocketFrameTransport,
  type FrameTransport,
} from "../services/fognet-api";
import {
  startVideoFrameExtractor,
  type VideoFrameExtractorSession,
} from "../services/frame-extractor";
import type {
  AnalyticsResult,
  BroadcastState,
  ConnectionState,
  DashboardMedia,
  DebugEntry,
  GeoTrack,
  HealthSnapshot,
  HeatmapSnapshot,
  ProcessingFrame,
  TransportMode,
  VideoInfo,
} from "../types";

const TARGET_FPS = 15;

function makeLog(level: DebugEntry["level"], message: string): DebugEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    level,
    message,
    time: new Date().toLocaleTimeString(),
  };
}

function releaseBlobUrl(url: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function useLiveVideoProcessing() {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(
    null,
  );
  const [processedMedia, setProcessedMedia] = useState<DashboardMedia | null>(
    null,
  );
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [transportMode, setTransportMode] = useState<TransportMode>("websocket");
  const [effectiveFps, setEffectiveFps] = useState(0);
  const [processedFrames, setProcessedFrames] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [pendingFrames, setPendingFrames] = useState(0);
  const [statusText, setStatusText] = useState(
    "Select a video to begin live FogNet processing.",
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapSnapshot | null>(null);
  const [geoTrack, setGeoTrack] = useState<GeoTrack | null>(null);
  const [logs, setLogs] = useState<DebugEntry[]>([]);
  const [batchOutputPath, setBatchOutputPath] = useState<string | null>(null);
  const [broadcastState, setBroadcastState] = useState<BroadcastState>({
    pending: false,
    message: null,
    alerts: null,
  });

  const extractorRef = useRef<VideoFrameExtractorSession | null>(null);
  const transportRef = useRef<FrameTransport | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const queuedFrameRef = useRef<ProcessingFrame | null>(null);
  const inFlightRef = useRef(false);
  const extractorCompleteRef = useRef(false);
  const batchFallbackRef = useRef(false);
  const fpsMarksRef = useRef<number[]>([]);
  const sessionIdRef = useRef(0);
  const processedMediaUrlRef = useRef<string | null>(null);
  const originalPreviewUrlRef = useRef<string | null>(null);
  const transportModeRef = useRef<TransportMode>("websocket");
  const lastBroadcastFrameRef = useRef<number>(-1);

  function appendLog(level: DebugEntry["level"], message: string) {
    setLogs((current) => [makeLog(level, message), ...current].slice(0, 80));
  }

  function updateProcessedMedia(nextMedia: DashboardMedia | null) {
    releaseBlobUrl(processedMediaUrlRef.current);
    processedMediaUrlRef.current =
      nextMedia?.kind === "video" ? nextMedia.url : null;
    setProcessedMedia(nextMedia);
  }

  function updateOriginalPreview(nextUrl: string | null) {
    releaseBlobUrl(originalPreviewUrlRef.current);
    originalPreviewUrlRef.current = nextUrl;
    setOriginalPreviewUrl(nextUrl);
  }

  function resetStateForNewFile(file: File) {
    setSelectedFileName(file.name);
    setVideoInfo(null);
    updateProcessedMedia(null);
    setAnalytics(null);
    setProcessedFrames(0);
    setDroppedFrames(0);
    setPendingFrames(0);
    setEffectiveFps(0);
    setBatchOutputPath(null);
    setGeoTrack(null);
    setErrorText(null);
    setBroadcastState({ pending: false, message: null, alerts: null });
    extractorCompleteRef.current = false;
    batchFallbackRef.current = false;
    queuedFrameRef.current = null;
    fpsMarksRef.current = [];
    appendLog("info", `Loaded ${file.name}.`);
  }

  function cleanupCurrentSession() {
    extractorRef.current?.stop();
    extractorRef.current = null;
    transportRef.current?.dispose();
    transportRef.current = null;
    currentFileRef.current = null;
    queuedFrameRef.current = null;
    inFlightRef.current = false;
    extractorCompleteRef.current = false;
    batchFallbackRef.current = false;
    setPendingFrames(0);
    releaseBlobUrl(processedMediaUrlRef.current);
    processedMediaUrlRef.current = null;
    releaseBlobUrl(originalPreviewUrlRef.current);
    originalPreviewUrlRef.current = null;
  }

  async function createTransport(file: File) {
    setConnectionState("connecting");
    setStatusText("Connecting to FogNet live stream...");

    try {
      const websocketTransport = new WebSocketFrameTransport({
        onStatus: (message) => appendLog("info", message),
        onError: (message) => appendLog("warn", message),
      });
      await websocketTransport.start({
        filename: file.name,
        targetFps: TARGET_FPS,
      });

      transportRef.current = websocketTransport;
      transportModeRef.current = "websocket";
      setTransportMode("websocket");
      setConnectionState("streaming");
      setStatusText("Streaming frames over WebSocket.");
      appendLog("info", "Primary transport: WebSocket /ws/process-stream.");
      return;
    } catch (error) {
      appendLog(
        "warn",
        `WebSocket unavailable. Falling back to HTTP frames. ${
          error instanceof Error ? error.message : ""
        }`,
      );
    }

    const httpTransport = new HttpFrameTransport();
    await httpTransport.start({
      filename: file.name,
      targetFps: TARGET_FPS,
    });
    transportRef.current = httpTransport;
    transportModeRef.current = "http-frame";
    setTransportMode("http-frame");
    setConnectionState("streaming");
    setStatusText("Streaming frames over POST /process-image.");
    appendLog("info", "Fallback transport: HTTP frames via /process-image.");
  }

  function applyResult(result: AnalyticsResult) {
    setAnalytics(result);
    updateProcessedMedia({
      kind: "image",
      url: buildProcessedImageUrl(result.processedImage),
    });
    setProcessedFrames((value) => value + 1);

    fpsMarksRef.current.push(performance.now());
    fpsMarksRef.current = fpsMarksRef.current.slice(-12);

    if (fpsMarksRef.current.length >= 2) {
      const first = fpsMarksRef.current[0];
      const last = fpsMarksRef.current[fpsMarksRef.current.length - 1];
      const fps =
        ((fpsMarksRef.current.length - 1) * 1000) / Math.max(1, last - first);
      setEffectiveFps(Number(fps.toFixed(1)));
    }

    setStatusText(
      `Frame ${result.frameIndex} processed. Risk ${result.risk}, danger ${result.dangerScore.toFixed(
        2,
      )}.`,
    );
  }

  function findGeoSample(frameIndex: number) {
    return geoTrack?.samples.find((sample) => sample.frameIndex === frameIndex) ?? null;
  }

  async function maybeBroadcastFrame(result: AnalyticsResult) {
    const geoSample = findGeoSample(result.frameIndex);

    if (!geoSample) {
      return;
    }

    if (lastBroadcastFrameRef.current === result.frameIndex) {
      return;
    }

    lastBroadcastFrameRef.current = result.frameIndex;

    try {
      console.log("[fognet] broadcasting frame coordinates", {
        frameIndex: result.frameIndex,
        timestamp: result.timestamp,
        latitude: geoSample.latitude,
        longitude: geoSample.longitude,
        source: geoSample.source,
      });

      const response = (await postBroadcastAlert({
        danger_score: result.dangerScore,
        risk: result.risk,
        latitude: geoSample.latitude,
        longitude: geoSample.longitude,
        timestamp: result.timestamp,
        source: currentFileRef.current?.name || "dashboard-live",
      })) as Record<string, unknown>;

      const alerts =
        Number(response.alerts) ||
        Number(response.nearby_alerts) ||
        (Array.isArray(response.results) ? response.results.length : 0) ||
        0;

      setBroadcastState({
        pending: false,
        alerts,
        message: `Auto-broadcasted frame ${result.frameIndex} using synthetic coordinates.`,
      });
      appendLog(
        "info",
        `Broadcast frame ${result.frameIndex} at ${geoSample.latitude.toFixed(5)}, ${geoSample.longitude.toFixed(5)}.`,
      );
    } catch (error) {
      appendLog(
        "warn",
        error instanceof Error
          ? error.message
          : "Automatic frame broadcast failed.",
      );
    }
  }

  async function switchToHttpFallback(reason: string) {
    appendLog("warn", reason);
    transportRef.current?.dispose();
    const httpTransport = new HttpFrameTransport();
    await httpTransport.start({
      filename: currentFileRef.current?.name ?? "unknown.mp4",
      targetFps: TARGET_FPS,
    });
    transportRef.current = httpTransport;
    transportModeRef.current = "http-frame";
    setTransportMode("http-frame");
    setConnectionState("falling-back");
    setStatusText("WebSocket dropped. Continuing with POST /process-image.");
  }

  async function runBatchFallback(reason: string) {
    if (batchFallbackRef.current) {
      return;
    }

    const file = currentFileRef.current;
    if (!file) {
      return;
    }

    batchFallbackRef.current = true;
    extractorRef.current?.stop();
    extractorRef.current = null;
    queuedFrameRef.current = null;
    setPendingFrames(0);
    setConnectionState("batch-processing");
    setTransportMode("batch");
    transportModeRef.current = "batch";
    setStatusText(
      "Frame transport unavailable. Uploading the full video instead.",
    );
    appendLog("warn", `${reason} Switching to POST /process-video.`);

    try {
      const { blob, outputPath } = await processBatchVideo(file);
      updateProcessedMedia({
        kind: "video",
        url: URL.createObjectURL(blob),
      });
      setBatchOutputPath(outputPath);
      setConnectionState("complete");
      setStatusText("Batch fallback finished. Processed video is ready.");
      appendLog("info", "Batch fallback completed successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Batch fallback failed.";
      setConnectionState("error");
      setErrorText(message);
      setStatusText(message);
      appendLog("error", message);
    }
  }

  async function flushNextQueuedFrame(sessionId: number) {
    if (sessionIdRef.current !== sessionId || batchFallbackRef.current) {
      return;
    }

    const nextFrame = queuedFrameRef.current;
    if (!nextFrame) {
      if (extractorCompleteRef.current && !inFlightRef.current) {
        setConnectionState("complete");
        setStatusText("Live stream finished.");
        await transportRef.current?.complete();
      }
      return;
    }

    queuedFrameRef.current = null;
    setPendingFrames(1);
    void dispatchFrame(nextFrame, sessionId);
  }

  async function dispatchFrame(frame: ProcessingFrame, sessionId: number) {
    const transport = transportRef.current;
    if (!transport || sessionIdRef.current !== sessionId || batchFallbackRef.current) {
      return;
    }

    inFlightRef.current = true;

    try {
      const result = await transport.sendFrame(frame);
      if (sessionIdRef.current !== sessionId) {
        return;
      }
      applyResult(result);
      void maybeBroadcastFrame(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Frame processing failed.";

      if (transportModeRef.current === "websocket") {
        await switchToHttpFallback(`${message}.`);
        inFlightRef.current = false;
        void dispatchFrame(frame, sessionId);
        return;
      }

      appendLog("error", message);
      await runBatchFallback(message);
      return;
    } finally {
      inFlightRef.current = false;
      if (!batchFallbackRef.current) {
        setPendingFrames(queuedFrameRef.current ? 1 : 0);
        void flushNextQueuedFrame(sessionId);
      }
    }
  }

  async function enqueueFrame(frame: ProcessingFrame, sessionId: number) {
    if (sessionIdRef.current !== sessionId || batchFallbackRef.current) {
      return;
    }

    if (inFlightRef.current) {
      if (queuedFrameRef.current) {
        setDroppedFrames((value) => value + 1);
      }
      queuedFrameRef.current = frame;
      setPendingFrames(1);
      return;
    }

    setPendingFrames(1);
    void dispatchFrame(frame, sessionId);
  }

  async function startProcessing(file: File) {
    sessionIdRef.current += 1;
    const nextSessionId = sessionIdRef.current;
    cleanupCurrentSession();
    currentFileRef.current = file;
    resetStateForNewFile(file);

    await createTransport(file);

    try {
      const extractor = startVideoFrameExtractor({
        file,
        targetFps: TARGET_FPS,
        onStart: (info, previewUrl) => {
          if (sessionIdRef.current !== nextSessionId) {
            return;
          }
          setVideoInfo(info);
          updateOriginalPreview(previewUrl);
          const syntheticTrack = buildSyntheticGeoTrack(
            Math.max(1, Math.floor((info.duration || 0) * TARGET_FPS)),
            TARGET_FPS,
            file.name,
          );
          console.log("[fognet] synthetic geo track", syntheticTrack);
          console.log("[fognet] synthetic geo samples", syntheticTrack.samples);
          setGeoTrack(syntheticTrack);
          setStatusText("Decoding frames in browser and sending them live.");
          appendLog(
            "info",
            `Frame extraction started at ${TARGET_FPS} FPS (${info.width}x${info.height}).`,
          );
          appendLog("info", syntheticTrack.note);
        },
        onFrame: async (frame) => {
          await enqueueFrame(frame, nextSessionId);
        },
        onComplete: () => {
          if (sessionIdRef.current !== nextSessionId) {
            return;
          }
          extractorCompleteRef.current = true;
          appendLog("info", "Local video stream finished.");
          if (!inFlightRef.current && !queuedFrameRef.current) {
            setConnectionState("complete");
            setStatusText("Live stream finished.");
            void transportRef.current?.complete();
          }
        },
        onError: (error) => {
          if (sessionIdRef.current !== nextSessionId) {
            return;
          }
          appendLog("warn", error.message);
          void runBatchFallback(error.message);
        },
      });

      extractorRef.current = extractor;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start frame extraction.";
      appendLog("warn", message);
      await runBatchFallback(message);
    }
  }

  async function submitBroadcast() {
    if (!analytics) {
      setBroadcastState({
        pending: false,
        alerts: null,
        message: "No live analytics yet. Process a frame first.",
      });
      return;
    }

    const geoSample = findGeoSample(analytics.frameIndex);

    if (!geoSample) {
      setBroadcastState({
        pending: false,
        alerts: null,
        message:
          "No synthetic coordinates are available for the current frame.",
      });
      return;
    }

    setBroadcastState({ pending: true, alerts: null, message: null });

    try {
      console.log("[fognet] manual broadcast using current frame coordinates", {
        frameIndex: analytics.frameIndex,
        timestamp: analytics.timestamp,
        latitude: geoSample.latitude,
        longitude: geoSample.longitude,
        source: geoSample.source,
      });

      const response = (await postBroadcastAlert({
        danger_score: analytics.dangerScore,
        risk: analytics.risk,
        latitude: geoSample.latitude,
        longitude: geoSample.longitude,
        timestamp: analytics.timestamp,
        source: currentFileRef.current?.name || "dashboard",
      })) as Record<string, unknown>;

      const alerts =
        Number(response.alerts) ||
        Number(response.nearby_alerts) ||
        (Array.isArray(response.results) ? response.results.length : 0) ||
        0;

      setBroadcastState({
        pending: false,
        alerts,
        message: `Broadcast sent using synthetic coordinates. Nearby alerts: ${alerts}.`,
      });
      appendLog("info", `Broadcast posted with ${alerts} nearby alerts.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Broadcast request failed.";
      setBroadcastState({
        pending: false,
        alerts: null,
        message,
      });
      appendLog("error", message);
    }
  }

  useEffect(() => {
    let active = true;

    async function pollBackend() {
      try {
        const [healthSnapshot, heatmapSnapshot] = await Promise.all([
          fetchHealthSnapshot(),
          fetchHeatmapSnapshot(),
        ]);

        if (!active) {
          return;
        }

        setHealth(healthSnapshot);
        setHeatmap(heatmapSnapshot);
      } catch (error) {
        if (!active) {
          return;
        }

        appendLog(
          "warn",
          error instanceof Error
            ? error.message
            : "Backend health polling failed unexpectedly.",
        );
      }
    }

    void pollBackend();
    const intervalId = window.setInterval(() => {
      void pollBackend();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupCurrentSession();
    };
  }, []);

  return {
    targetFps: TARGET_FPS,
    selectedFileName,
    videoInfo,
    originalPreviewUrl,
    processedMedia,
    analytics,
    connectionState,
    transportMode,
    effectiveFps,
    processedFrames,
    droppedFrames,
    pendingFrames,
    statusText,
    errorText,
    health,
    heatmap,
    logs,
    batchOutputPath,
    broadcastState,
    geoTrack,
    reportUrl: fognetEndpoints.report,
    streamUrl: fognetEndpoints.stream,
    startProcessing,
    submitBroadcast,
  };
}
