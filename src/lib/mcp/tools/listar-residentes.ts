import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_residentes",
  title: "Listar residentes",
  description:
    "Busca residentes da ILPI pelo nome (ou lista os ativos) com data de nascimento e sexo.",
  inputSchema: {
    nome: z.string().trim().optional().describe("Parte do nome completo do residente."),
    limite: z.number().int().optional().describe("Máximo de resultados (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ nome, limite }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("residents")
      .select("id, full_name, birth_date, sex, active")
      .eq("active", true)
      .order("full_name")
      .limit(Math.min(Math.max(limite ?? 20, 1), 100));
    if (nome) query = query.ilike("full_name", `%${nome}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { residentes: data ?? [] },
    };
  },
});
