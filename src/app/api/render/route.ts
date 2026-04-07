import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FPS = 15;

type FfmpegFailure = Error & { stderr?: string };

function logStep(step: string, details?: Record<string, unknown>) {
  console.log("[api/render]", step, details ?? {});
}

async function resolveFfmpegBinary() {
  const importedPath =
    typeof ffmpegPath === "string" && ffmpegPath.length > 0 ? ffmpegPath : null;
  const candidates = [
    importedPath,
    resolve(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  ].filter((value, index, array): value is string => {
    return Boolean(value) && array.indexOf(value!) === index;
  });

  logStep("ffmpeg.resolve.start", {
    cwd: process.cwd(),
    importedPath,
    candidates,
  });

  for (const candidate of candidates) {
    const normalizedCandidate = isAbsolute(candidate)
      ? candidate
      : resolve(process.cwd(), candidate);

    try {
      await fs.access(normalizedCandidate);
      logStep("ffmpeg.resolve.hit", { path: normalizedCandidate });
      return normalizedCandidate;
    } catch (error) {
      logStep("ffmpeg.resolve.miss", {
        path: normalizedCandidate,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new Error("Bundled ffmpeg binary could not be resolved.");
}

async function runFfmpeg(binaryPath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    logStep("ffmpeg.spawn", {
      binaryPath,
      args,
    });

    const process = spawn(binaryPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    process.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    process.on("error", (error) => {
      logStep("ffmpeg.spawn.error", {
        binaryPath,
        message: error.message,
      });
      reject(error);
    });

    process.on("close", (code) => {
      logStep("ffmpeg.spawn.close", {
        binaryPath,
        code,
        stderr,
      });

      if (code === 0) {
        resolve();
        return;
      }

      const error = new Error(
        stderr || `ffmpeg exited with code ${code}`,
      ) as FfmpegFailure;
      error.stderr = stderr;
      reject(error);
    });
  });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  logStep("request.start", { requestId });

  const formData = await request.formData();
  logStep("request.formData.parsed", { requestId });

  const video = formData.get("video");

  if (!(video instanceof File)) {
    logStep("request.invalid.missing-video", { requestId });
    return NextResponse.json(
      { error: "Missing uploaded video." },
      { status: 400 },
    );
  }

  const fileName = "name" in video ? String(video.name || "") : "";
  const looksLikeMp4 =
    video.type === "video/mp4" || fileName.toLowerCase().endsWith(".mp4");

  logStep("request.video.received", {
    requestId,
    fileName,
    mimeType: video.type,
    size: video.size,
    looksLikeMp4,
  });

  if (!looksLikeMp4) {
    logStep("request.invalid.mime", {
      requestId,
      fileName,
      mimeType: video.type,
    });
    return NextResponse.json(
      { error: "Only MP4 uploads are supported." },
      { status: 400 },
    );
  }

  const workspaceId = randomUUID();
  const workspacePath = join(tmpdir(), `video-to-15fps-${workspaceId}`);
  const inputPath = join(workspacePath, "input.mp4");
  const outputPath = join(workspacePath, "output.mp4");

  try {
    logStep("workspace.create.start", {
      requestId,
      workspacePath,
    });
    await fs.mkdir(workspacePath, { recursive: true });
    logStep("workspace.create.done", {
      requestId,
      workspacePath,
    });

    logStep("input.buffer.read.start", {
      requestId,
      fileName,
      size: video.size,
    });
    const inputBuffer = Buffer.from(await video.arrayBuffer());
    logStep("input.buffer.read.done", {
      requestId,
      bytes: inputBuffer.byteLength,
    });

    logStep("input.write.start", {
      requestId,
      inputPath,
    });
    await fs.writeFile(inputPath, inputBuffer);
    logStep("input.write.done", {
      requestId,
      inputPath,
    });

    const ffmpegBinary = await resolveFfmpegBinary();

    await runFfmpeg(ffmpegBinary, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-vf",
      `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
    logStep("ffmpeg.done", {
      requestId,
      outputPath,
    });

    logStep("output.read.start", {
      requestId,
      outputPath,
    });
    const videoBuffer = await fs.readFile(outputPath);
    logStep("output.read.done", {
      requestId,
      bytes: videoBuffer.byteLength,
    });

    logStep("request.success", {
      requestId,
      fileName,
      outputBytes: videoBuffer.byteLength,
    });
    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="converted-15fps.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as FfmpegFailure).stderr || "")
        : "";
    const message =
      error instanceof Error ? error.message : "Video render failed.";
    const cleanMessage = stderr
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-3)
      .join(" | ") || message;

    console.error("Video transcode failed", {
      requestId,
      fileName,
      mimeType: video.type,
      size: video.size,
      message,
      stderr,
      workspacePath,
      inputPath,
      outputPath,
    });

    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  } finally {
    logStep("workspace.cleanup.start", {
      requestId,
      workspacePath,
    });
    await fs.rm(workspacePath, { recursive: true, force: true });
    logStep("workspace.cleanup.done", {
      requestId,
      workspacePath,
    });
  }
}
