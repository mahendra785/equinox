"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Upload an MP4 to convert it to 15 fps.");
  const [isRendering, setIsRendering] = useState(false);

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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setStatus(
      nextFile
        ? `Selected ${nextFile.name}. Ready to convert to 15 fps.`
        : "Upload an MP4 to convert it to 15 fps.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("Choose an MP4 file first.");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    setIsRendering(true);
    setStatus("Converting video to 15 fps...");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Render failed.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stem = file.name.replace(/\.[^.]+$/, "") || "video";

      anchor.href = downloadUrl;
      anchor.download = `${stem}-15fps.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setStatus("Converted MP4 to 15 fps.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown render error.";
      setStatus(message);
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/60 bg-[rgba(255,248,239,0.84)] p-8 shadow-[0_30px_90px_rgba(72,42,20,0.12)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              Video Frame Rate
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-6xl">
              Convert an MP4 into a clean 15 fps output.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
              Upload a source MP4 and export a new MP4 whose video stream is
              transcoded to a constant 15 fps timeline.
            </p>

            <form className="mt-10 grid gap-6" onSubmit={handleSubmit}>
              <label className="grid gap-3">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Source video
                </span>
                <input
                  className="cursor-pointer rounded-2xl border border-[rgba(122,75,44,0.2)] bg-white/80 px-4 py-4 text-sm text-[var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2.5 file:font-medium file:text-[var(--ink)]"
                  accept="video/mp4"
                  type="file"
                  onChange={handleFileChange}
                />
              </label>

              <button
                className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-7 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--paper)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRendering}
                type="submit"
              >
                {isRendering ? "Converting..." : "Convert MP4"}
              </button>
            </form>
          </div>

          <aside className="flex flex-col justify-between rounded-[2rem] border border-[rgba(46,43,40,0.08)] bg-[rgba(49,33,22,0.92)] p-6 text-[var(--paper)] shadow-[0_30px_90px_rgba(49,33,22,0.18)]">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[rgba(255,235,214,0.68)]">
                Preview
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
                    Your uploaded MP4 appears here before conversion.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.5rem] bg-white/8 p-4">
                <p className="text-sm uppercase tracking-[0.18em] text-[rgba(255,235,214,0.62)]">
                  Output
                </p>
                <p className="mt-2 text-2xl font-semibold">MP4 / H.264</p>
                <p className="mt-1 text-sm text-[rgba(255,235,214,0.72)]">
                  Video stream is transcoded to 15 fps, with AAC audio when present.
                </p>
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
