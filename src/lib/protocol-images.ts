/**
 * Converte os protocolos anexados (PDF ou imagem) em imagens PNG prontas para
 * serem embutidas no documento .docx da avaliação.
 */
export type ProtocolImage = { data: Uint8Array; width: number; height: number };

const MAX_WIDTH_PX = 600;
const MAX_PAGES = 12;

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Falha ao converter a página em imagem.");
  return new Uint8Array(await blob.arrayBuffer());
}

function fit(width: number, height: number) {
  const scale = Math.min(1, MAX_WIDTH_PX / width);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function fromImage(blob: Blob): Promise<ProtocolImage[]> {
  const bitmap = await createImageBitmap(blob);
  const size = fit(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width * 2;
  canvas.height = size.height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return [{ data: await canvasToPng(canvas), ...size }];
}

async function fromPdf(blob: Blob): Promise<ProtocolImage[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const out: ProtocolImage[] = [];
  const pages = Math.min(doc.numPages, MAX_PAGES);

  for (let n = 1; n <= pages; n += 1) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const size = fit(base.width, base.height);
    const viewport = page.getViewport({ scale: (size.width * 2) / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    out.push({ data: await canvasToPng(canvas), ...size });
  }

  await doc.cleanup();
  return out;
}

/** Renderiza um protocolo anexado como uma lista de páginas em PNG. */
export async function renderProtocol(blob: Blob, fileName: string): Promise<ProtocolImage[]> {
  const isPdf = blob.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  try {
    return isPdf ? await fromPdf(blob) : await fromImage(blob);
  } catch {
    return [];
  }
}
