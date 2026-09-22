import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpecialtyNames } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, FileDown, Lock, LockOpen, Trash2 } from "lucide-react";
import { getFormSpec } from "@/lib/forms";
import { downloadAssessmentDocx } from "@/lib/docx-export";
import { STATUS_LABEL } from "@/lib/specialties";
import { logDeletion } from "@/lib/deletion-log";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/periodos")({
  head: () => ({
    meta: [
      { title: "Prazos e ciclos — AGA ILPI" },
      {
        name: "description",
        content: "Defina datas de preenchimento, prazos por especialidade e feche ciclos.",
      },
      { property: "og:title", content: "Prazos e ciclos — AGA ILPI" },
      { property: "og:description", content: "Controle master dos prazos de preenchimento." },
    ],
  }),
  component: PeriodosPage,
});

function PeriodosPage() {
  const { data: session } = useAuth();
  const specialtyNames = useSpecialtyNames();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    dueDate: string | null;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const { data: periods } = useQuery({
    queryKey: ["periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_periods")
        .select("*, period_deadlines(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["periods"] });
    queryClient.invalidateQueries({ queryKey: ["current-period"] });
  };

  const exportPeriod = async (periodId: string, periodTitle: string) => {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("period_id", periodId);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Nenhuma avaliação neste ciclo.");
      return;
    }
    toast.success(`Gerando ${data.length} arquivo(s) .docx…`);
    for (const a of data) {
      await downloadAssessmentDocx(
        {
          id: a.id,
          specialty: a.specialty,
          resident_name: a.resident_name,
          status: STATUS_LABEL[a.status] ?? a.status,
          master_notes: a.master_notes,
          closed_at: a.closed_at,
          data: (a.data as Record<string, unknown>) ?? {},
          admission_date: a.admission_date,
          diagnosis: a.diagnosis,
        },
        getFormSpec(a.specialty),
        periodTitle,
      );
    }
  };

  const createPeriod = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe um título para o ciclo.");
      const { error } = await supabase.from("assessment_periods").insert({
        title: title.trim(),
        due_date: dueDate || null,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      toast.success("Ciclo criado.");
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao criar ciclo."),
  });

  const deletePeriod = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) throw new Error("Nenhum ciclo selecionado.");
      const reason = deleteReason.trim();
      if (reason.length < 5)
        throw new Error("Descreva o motivo da exclusão (mínimo 5 caracteres).");
      const { error } = await supabase
        .from("assessment_periods")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      await logDeletion({
        userId: session?.userId ?? "",
        userName: session?.fullName || session?.username || "Administrador",
        recordType: "Prazo de ciclo",
        recordLabel: deleteTarget.title,
        recordDate: deleteTarget.dueDate,
        details: { motivo: reason, status: "fechado" },
      });
    },
    onSuccess: () => {
      toast.success("Ciclo excluído e registrado no histórico.");
      setDeleteTarget(null);
      setDeleteReason("");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["deletion-logs"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao excluir ciclo."),
  });

  if (session && !session.isMaster) {
    return <p className="text-muted-foreground">Área exclusiva do usuário master.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Prazos e ciclos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina a data limite geral, ajuste prazos por especialidade e feche o ciclo quando
          concluído.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Novo ciclo</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: AGA 1º semestre 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">Prazo geral</Label>
            <Input
              id="due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button onClick={() => createPeriod.mutate()} disabled={createPeriod.isPending}>
            <CalendarPlus className="mr-2 size-4" /> Criar ciclo
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {(periods ?? []).map((period) => (
          <div key={period.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{period.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Prazo geral: {period.due_date ? formatDate(period.due_date) : "não definido"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={period.status === "aberto" ? "default" : "secondary"}>
                  {period.status === "aberto" ? "Aberto" : "Fechado"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const next = period.status === "aberto" ? "fechado" : "aberto";
                    const { error } = await supabase
                      .from("assessment_periods")
                      .update({ status: next })
                      .eq("id", period.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success(next === "aberto" ? "Ciclo reaberto." : "Ciclo fechado.");
                      invalidate();
                    }
                  }}
                >
                  {period.status === "aberto" ? (
                    <>
                      <Lock className="mr-1 size-4" /> Fechar
                    </>
                  ) : (
                    <>
                      <LockOpen className="mr-1 size-4" /> Reabrir
                    </>
                  )}
                </Button>
                {period.status === "fechado" ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportPeriod(period.id, period.title)}
                    >
                      <FileDown className="mr-1 size-4" /> Baixar .docx
                    </Button>
                    {session?.isMaster ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteReason("");
                          setDeleteTarget({
                            id: period.id,
                            title: period.title,
                            dueDate: period.due_date,
                          });
                        }}
                      >
                        <Trash2 className="mr-1 size-4" /> Excluir
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {specialtyNames.map((specialty) => {
                const current =
                  (period.period_deadlines ?? []).find((d) => d.specialty === specialty)
                    ?.due_date ?? "";
                return (
                  <div key={specialty} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{specialty}</Label>
                    <Input
                      type="date"
                      defaultValue={current}
                      onChange={async (e) => {
                        const value = e.target.value || null;
                        const { error } = await supabase
                          .from("period_deadlines")
                          .upsert(
                            { period_id: period.id, specialty, due_date: value },
                            { onConflict: "period_id,specialty" },
                          );
                        if (error) toast.error(error.message);
                        else invalidate();
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {(periods ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nenhum ciclo criado ainda.</p>
        ) : null}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir ciclo fechado</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `“${deleteTarget.title}” será removido permanentemente.` : null} As
              avaliações vinculadas permanecem, mas deixam de pertencer a este ciclo. Informe o
              motivo — ele fica no histórico de exclusões.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Motivo da exclusão</Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="ex: ciclo duplicado criado por engano"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePeriod.mutate()}
              disabled={deletePeriod.isPending || deleteReason.trim().length < 5}
            >
              Excluir ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
