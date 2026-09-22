import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Notice } from "@/components/NoticeBanner";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos aos usuários — AGA ILPI" },
      {
        name: "description",
        content:
          "Publique avisos importantes que ficam visíveis na tela de todos os usuários por 24 horas.",
      },
      { property: "og:title", content: "Avisos aos usuários — AGA ILPI" },
      {
        property: "og:description",
        content: "Comunicados da administração visíveis por 24 horas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvisosPage,
});

const LEVELS = [
  { value: "info", label: "Informativo" },
  { value: "atencao", label: "Atenção" },
  { value: "urgente", label: "Urgente" },
];

function AvisosPage() {
  const { data: session } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [hours, setHours] = useState("24");

  const { data: notices } = useQuery({
    queryKey: ["notices", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Notice[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notices"] });
  };

  const publish = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão expirada.");
      if (!title.trim() || !body.trim())
        throw new Error("Preencha o título e a mensagem do aviso.");
      const validHours = Math.min(Math.max(Number(hours) || 24, 1), 168);
      const { error } = await supabase.from("notices").insert({
        title: title.trim(),
        body: body.trim(),
        level,
        created_by: session.userId,
        created_by_name: session.fullName,
        expires_at: new Date(Date.now() + validHours * 3_600_000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      setLevel("info");
      setHours("24");
      invalidate();
      toast.success("Aviso publicado para todos os usuários.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Aviso removido.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!session?.isMaster) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/70 p-6 text-sm text-muted-foreground">
        A publicação de avisos é exclusiva das contas de Administrador.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-hero p-6 shadow-soft sm:p-8">
        <Badge variant="secondary" className="mb-3">
          Administração
        </Badge>
        <h1 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          <Megaphone className="size-6" /> Avisos aos usuários
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O aviso aparece no topo da tela de todos os usuários conectados e desaparece
          automaticamente depois do prazo definido (24 horas por padrão).
        </p>
      </header>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="notice-title">Título</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Reunião geral amanhã às 9h"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notice-body">Mensagem</Label>
            <Textarea
              id="notice-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descreva o aviso com as informações necessárias."
            />
          </div>
          <div>
            <Label htmlFor="notice-level">Importância</Label>
            <select
              id="notice-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="notice-hours">Tempo na tela (horas)</Label>
            <Input
              id="notice-hours"
              type="number"
              min={1}
              max={168}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        </div>
        <Button className="mt-5" onClick={() => publish.mutate()} disabled={publish.isPending}>
          <Send className="size-4" /> Publicar aviso
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Avisos publicados</h2>
        {(notices ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso publicado até agora.</p>
        ) : (
          (notices ?? []).map((notice) => {
            const active = new Date(notice.expires_at).getTime() > Date.now();
            return (
              <article
                key={notice.id}
                className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-soft sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{notice.title}</p>
                    <Badge variant={active ? "default" : "secondary"}>
                      {active ? "Na tela" : "Encerrado"}
                    </Badge>
                    <Badge variant="outline">
                      {LEVELS.find((l) => l.value === notice.level)?.label ?? notice.level}
                    </Badge>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {notice.body}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {notice.created_by_name || "Administração"} · até{" "}
                    {new Date(notice.expires_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove.mutate(notice.id)}
                  aria-label="Remover aviso"
                >
                  <Trash2 className="size-4" />
                </Button>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
