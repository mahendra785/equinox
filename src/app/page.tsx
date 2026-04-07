"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const PROCESS_URL = "http://localhost:8000/process-video";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedPath, setProcessedPath] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "Choose a video and upload it for processing.",
  );
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (processedUrl) {
        URL.revokeObjectURL(processedUrl);
      }
    };
  }, [processedUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl);
      setProcessedUrl(null);
    }
    setProcessedPath(null);

    setFile(nextFile);
    setStatus(
      nextFile
        ? `Selected ${nextFile.name}. Ready to upload and process.`
        : "Choose a video and upload it for processing.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("Choose a video file first.");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    setIsProcessing(true);
    setStatus("Processing...");

    try {
      const response = await fetch(PROCESS_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Video processing failed.");
      }

      const outputPath = response.headers.get("X-Processed-Video-Path");
      const blob = await response.blob();
      const nextProcessedUrl = URL.createObjectURL(blob);

      if (processedUrl) {
        URL.revokeObjectURL(processedUrl);
      }

      setProcessedUrl(nextProcessedUrl);
      setProcessedPath(outputPath);
      setStatus(
        outputPath
          ? "Processing complete. Preview the output below."
          : "Processing complete. Preview loaded, but no output path header was returned.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown processing error.";
      setProcessedPath(null);
      setStatus(message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/60 bg-[rgba(255,248,239,0.84)] p-8 shadow-[0_30px_90px_rgba(72,42,20,0.12)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              Video Processor
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-6xl">
              Upload a video and view the processed result.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
              Send a video to your FastAPI backend, keep the original preview in
              view, and play the processed output as soon as it returns.
            </p>
            <div className="mt-6">
              <Link
                className="inline-flex items-center rounded-full border border-[rgba(122,75,44,0.18)] bg-white/70 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] hover:border-[var(--accent-strong)] hover:bg-white"
                href="/dash"
              >
                Open Image Dashboard
              </Link>
            </div>

            <form className="mt-10 grid gap-6" onSubmit={handleSubmit}>
              <label className="grid gap-3">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Source video
                </span>
                <input
                  className="cursor-pointer rounded-2xl border border-[rgba(122,75,44,0.2)] bg-white/80 px-4 py-4 text-sm text-[var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2.5 file:font-medium file:text-[var(--ink)]"
                  accept="video/*"
                  type="file"
                  onChange={handleFileChange}
                />
              </label>

              <button
                className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-7 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--paper)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
                type="submit"
              >
                {isProcessing ? "Processing..." : "Upload and Process"}
              </button>
            </form>
            <p className="mt-6 rounded-[1.25rem] border border-[rgba(122,75,44,0.14)] bg-white/60 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Request target:{" "}
              <span className="font-semibold text-[var(--ink)]">
                {PROCESS_URL}
              </span>
            </p>
          </div>

          <aside className="flex flex-col justify-between rounded-[2rem] border border-[rgba(46,43,40,0.08)] bg-[rgba(49,33,22,0.92)] p-6 text-[var(--paper)] shadow-[0_30px_90px_rgba(49,33,22,0.18)]">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[rgba(255,235,214,0.68)]">
                Original Preview
              </p>
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                {previewUrl ? (
                  <video
                    className="aspect-video h-full w-full object-cover"
                    controls
                    preload="metadata"
                    src={previewUrl}
                  />
                ) : (
                  <div className="grid aspect-video place-items-center px-6 text-center text-sm leading-6 text-[rgba(255,235,214,0.7)]">
                    Your selected video appears here before upload.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.5rem] bg-white/8 p-4">
                <p className="text-sm uppercase tracking-[0.18em] text-[rgba(255,235,214,0.62)]">
                  Processed Output
                </p>
                {processedUrl ? (
                  <>
                    <video
                      className="mt-4 aspect-video w-full rounded-[1rem] bg-black object-cover"
                      controls
                      preload="metadata"
                      src={processedUrl}
                    />
                    <p className="mt-4 rounded-[1rem] border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-[rgba(255,235,214,0.82)]">
                      Backend output path:{" "}
                      {processedPath ?? "Header not provided"}
                    </p>
                  </>
                ) : (
                  <div className="mt-2 grid gap-3 text-sm leading-6 text-[rgba(255,235,214,0.72)]">
                    <p>
                      The processed video returned by `POST /process-video` will
                      appear here.
                    </p>
                    <p>
                      Backend output path: waiting for `X-Processed-Video-Path`.
                    </p>
                  </div>
                )}
              </div>
              <p className="rounded-[1.25rem] border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-[rgba(255,235,214,0.82)]">
                {status}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
