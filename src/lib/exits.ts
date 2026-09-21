import { supabase } from "@/integrations/supabase/client";

/** Espaço privado dos documentos anexados às saídas de residentes. */
export const EXIT_BUCKET = "saidas";

export const EXIT_TYPES = ["Desacolhimento", "Óbito"] as const;
export type ExitType = (typeof EXIT_TYPES)[number];

export type ExitAttachment = {
  path: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

export type ResidentExitRow = {
  id: string;
  resident_id: string | null;
  resident_name: string;
  exit_type: string;
  exit_date: string;
  destination: string | null;
  cause: string | null;
  report: string;
  attachments: unknown;
  author_id: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
};

export function asExitAttachments(value: unknown): ExitAttachment[] {
  if (!Array.isArray(value)) return [];
  return (value as ExitAttachment[]).filter((item) => item && typeof item.path === "string");
}

export function formatExitDate(value: string | null | undefined) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
}

/** Envia um documento da saída e devolve o anexo pronto para ser guardado no registro. */
export async function uploadExitFile(file: File, userId: string): Promise<ExitAttachment> {
  if (file.size > 25 * 1024 * 1024) throw new Error("O arquivo deve ter até 25 MB.");
  const path = `${userId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from(EXIT_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(error.message);
  return {
    path,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

/** Link temporário para abrir ou baixar um documento anexado. */
export async function exitFileUrl(path: string) {
  const { data, error } = await supabase.storage.from(EXIT_BUCKET).createSignedUrl(path, 60 * 30);
  if (error || !data) throw new Error(error?.message ?? "Não foi possível abrir o arquivo.");
  return data.signedUrl;
}

export async function removeExitFile(path: string) {
  await supabase.storage.from(EXIT_BUCKET).remove([path]);
}
