import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "censo_de_enfermagem",
  title: "Censo de enfermagem",
  description:
    "Retorna o censo de enfermagem de uma data (padrão: o mais recente disponível).",
  inputSchema: {
    data: z.string().trim().optional().describe("Data do censo no formato AAAA-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ data: censoData }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("nursing_census")
      .select("id, census_date, nurse_name, data, created_at")
      .order("census_date", { ascending: false })
      .limit(1);
    if (censoData) query = query.eq("census_date", censoData);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const censo = data?.[0] ?? null;
    if (!censo)
      return { content: [{ type: "text", text: "Nenhum censo encontrado (ou sem permissão de acesso)." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(censo).slice(0, 20000) }],
      structuredContent: { censo },
    };
  },
});
