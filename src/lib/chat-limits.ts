import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SpecialtyChatQuota = {
  allowed: boolean;
  specialty: string;
  date: string;
  count: number;
  limit: number;
  remaining: number;
};

export const MAX_QUESTIONS_PER_DAY = 10;

/**
 * Obtém a data de hoje no fuso horário de Brasília (UTC-3).
 */
export function getBrasiliaDateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // Brasília é UTC-3
  const brasilia = new Date(utc - 3 * 3600000);
  return brasilia.toISOString().slice(0, 10);
}

/**
 * Consulta a cota diária de perguntas de uma especialidade.
 */
export async function getSpecialtyChatUsage(
  supabase: SupabaseClient<Database>,
  specialty: string | null | undefined,
  maxDaily = MAX_QUESTIONS_PER_DAY,
): Promise<SpecialtyChatQuota> {
  const spec = specialty?.trim() || "Geral";
  const today = getBrasiliaDateString();

  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("get_specialty_chat_usage", {
      p_specialty: spec,
      p_max_daily: maxDaily,
    });

    if (!error && data && typeof data === "object") {
      const q = data as Record<string, unknown>;
      return {
        allowed: Boolean(q["allowed"]),
        specialty: String(q["specialty"] ?? spec),
        date: String(q["date"] ?? today),
        count: Number(q["count"] ?? 0),
        limit: Number(q["limit"] ?? maxDaily),
        remaining: Number(q["remaining"] ?? maxDaily),
      };
    }
  } catch {
    /* Fallback abaixo */
  }

  // Fallback para consulta direta na tabela caso o RPC ainda não esteja carregado
  try {
    const { data: row } = await (
      supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (
              col: string,
              val: unknown,
            ) => {
              eq: (
                col: string,
                val: unknown,
              ) => { maybeSingle: () => Promise<{ data: { question_count?: number } | null }> };
            };
          };
        };
      }
    )
      .from("specialty_chat_usage")
      .select("question_count")
      .eq("specialty", spec)
      .eq("usage_date", today)
      .maybeSingle();

    const count = Number(row?.question_count ?? 0);
    return {
      allowed: count < maxDaily,
      specialty: spec,
      date: today,
      count,
      limit: maxDaily,
      remaining: Math.max(0, maxDaily - count),
    };
  } catch {
    return {
      allowed: true,
      specialty: spec,
      date: today,
      count: 0,
      limit: maxDaily,
      remaining: maxDaily,
    };
  }
}

/**
 * Verifica e incrementa atômico a contagem diária da especialidade.
 */
export async function checkAndIncrementSpecialtyChat(
  supabase: SupabaseClient<Database>,
  specialty: string | null | undefined,
  userId: string,
  maxDaily = MAX_QUESTIONS_PER_DAY,
): Promise<SpecialtyChatQuota> {
  const spec = specialty?.trim() || "Geral";
  const today = getBrasiliaDateString();

  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("check_and_increment_specialty_chat", {
      p_specialty: spec,
      p_user_id: userId,
      p_max_daily: maxDaily,
    });

    if (!error && data && typeof data === "object") {
      const q = data as Record<string, unknown>;
      return {
        allowed: Boolean(q["allowed"]),
        specialty: String(q["specialty"] ?? spec),
        date: String(q["date"] ?? today),
        count: Number(q["count"] ?? 0),
        limit: Number(q["limit"] ?? maxDaily),
        remaining: Number(q["remaining"] ?? 0),
      };
    }
  } catch {
    /* Fallback abaixo */
  }

  // Fallback resiliente
  const current = await getSpecialtyChatUsage(supabase, spec, maxDaily);
  if (!current.allowed) {
    return current;
  }

  try {
    // Tenta atualizar/inserir
    await (
      supabase as unknown as {
        from: (table: string) => {
          upsert: (
            data: Record<string, unknown>,
            opts: Record<string, unknown>,
          ) => Promise<unknown>;
        };
      }
    )
      .from("specialty_chat_usage")
      .upsert(
        {
          specialty: spec,
          usage_date: today,
          question_count: current.count + 1,
          last_user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "specialty,usage_date" },
      );
  } catch {
    /* Não bloqueia se tabela não estiver criada */
  }

  return {
    allowed: true,
    specialty: spec,
    date: today,
    count: current.count + 1,
    limit: maxDaily,
    remaining: Math.max(0, maxDaily - (current.count + 1)),
  };
}
