const BUCKET = "exames";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const PROMPT = [
  "Você é um assistente de digitalização de protocolos de testes psicológicos aplicados em uma ILPI.",
  "Leia integralmente o documento anexado e produza a transcrição fiel do protocolo em português do Brasil.",
  "Regras:",
  "1. Transcreva todo texto impresso e manuscrito, mantendo a ordem das questões/itens e as respostas assinaladas.",
  "2. Descreva objetivamente desenhos, traçados, relógios, figuras e assinaturas (forma, proporção, distorções, omissões).",
  "3. Registre pontuações, totais e observações do aplicador quando presentes.",
  "4. Não interprete clinicamente nem invente conteúdo; se algo estiver ilegível, escreva [ilegível].",
  "Formato: use títulos curtos e listas simples em texto puro, sem markdown com asteriscos.",
].join("\n");

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

type Input = { path: string; fileName: string; fileType: string };

/** Baixa o arquivo do armazenamento e devolve a transcrição digitalizada. */
export async function digitizeStoredFile({ path, fileName, fileType }: Input) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: file, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error || !file) throw new Error(error?.message ?? "Não foi possível ler o arquivo enviado.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("O arquivo enviado está vazio.");

  const mime = (fileType || file.type || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  if (!isImage && !isPdf) {
    return {
      text: "",
      note:
        "Arquivo anexado no formato original (DOC/DOCX ou outro). A digitalização automática está disponível para PDF e imagens — converta o protocolo para PDF ou anexe a digitalização em imagem para transcrição automática.",
    };
  }

  const base64 = base64FromBytes(bytes);
  const content = isImage
    ? [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: `data:${mime || "image/jpeg"};base64,${base64}` } },
      ]
    : [
        { type: "text", text: PROMPT },
        {
          type: "file",
          file: { filename: fileName, file_data: `data:application/pdf;base64,${base64}` },
        },
      ];

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content }] }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429) throw new Error("Limite de uso da digitalização atingido. Tente novamente em instantes.");
    throw new Error(`Falha na digitalização do arquivo: ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("A digitalização não retornou conteúdo. Tente novamente.");

  return { text, note: "" };
}
