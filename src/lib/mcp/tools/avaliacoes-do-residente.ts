import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "avaliacoes_do_residente",
  title: "Avaliações do residente",
  description:
    "Lista as avaliações por especialidade (e o PIA) de um residente, com situação e datas.",
  inputSchema: {
    resident_id: z.string().describe("Identificador do residente."),
    especialidade: z.string().trim().optional().describe("Filtrar por especialidade."),
    limite: z.number().int().optional().describe("Máximo de registros (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ resident_id, especialidade, limite }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limite ?? 20, 1), 100);

    let avaliacoes = supabase
      .from("assessments")
      .select("id, specialty, status, resident_name, submitted_at, closed_at, created_at")
      .eq("resident_id", resident_id)
      .order("created_at", { ascending: false })
      .limit(max);
    if (especialidade) avaliacoes = avaliacoes.eq("specialty", especialidade);

    const planos = supabase
      .from("care_plans")
      .select("id, specialty, status, period_label, submitted_at, closed_at, created_at")
      .eq("resident_id", resident_id)
      .order("created_at", { ascending: false })
      .limit(max);

    const [a, p] = await Promise.all([avaliacoes, planos]);
    if (a.error) return { content: [{ type: "text", text: a.error.message }], isError: true };
    if (p.error) return { content: [{ type: "text", text: p.error.message }], isError: true };

    const payload = { avaliacoes: a.data ?? [], pia: p.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
