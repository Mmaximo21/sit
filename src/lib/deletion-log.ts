import { supabase } from "@/integrations/supabase/client";

export type DeletionLogRow = {
  id: string;
  record_type: string;
  record_label: string;
  record_date: string | null;
  details: Record<string, unknown> | null;
  deleted_by: string;
  deleted_by_name: string;
  created_at: string;
};

/** Registra no histórico quem excluiu um arquivo/registro, com data e hora. */
export async function logDeletion(input: {
  userId: string;
  userName: string;
  recordType: string;
  recordLabel: string;
  recordDate?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("deletion_logs").insert({
    record_type: input.recordType,
    record_label: input.recordLabel,
    record_date: input.recordDate ?? null,
    details: (input.details ?? {}) as never,
    deleted_by: input.userId,
    deleted_by_name: input.userName,
  });
  if (error) throw error;
}

export function formatDeletionMoment(raw: string) {
  return new Date(raw).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
