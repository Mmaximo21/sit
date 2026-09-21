import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKET = "exames";
const PREFIX = "testes-avaliacao";

/** Prepara um envio assinado para o protocolo de teste anexado à avaliação. */
export const createTestUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assessmentId: string; fileName: string }) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safeName = data.fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(-120);
    const path = `${PREFIX}/${data.assessmentId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Não foi possível preparar o envio do arquivo.");

    return { path: signed.path, token: signed.token };
  });

/** Link temporário para abrir o protocolo original anexado. */
export const getTestFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string; fileName: string }) =>
    z.object({ path: z.string().min(1), fileName: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!data.path.startsWith(`${PREFIX}/`)) throw new Error("Arquivo inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 60 * 10, { download: data.fileName });
    if (error || !signed) throw new Error(error?.message ?? "Não foi possível gerar o link do arquivo.");
    return { url: signed.signedUrl };
  });

/** Remove o protocolo anexado do armazenamento. */
export const removeTestFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    if (!data.path.startsWith(`${PREFIX}/`)) throw new Error("Arquivo inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(BUCKET).remove([data.path]);
    return { ok: true };
  });

/**
 * Lê o arquivo enviado e o digitaliza: transcreve escritas, respostas e descreve
 * desenhos, devolvendo um texto estruturado para ser incorporado à avaliação.
 */
export const digitizeTestFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string; fileName: string; fileType: string }) =>
    z
      .object({
        path: z.string().min(1),
        fileName: z.string().min(1),
        fileType: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!data.path.startsWith(`${PREFIX}/`)) throw new Error("Arquivo inválido.");
    const { digitizeStoredFile } = await import("./psych-tests.server");
    return digitizeStoredFile(data);
  });
