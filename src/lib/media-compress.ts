/**
 * Helpers de compressão client-side antes do upload.
 * - Imagens: browser-image-compression (2560px max, q=0.82, webp quando possível).
 * - Vídeos: ffmpeg.wasm carregado sob demanda (apenas >8MB). H.264 720p CRF 28.
 * NUNCA importar em código de servidor (use somente em componentes client).
 */
import imageCompression from "browser-image-compression";

const IMAGE_MAX_DIM = 2560;
const IMAGE_QUALITY = 0.82;
const VIDEO_SKIP_BELOW = 8 * 1024 * 1024; // 8 MB

export type CompressProgress = (info: { pct: number; stage: string }) => void;

export async function compressMediaFile(
  file: File,
  onProgress?: CompressProgress,
): Promise<File> {
  const type = file.type || "";
  if (type.startsWith("image/")) return compressImage(file, onProgress);
  if (type.startsWith("video/")) return compressVideo(file, onProgress);
  return file;
}

async function compressImage(file: File, onProgress?: CompressProgress): Promise<File> {
  // GIFs/SVGs passam direto (compressão quebra animação/vetor).
  if (/gif|svg/i.test(file.type)) return file;
  try {
    onProgress?.({ pct: 0, stage: "Otimizando imagem…" });
    const out = await imageCompression(file, {
      maxWidthOrHeight: IMAGE_MAX_DIM,
      initialQuality: IMAGE_QUALITY,
      useWebWorker: true,
      fileType: supportsWebp() ? "image/webp" : file.type,
      onProgress: (p: number) => onProgress?.({ pct: p, stage: "Otimizando imagem…" }),
    });
    // Se ficou maior, devolve o original.
    if (out.size >= file.size) return file;
    const ext = supportsWebp() ? "webp" : (file.name.split(".").pop() || "jpg");
    const renamed = new File([out], file.name.replace(/\.[^.]+$/, "") + "." + ext, {
      type: out.type,
      lastModified: Date.now(),
    });
    onProgress?.({ pct: 100, stage: "Pronto" });
    return renamed;
  } catch (e) {
    console.warn("[compress] imagem falhou, usando original", e);
    return file;
  }
}

function supportsWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { return false; }
}

let _ffmpegPromise: Promise<unknown> | null = null;
async function getFFmpeg() {
  if (_ffmpegPromise) return _ffmpegPromise;
  _ffmpegPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ff = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ff;
  })();
  return _ffmpegPromise;
}

async function compressVideo(file: File, onProgress?: CompressProgress): Promise<File> {
  if (file.size <= VIDEO_SKIP_BELOW) return file;
  try {
    onProgress?.({ pct: 0, stage: "Carregando compressor de vídeo…" });
    const ff = (await getFFmpeg()) as {
      writeFile: (n: string, d: Uint8Array) => Promise<void>;
      readFile: (n: string) => Promise<Uint8Array>;
      deleteFile: (n: string) => Promise<void>;
      exec: (args: string[]) => Promise<number>;
      on: (ev: string, cb: (e: { progress: number; time: number }) => void) => void;
      off: (ev: string, cb: (e: { progress: number; time: number }) => void) => void;
    };
    const inputName = "input." + (file.name.split(".").pop() || "mp4");
    const outputName = "output.mp4";
    const buf = new Uint8Array(await file.arrayBuffer());
    await ff.writeFile(inputName, buf);
    const handler = (ev: { progress: number }) => {
      const pct = Math.max(0, Math.min(100, Math.round(ev.progress * 100)));
      onProgress?.({ pct, stage: "Comprimindo vídeo…" });
    };
    ff.on("progress", handler);
    await ff.exec([
      "-i", inputName,
      "-vf", "scale='min(1280,iw)':-2",
      "-c:v", "libx264",
      "-crf", "28",
      "-preset", "veryfast",
      "-c:a", "aac",
      "-b:a", "96k",
      "-movflags", "+faststart",
      outputName,
    ]);
    ff.off("progress", handler);
    const data = await ff.readFile(outputName);
    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});
    const blob = new Blob([data as BlobPart], { type: "video/mp4" });
    if (blob.size >= file.size) return file;
    const renamed = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".mp4", {
      type: "video/mp4",
      lastModified: Date.now(),
    });
    onProgress?.({ pct: 100, stage: "Pronto" });
    return renamed;
  } catch (e) {
    console.warn("[compress] vídeo falhou, usando original", e);
    return file;
  }
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i;
export function detectMediaKind(url: string, mime?: string | null): "image" | "video" {
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("image/")) return "image";
  return VIDEO_EXT_RE.test(url) ? "video" : "image";
}