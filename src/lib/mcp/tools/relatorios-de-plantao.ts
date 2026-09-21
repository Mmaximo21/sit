import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "relatorios_de_plantao",
  title: "Relatórios de plantão",
  description: "Lista os relatórios de plantão mais recentes, com autor, data e conteúdo.",
  inputSchema: {
    data: z.string().trim().optional().describe("Filtrar por data (AAAA-MM-DD)."),
    limite: z.number().int().optional().describe("Máximo de relatórios (padrão 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ data: reportDate, limite }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("shift_reports")
      .select("id, report_date, author_name, content, created_at")
      .order("report_date", { ascending: false })
      .limit(Math.min(Math.max(limite ?? 10, 1), 50));
    if (reportDate) query = query.eq("report_date", reportDate);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []).slice(0, 20000) }],
      structuredContent: { relatorios: data ?? [] },
    };
  },
});
