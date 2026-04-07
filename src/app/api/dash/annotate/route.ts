import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getBackendBaseUrl() {
  const rawValue = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  return rawValue.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Missing uploaded image." },
      { status: 400 },
    );
  }

  if (!image.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are supported." },
      { status: 400 },
    );
  }

  const upstreamFormData = new FormData();
  upstreamFormData.append("file", image, image.name || "upload.jpg");

  try {
    const response = await fetch(`${getBackendBaseUrl()}/annotate-file`, {
      method: "POST",
      body: upstreamFormData,
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { detail?: string; error?: string }
        | null;
      return NextResponse.json(
        {
          error:
            payload?.detail || payload?.error || "Backend image annotation failed.",
        },
        { status: response.status },
      );
    }

    const annotatedImage = await response.arrayBuffer();

    return new NextResponse(annotatedImage, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach the backend.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
