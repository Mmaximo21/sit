import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canAccessCensus, useAuth } from "@/hooks/useAuth";
import { downloadNursingCensusExcel } from "@/lib/census-excel";
import {
  CENSUS_COLUMNS,
  asCensusData,
  censusFilledCount,
  formatCensusDate,
  mergeCensusRows,
  todayISO,
  type CensusRow,
  type NursingCensusRecord,
} from "@/lib/nursing-census";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { logDeletion } from "@/lib/deletion-log";
import { Stethoscope, FileDown, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/censo")({
  head: () => ({
    meta: [
      { title: "Censo de Enfermagem — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Censo diário de enfermagem com sinais vitais, NEWS, dieta e eliminações de cada residente, com download em A4 paisagem.",
      },
      { property: "og:title", content: "Censo de Enfermagem — Sistema Interno ILPI" },
      {
        property: "og:description",
        content:
          "Escala diária de enfermagem da I.L.P.I. Luiza Olindina Silva Alves, pronta para impressão em A4.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CensoPage,
});

function CensoPage() {
  const { data: session, isLoading: loadingSession } = useAuth();
  const queryClient = useQueryClient();
  const [censusDate, setCensusDate] = useState(todayISO());
  const [nurseName, setNurseName] = useState("");
  const [rows, setRows] = useState<CensusRow[]>([]);

  const allowed = canAccessCensus(session);

  const { data: residents } = useQuery({
    queryKey: ["residents-census"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, birth_date")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: census, isLoading } = useQuery({
    queryKey: ["nursing-census", censusDate],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nursing_census")
        .select("*")
        .eq("census_date", censusDate)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, data: asCensusData(data.data) } as NursingCensusRecord;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["nursing-census-history"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nursing_census")
        .select("id, census_date, nurse_name, data, created_at, updated_at")
        .order("census_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        data: asCensusData(row.data),
      })) as NursingCensusRecord[];
    },
  });

  useEffect(() => {
    if (!residents) return;
    setRows(mergeCensusRows(residents, census?.data.rows ?? []));
    setNurseName(census?.nurse_name ?? (session?.fullName || session?.username || ""));
  }, [residents, census, session?.fullName, session?.username]);

  const filled = useMemo(() => censusFilledCount(rows), [rows]);

  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão expirada. Entre novamente.");
      const payload = {
        census_date: censusDate,
        nurse_name: nurseName.trim(),
        data: { rows },
        author_id: session.userId,
      };
      const { error } = await supabase
        .from("nursing_census")
        .upsert(payload, { onConflict: "census_date" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nursing-census"] });
      await queryClient.invalidateQueries({ queryKey: ["nursing-census-history"] });
      toast.success("Censo de enfermagem salvo.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (item: NursingCensusRecord) => {
      if (!session?.isMaster) throw new Error("Apenas contas Administrador podem excluir censos.");
      const { error } = await supabase.from("nursing_census").delete().eq("id", item.id);
      if (error) throw error;
      await logDeletion({
        userId: session.userId,
        userName: session.fullName || session.username || "Administrador",
        recordType: "Censo de Enfermagem",
        recordLabel: `Censo de ${formatCensusDate(item.census_date)}${item.nurse_name ? ` — ${item.nurse_name}` : ""}`,
        recordDate: item.census_date,
        details: { residentes_preenchidos: censusFilledCount(item.data.rows) },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nursing-census"] });
      await queryClient.invalidateQueries({ queryKey: ["nursing-census-history"] });
      await queryClient.invalidateQueries({ queryKey: ["deletion-logs"] });
      toast.success("Censo excluído e registrado no histórico de exclusões.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
  });

  if (loadingSession) return <Skeleton className="h-64 w-full" />;

  if (!allowed) {
    return (
      <div className="card-surface p-8 text-sm text-muted-foreground">
        O Censo de Enfermagem é exclusivo das especialidades Enfermagem, Técnico de Enfermagem e
        Geriatria e da Direção.
      </div>
    );
  }

  function update(index: number, key: string, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div
      className="relative left-1/2 -translate-x-1/2 space-y-8"
      style={{ width: "min(1680px, calc(100vw - 2rem))" }}
    >
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
          <Stethoscope className="size-3.5" /> Enfermagem
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Censo de Enfermagem</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A escala do dia{" "}
          <strong className="text-foreground">{formatCensusDate(censusDate)}</strong> abre
          automaticamente com todos os residentes listados nome por nome. Preencha os dados e baixe
          o documento em A4 paisagem com o timbre institucional.
        </p>
      </header>

      <section className="card-surface space-y-5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-[220px_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="census-date">Data do censo</Label>
            <Input
              id="census-date"
              type="date"
              value={censusDate}
              onChange={(event) => setCensusDate(event.target.value || todayISO())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nurse-name">Enfermeiro(a) responsável</Label>
            <Input
              id="nurse-name"
              value={nurseName}
              onChange={(event) => setNurseName(event.target.value)}
              placeholder="Enfª Débora Dias"
            />
          </div>
          <div className="flex items-end">
            <Badge variant="secondary">
              {filled} de {rows.length} residentes preenchidos
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="rounded-xl border border-border">
            <table className="w-full table-fixed text-[10px]">
              <colgroup>
                <col className="w-8" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[6%]" />
                <col className="w-[4%]" />
                <col className="w-[10%]" />
                <col className="w-[4%]" />
                <col className="w-[4%]" />
                <col className="w-[4%]" />
                <col className="w-[5%]" />
                <col className="w-[5%]" />
                <col className="w-[4%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                    Nº
                  </th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                    Nome
                  </th>
                  {CENSUS_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {column.short || column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.resident_id} className="border-t border-border align-top">
                    <td className="px-1 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-2 py-2 font-medium leading-snug break-words">{row.nome}</td>
                    {CENSUS_COLUMNS.map((column) => (
                      <td key={column.key} className="px-1 py-1.5">
                        <Input
                          className="h-8 w-full min-w-0 px-1 text-[11px]"
                          value={row[column.key] ?? ""}
                          onChange={(event) => update(index, column.key, event.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Salvar censo do dia
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadNursingCensusExcel({ census_date: censusDate, nurse_name: nurseName, rows })
            }
          >
            <FileDown className="mr-2 size-4" /> Baixar Excel (.xlsx)
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Censos anteriores</h2>
        {!history?.length ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhum censo salvo ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="card-surface flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-display text-base font-semibold">
                    Censo de {formatCensusDate(item.census_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.nurse_name || "Sem responsável informado"} ·{" "}
                    {censusFilledCount(item.data.rows)} residentes preenchidos
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setCensusDate(item.census_date)}>
                    Abrir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadNursingCensusExcel({
                        census_date: item.census_date,
                        nurse_name: item.nurse_name,
                        rows: item.data.rows,
                      })
                    }
                  >
                    <FileDown className="mr-1.5 size-4" /> .xlsx
                  </Button>
                  {session?.isMaster ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={remove.isPending}>
                          <Trash2 className="mr-1.5 size-4" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Excluir o censo de {formatCensusDate(item.census_date)}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é definitiva. A exclusão ficará registrada no histórico de
                            exclusões com o seu nome, a data e a hora.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(item)}>
                            Excluir censo
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
