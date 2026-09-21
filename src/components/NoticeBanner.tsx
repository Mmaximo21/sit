import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Info, Megaphone } from "lucide-react";

export type Notice = {
  id: string;
  title: string;
  body: string;
  level: string;
  created_by_name: string;
  expires_at: string;
  created_at: string;
};

/** Avisos publicados pelos administradores e ainda dentro das 24 horas de validade. */
export function useActiveNotices() {
  return useQuery({
    queryKey: ["notices", "active"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Notice[];
    },
  });
}

function remaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}min restantes` : `${minutes}min restantes`;
}

const STYLES: Record<string, string> = {
  info: "border-primary/30 bg-primary/10 text-foreground",
  atencao: "border-amber-500/40 bg-amber-500/10 text-foreground",
  urgente: "border-destructive/40 bg-destructive/10 text-foreground",
};

export function NoticeBanner() {
  const { data: notices } = useActiveNotices();
  if (!notices || notices.length === 0) return null;

  return (
    <div className="mx-auto mb-6 flex max-w-6xl flex-col gap-3 px-4 sm:px-6">
      {notices.map((notice) => (
        <article
          key={notice.id}
          className={`animate-rise flex gap-3 rounded-2xl border px-4 py-3 shadow-soft ${STYLES[notice.level] ?? STYLES["info"]}`}
        >
          <span className="mt-0.5 shrink-0">
            {notice.level === "urgente" ? (
              <AlertTriangle className="size-5" />
            ) : notice.level === "atencao" ? (
              <Megaphone className="size-5" />
            ) : (
              <Info className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{notice.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{notice.body}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {notice.created_by_name || "Administração"} · {remaining(notice.expires_at)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
