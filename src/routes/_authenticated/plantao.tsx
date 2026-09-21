import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  downloadShiftReportDocx,
  formatShiftReportDate,
  shiftReportWhatsappText,
} from "@/lib/docx-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClipboardCheck, Copy, FileDown, Loader2, MessageCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plantao")({
  head: () => ({
    meta: [
      { title: "Relatório de Plantão — Sistema Interno ILPI" },
      {
        name: "description",
        content: "Registre a passagem de plantão, baixe o relatório em A4 e envie o resumo formatado por WhatsApp.",
      },
      { property: "og:title", content: "Relatório de Plantão — Sistema Interno ILPI" },
      {
        property: "og:description",
        content: "Relatórios de passagem de plantão identificados pelo responsável, com download em A4.",
      },
    ],
  }),
  component: PlantaoPage,
});

type ShiftReport = {
  id: string;
  report_date: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function PlantaoPage() {
  const { data: session } = useAuth();
  const queryClient = useQueryClient();
  const [reportDate, setReportDate] = useState(todayISO());
  const [content, setContent] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["shift-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShiftReport[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Escreva o relatório antes de concluir.");
      if (!session) throw new Error("Sessão expirada. Entre novamente.");
      const { error } = await supabase.from("shift_reports").insert({
        report_date: reportDate,
        content: content.trim(),
        author_id: session.userId,
        author_name: session.fullName || session.username,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["shift-reports"] });
      toast.success("Relatório de plantão registrado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shift_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shift-reports"] });
      toast.success("Relatório excluído.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
  });


  async function copyForWhatsapp(report: ShiftReport) {
    const text = shiftReportWhatsappText(report);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado, pronto para o WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  const authorName = session?.fullName || session?.username || "";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
          <ClipboardCheck className="size-3.5" /> Supervisão Administrativa
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Relatório de Plantão</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Escreva a passagem de plantão do dia. Ao concluir, o relatório é guardado com a identificação de{" "}
          <strong className="text-foreground">{authorName || "seu usuário"}</strong> e fica disponível para download em
          A4 ou envio por WhatsApp.
        </p>
      </header>

      <section className="card-surface space-y-5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="report-date">Data do plantão</Label>
            <Input
              id="report-date"
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={authorName} readOnly className="bg-muted/50" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-content">Relato</Label>
          <Textarea
            id="report-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Descreva intercorrências, atendimentos, pendências e orientações para o próximo plantão…"
            className="min-h-[280px] leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            {content.trim().length} caracteres · quebras de linha viram parágrafos no documento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Concluir e guardar
          </Button>
          <Button
            variant="outline"
            disabled={!content.trim()}
            onClick={() =>
              downloadShiftReportDocx({
                report_date: reportDate,
                content,
                author_name: authorName,
                registry: session?.registry ?? null,
              })
            }
          >
            <FileDown className="mr-2 size-4" /> Baixar prévia (A4)
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Relatórios guardados</h2>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !reports?.length ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhum relatório de plantão registrado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="card-surface animate-rise space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold">
                      Plantão de {formatShiftReportDate(report.report_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.author_name} · registrado em {new Date(report.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="secondary">Concluído</Badge>
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{report.content}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadShiftReportDocx(report)}>
                    <FileDown className="mr-1.5 size-4" /> Baixar .docx
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyForWhatsapp(report)}>
                    <Copy className="mr-1.5 size-4" /> Copiar para WhatsApp
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shiftReportWhatsappText(report))}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-1.5 size-4" /> Enviar no WhatsApp
                    </a>
                  </Button>
                  {session?.isMaster ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="mr-1.5 size-4" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir relatório de plantão?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O relatório de {formatShiftReportDate(report.report_date)} registrado por{" "}
                            {report.author_name} será removido definitivamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => remove.mutate(report.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </li>

            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
