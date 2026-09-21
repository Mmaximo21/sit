import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SIGNATURE_BUCKET = "assinaturas";

export type SpecialtySignatureRow = {
  id: string;
  specialty: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_by: string | null;
  updated_at: string;
};

/** Formatos aceitos: precisam ser suportados pelo documento .docx. */
export const SIGNATURE_ACCEPT = "image/png,image/jpeg";

export type SignatureImage = { data: Uint8Array; type: "png" | "jpg"; width: number; height: number };

function slugSpecialty(specialty: string) {
  return specialty
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Assinaturas digitalizadas de todas as especialidades. */
export function useSpecialtySignatures() {
  return useQuery({
    queryKey: ["specialty-signatures"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialty_signatures")
        .select("id, specialty, file_path, file_name, mime_type, uploaded_by, updated_at")
        .order("specialty");
      if (error) throw error;
      return (data ?? []) as SpecialtySignatureRow[];
    },
  });
}

/** Link temporário para visualizar a assinatura enviada. */
export async function signaturePreviewUrl(path: string) {
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(path, 60 * 30);
  if (error || !data) throw new Error(error?.message ?? "Não foi possível abrir a assinatura.");
  return data.signedUrl;
}

/** Envia (ou substitui) a assinatura digitalizada de uma especialidade. */
export async function uploadSpecialtySignature(specialty: string, file: File, userId: string) {
  if (!/^image\/(png|jpe?g)$/.test(file.type)) {
    throw new Error("Envie a assinatura digitalizada em PNG ou JPG.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo da assinatura deve ter até 5 MB.");

  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${slugSpecialty(specialty)}/assinatura-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data: existing } = await supabase
    .from("specialty_signatures")
    .select("id, file_path")
    .eq("specialty", specialty)
    .maybeSingle();

  const { error } = await supabase.from("specialty_signatures").upsert(
    {
      ...(existing?.id ? { id: existing.id } : {}),
      specialty,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      uploaded_by: userId,
    },
    { onConflict: "specialty" },
  );
  if (error) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([path]);
    throw new Error(error.message);
  }

  if (existing?.file_path && existing.file_path !== path) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([existing.file_path]);
  }
}

/** Remove a assinatura de uma especialidade (Administrador ou a própria especialidade). */
export async function deleteSpecialtySignature(row: SpecialtySignatureRow) {
  const { error } = await supabase.from("specialty_signatures").delete().eq("id", row.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(SIGNATURE_BUCKET).remove([row.file_path]);
}

async function imageSize(blob: Blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return { width: 480, height: 160 };
  }
}

/**
 * Carrega a assinatura da especialidade já pronta para ser embutida no .docx,
 * com largura limitada a 200 pt preservando a proporção original.
 */
export async function loadSignatureImage(specialty: string): Promise<SignatureImage | null> {
  const { data: row } = await supabase
    .from("specialty_signatures")
    .select("file_path, mime_type")
    .eq("specialty", specialty)
    .maybeSingle();
  if (!row?.file_path) return null;

  const { data: blob, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(row.file_path);
  if (error || !blob) return null;

  const { width, height } = await imageSize(blob);
  const maxWidth = 200;
  const scale = width > maxWidth ? maxWidth / width : 1;

  return {
    data: new Uint8Array(await blob.arrayBuffer()),
    type: row.mime_type === "image/png" || row.file_path.endsWith(".png") ? "png" : "jpg",
    width: Math.round(width * scale),
    height: Math.max(24, Math.round(height * scale)),
  };
}
