"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

const ANNOTATE_URL = "http://localhost:8000/api/dash/annotate";

export default function DashPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [annotatedUrl, setAnnotatedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "Upload an image to detect and draw boxes.",
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
      if (annotatedUrl) {
        URL.revokeObjectURL(annotatedUrl);
      }
    };
  }, [annotatedUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (annotatedUrl) {
      URL.revokeObjectURL(annotatedUrl);
      setAnnotatedUrl(null);
    }

    setFile(nextFile);
    setStatus(
      nextFile
        ? `Selected ${nextFile.name}. Ready to detect objects.`
        : "Upload an image to detect and draw boxes.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("Choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setIsProcessing(true);
    setStatus("Sending image to the detection backend...");

    try {
      const response = await fetch(ANNOTATE_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Image annotation failed.");
      }

      const blob = await response.blob();
      const nextAnnotatedUrl = URL.createObjectURL(blob);

      if (annotatedUrl) {
        URL.revokeObjectURL(annotatedUrl);
      }

      setAnnotatedUrl(nextAnnotatedUrl);
      setStatus("Detection complete. Boxes are drawn on the output image.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown annotation error.";
      setStatus(message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              Vision Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-5xl">
              Upload an image and inspect YOLO boxes.
            </h1>
          </div>
          <Link
            className="inline-flex items-center rounded-full border border-[rgba(122,75,44,0.18)] bg-white/70 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] hover:border-[var(--accent-strong)] hover:bg-white"
            href="/"
          >
            Back Home
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/60 bg-[rgba(255,248,239,0.84)] p-8 shadow-[0_30px_90px_rgba(72,42,20,0.12)] backdrop-blur">
            <p className="text-lg leading-8 text-[var(--muted)]">
              This screen uploads your image to the FastAPI backend, reads the
              annotated JPEG response, and renders the detected boxes in place.
            </p>

            <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
              <label className="grid gap-3">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Source image
                </span>
                <input
                  accept="image/*"
                  className="cursor-pointer rounded-2xl border border-[rgba(122,75,44,0.2)] bg-white/80 px-4 py-4 text-sm text-[var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2.5 file:font-medium file:text-[var(--ink)]"
                  onChange={handleFileChange}
                  type="file"
                />
              </label>

              <button
                className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-7 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--paper)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
                type="submit"
              >
                {isProcessing ? "Detecting..." : "Detect Objects"}
              </button>
            </form>

            <p className="mt-6 rounded-[1.25rem] border border-[rgba(46,43,40,0.08)] bg-white/60 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {status}
            </p>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] border border-[rgba(46,43,40,0.08)] bg-[rgba(49,33,22,0.92)] p-6 text-[var(--paper)] shadow-[0_30px_90px_rgba(49,33,22,0.18)]">
              <p className="text-sm uppercase tracking-[0.24em] text-[rgba(255,235,214,0.68)]">
                Original
              </p>
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                {previewUrl ? (
                  <Image
                    alt="Uploaded preview"
                    className="max-h-[28rem] w-full object-contain"
                    height={1200}
                    unoptimized
                    src={previewUrl}
                    width={1600}
                  />
                ) : (
                  <div className="grid min-h-[20rem] place-items-center px-6 text-center text-sm leading-6 text-[rgba(255,235,214,0.7)]">
                    Your selected image appears here before detection.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/60 bg-[rgba(255,248,239,0.9)] p-6 shadow-[0_30px_90px_rgba(72,42,20,0.12)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Annotated Output
              </p>
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(122,75,44,0.14)] bg-white/70">
                {annotatedUrl ? (
                  <Image
                    alt="Detected objects with bounding boxes"
                    className="max-h-[28rem] w-full object-contain"
                    height={1200}
                    unoptimized
                    src={annotatedUrl}
                    width={1600}
                  />
                ) : (
                  <div className="grid min-h-[20rem] place-items-center px-6 text-center text-sm leading-6 text-[var(--muted)]">
                    The boxed result from `/annotate-file` appears here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
