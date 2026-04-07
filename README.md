# MP4 to 15 FPS Video

This Next.js app accepts an MP4 upload and returns a new MP4 whose video stream is converted to 15 fps. It is useful when you need a lower frame-rate deliverable while keeping the result in a browser-friendly H.264 container.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload an `mp4` file, and convert it.

## How it Works

- The UI sends the selected MP4 to `POST /api/render`.
- The server writes the upload to a temporary folder.
- `ffmpeg-static` provides a local ffmpeg binary.
- ffmpeg transcodes the video stream to 15 fps and returns an H.264 MP4 to the browser.

## Notes

- Input is limited to MP4 uploads in the current implementation.
- Output uses `yuv420p` pixel format for broad player compatibility.
- Audio is encoded to AAC when present in the source.
- No system ffmpeg install is required because the project bundles one with `ffmpeg-static`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
