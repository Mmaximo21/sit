/** Geração de imagens da Lumi (uso exclusivo no servidor). */

const GATEWAY_IMAGE_MODEL = "google/gemini-3-pro-image";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

type GenerationsResponse = { data?: { b64_json?: string }[] };

type GeminiResponse = {
  candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
};

function bytesFromBase64(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Gera uma imagem PNG a partir de um prompt e devolve os bytes. */
export async function generateImagePng(
  prompt: string,
  apiKey: string,
  useGemini = false,
): Promise<Uint8Array> {
  if (useGemini) return generateWithGemini(prompt, apiKey);
  return generateWithGateway(prompt, apiKey);
}

/** Google Gemini com a chave própria da instituição (não usa créditos da Lovable). */
async function generateWithGemini(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao gerar a imagem [${response.status}]: ${body}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const b64 = json.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData
    ?.data;
  if (!b64) throw new Error("O gerador de imagens não devolveu nenhuma imagem.");
  return bytesFromBase64(b64);
}

/** Lovable AI Gateway (consome créditos). */
async function generateWithGateway(prompt: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GATEWAY_IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao gerar a imagem [${response.status}]: ${body}`);
  }

  const json = (await response.json()) as GenerationsResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("O gerador de imagens não devolveu nenhuma imagem.");
  return bytesFromBase64(b64);
}
