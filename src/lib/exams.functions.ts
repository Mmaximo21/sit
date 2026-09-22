import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKET = "exames";

/** Creates a signed upload URL so any authenticated professional can attach an exam file. */
export const createExamUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { residentId: string; fileName: string }) =>
    z
      .object({
        residentId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safeName = data.fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(-120);
    const path = `${data.residentId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed)
      throw new Error(error?.message ?? "Não foi possível preparar o envio do arquivo.");

    return { path: signed.path, token: signed.token, uploadedBy: context.userId };
  });

/** Returns a temporary link to open/download an exam the caller is allowed to read. */
export const getExamDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { examId: string }) =>
    z.object({ examId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: exam, error } = await context.supabase
      .from("exam_files")
      .select("file_path, file_name")
      .eq("id", data.examId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!exam) throw new Error("Exame não encontrado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(exam.file_path, 60 * 10, { download: exam.file_name });
    if (signError || !signed)
      throw new Error(signError?.message ?? "Não foi possível gerar o link do arquivo.");

    return { url: signed.signedUrl, fileName: exam.file_name };
  });

/** Deletes an exam record (own upload, or any when master) and removes the stored file. */
export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { examId: string }) =>
    z.object({ examId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: deleted, error } = await context.supabase
      .from("exam_files")
      .delete()
      .eq("id", data.examId)
      .select("file_path")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) throw new Error("Você não tem permissão para excluir este exame.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(BUCKET).remove([deleted.file_path]);
    return { ok: true };
  });
