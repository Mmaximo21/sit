import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { computeNews, MENTAL_OPTIONS, type NewsVitals } from "@/lib/news-score";

export default defineTool({
  name: "calcular_news",
  title: "Calcular escala NEWS 2",
  description:
    "Calcula a pontuação NEWS 2 a partir dos sinais vitais e retorna classificação e conduta.",
  inputSchema: {
    fr: z.string().describe("Frequência respiratória (irpm)."),
    spo2: z.string().describe("Saturação de oxigênio (%)."),
    temp: z.string().describe("Temperatura (°C)."),
    pas: z.string().describe("Pressão arterial sistólica, ou no formato 120/80."),
    fc: z.string().describe("Frequência cardíaca (bpm)."),
    mental: z
      .string()
      .optional()
      .describe("Estado mental: 'Normal / Alerta' ou 'Alterado (confusão, agitação, letargia)'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ fr, spo2, temp, pas, fc, mental }) => {
    const estado: NewsVitals["mental"] =
      mental && MENTAL_OPTIONS.includes(mental as NewsVitals["mental"])
        ? (mental as NewsVitals["mental"])
        : "Normal / Alerta";
    const result = computeNews({ fr, spo2, temp, pas, fc, mental: estado });
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: {
        total: result.total,
        classificacao: result.classification,
        conduta: result.conduct,
        parametros: result.params,
      },
    };
  },
});
