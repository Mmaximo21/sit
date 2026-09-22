import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canAccessCensus, useAuth } from "@/hooks/useAuth";
import { asCensusData, type CensusRow } from "@/lib/nursing-census";
import {
  MENTAL_OPTIONS,
  computeNews,
  formatDateTime,
  isRowFilled,
  levelCardClass,
  loadNewsHistory,
  mergeNewsRows,
  newsRowToCensusFields,
  saveNewsHistory,
  scoreBadgeClass,
  todayISO,
  type NewsBatchRecord,
  type NewsBatchRow,
  type NewsVitals,
} from "@/lib/news-score";
import { downloadNewsScaleDocx, type NewsScaleRow } from "@/lib/docx-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, FileDown, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/news")({
  head: () => ({
    meta: [
      { title: "Escala NEWS — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Escala NEWS 2 de todos os residentes em uma única lista, com escore automático, classificação de risco e download em A4 paisagem timbrado.",
      },
      { property: "og:title", content: "Escala NEWS — Sistema Interno ILPI" },
      {
        property: "og:description",
        content:
          "National Early Warning Score de todos os residentes da I.L.P.I. Luiza Olindina Silva Alves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsPage,
});

const NUMERIC_FIELDS: {
  key: "fr" | "spo2" | "temp" | "pas" | "fc";
  label: string;
  width: number;
}[] = [
  { key: "fr", label: "FR", width: 92 },
  { key: "spo2", label: "SpO₂", width: 92 },
  { key: "temp", label: "T °C", width: 92 },
  { key: "pas", label: "PA (S/D)", width: 100 },
  { key: "fc", label: "FC", width: 92 },
];

function NewsPage() {
  const { data: session, isLoading: loadingSession } = useAuth();
  const allowed = canAccessCensus(session);
  const queryClient = useQueryClient();

  const [evaluationDate, setEvaluationDate] = useState(todayISO());
  const [nurseName, setNurseName] = useState("");
  const [rows, setRows] = useState<NewsBatchRow[]>([]);
  const [history, setHistory] = useState<NewsBatchRecord[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setHistory(loadNewsHistory());
  }, []);

  const { data: residents } = useQuery({
    queryKey: ["residents-news"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!residents) return;
    setRows((current) => mergeNewsRows(residents, current));
    setNurseName((current) => current || session?.fullName || session?.username || "");
  }, [residents, session?.fullName, session?.username]);

  const results = useMemo(() => rows.map((row) => computeNews(row)), [rows]);
  const filled = useMemo(() => rows.filter(isRowFilled).length, [rows]);
  const alerts = useMemo(
    () => results.filter((result, index) => isRowFilled(rows[index]!) && result.total >= 5).length,
    [results, rows],
  );

  if (loadingSession) return <Skeleton className="h-64 w-full" />;

  if (!allowed) {
    return (
      <div className="card-surface p-8 text-sm text-muted-foreground">
        A Escala NEWS é exclusiva das especialidades Enfermagem, Técnico de Enfermagem e Geriatria e
        da Direção.
      </div>
    );
  }

  function update(index: number, key: keyof NewsVitals, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function docRows(source: NewsBatchRow[]): NewsScaleRow[] {
    return source.map((row) => {
      const result = computeNews(row);
      return {
        nome: row.nome,
        fr: row.fr,
        spo2: row.spo2,
        temp: row.temp,
        pas: row.pas,
        fc: row.fc,
        mental: row.mental === "Normal / Alerta" ? "Normal" : "Alterado",
        total: result.total,
        classification: result.classification,
      };
    });
  }

  function persist(records: NewsBatchRecord[]) {
    setHistory(records);
    saveNewsHistory(records);
  }

  /** Lança os sinais vitais e o escore NEWS direto nas colunas do Censo de Enfermagem do mesmo dia. */
  async function syncCensus(source: NewsBatchRow[]) {
    if (!session) throw new Error("Sessão expirada. Entre novamente.");
    const { data: existing, error: readError } = await supabase
      .from("nursing_census")
      .select("nurse_name, data")
      .eq("census_date", evaluationDate)
      .maybeSingle();
    if (readError) throw readError;

    const savedRows = asCensusData(existing?.data).rows;
    const merged: CensusRow[] = savedRows.map((row) => ({ ...row }));

    for (const row of source) {
      if (!isRowFilled(row)) continue;
      const fields = newsRowToCensusFields(row);
      const index = merged.findIndex((item) => item.resident_id === row.resident_id);
      if (index >= 0) merged[index] = { ...merged[index]!, ...fields };
      else merged.push({ resident_id: row.resident_id, nome: row.nome, ...fields } as CensusRow);
    }

    const { error } = await supabase.from("nursing_census").upsert(
      {
        census_date: evaluationDate,
        nurse_name: (existing?.nurse_name || nurseName).trim(),
        data: { rows: merged },
        author_id: session.userId,
      },
      { onConflict: "census_date" },
    );
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["nursing-census"] });
    await queryClient.invalidateQueries({ queryKey: ["nursing-census-history"] });
  }

  async function handleSave() {
    if (!filled) {
      toast.error("Preencha os sinais vitais de ao menos um residente.");
      return;
    }
    const record: NewsBatchRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      evaluationDate,
      nurseName: nurseName.trim(),
      rows,
    };
    persist([record, ...history.filter((item) => item.evaluationDate !== evaluationDate)]);
    setSyncing(true);
    try {
      await syncCensus(rows);
      toast.success("Escala NEWS salva e lançada no Censo de Enfermagem.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Escala salva, mas o censo não foi atualizado: ${error.message}`
          : "Escala salva, mas o censo não foi atualizado.",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className="relative left-1/2 -translate-x-1/2 space-y-8"
      style={{ width: "min(1680px, calc(100vw - 2rem))" }}
    >
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
          <Activity className="size-3.5" /> Enfermagem
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Escala NEWS</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Lista única com todos os residentes ativos: preencha os sinais vitais linha por linha e o
          escore NEWS 2 é calculado em tempo real. Ao salvar, os sinais vitais e o escore são
          lançados automaticamente no Censo de Enfermagem do mesmo dia. O download sai em A4
          paisagem, com o papel timbrado padrão das avaliações.
        </p>
      </header>

      <section className="card-surface space-y-5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-[220px_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="news-date">Data da avaliação</Label>
            <Input
              id="news-date"
              type="date"
              value={evaluationDate}
              onChange={(event) => setEvaluationDate(event.target.value || todayISO())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="news-nurse">Enfermeiro(a) responsável</Label>
            <Input
              id="news-nurse"
              value={nurseName}
              onChange={(event) => setNurseName(event.target.value)}
              placeholder="Enfª Débora Dias"
            />
          </div>
          <div className="flex items-end gap-2">
            <Badge variant="secondary">
              {filled} de {rows.length} preenchidos
            </Badge>
            {alerts ? <Badge variant="destructive">{alerts} em risco ≥ 5</Badge> : null}
          </div>
        </div>

        <div className="rounded-xl border border-border">
          <table className="w-full table-fixed text-[11px]">
            <colgroup>
              <col className="w-7" />
              <col />
              {NUMERIC_FIELDS.map((field) => (
                <col key={field.key} className="w-[9%]" />
              ))}
              <col className="w-[15%]" />
              <col className="w-[6%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-muted/60">
              <tr>
                <th className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                  Nº
                </th>
                <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                  Residente
                </th>
                {NUMERIC_FIELDS.map((field) => (
                  <th
                    key={field.key}
                    className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {field.label}
                  </th>
                ))}
                <th className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado mental
                </th>
                <th className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                  NEWS
                </th>
                <th className="px-1 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                  Classificação / conduta
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const result = results[index]!;
                const scores = Object.fromEntries(
                  result.params.map((p) => [p.key, p.score]),
                ) as Record<string, number>;
                return (
                  <tr key={row.resident_id} className="border-t border-border align-top">
                    <td className="px-1 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-2 py-2 font-medium leading-snug break-words">{row.nome}</td>
                    {NUMERIC_FIELDS.map((field) => (
                      <td key={field.key} className="px-1 py-1.5">
                        <div className="flex items-center gap-1">
                          {field.key === "pas" ? (
                            <div className="flex w-full min-w-0 items-center">
                              <Input
                                className="h-8 w-full min-w-0 rounded-r-none px-1 text-center text-[11px]"
                                inputMode="numeric"
                                placeholder="120"
                                aria-label="Pressão arterial sistólica"
                                value={row.pas.split("/")[0] ?? ""}
                                onChange={(event) => {
                                  const pad = row.pas.split("/")[1] ?? "";
                                  const sys = event.target.value;
                                  update(index, "pas", sys || pad ? `${sys}/${pad}` : "");
                                }}
                              />
                              <Input
                                className="h-8 w-full min-w-0 rounded-l-none border-l-0 px-1 text-center text-[11px]"
                                inputMode="numeric"
                                placeholder="80"
                                aria-label="Pressão arterial diastólica"
                                value={row.pas.split("/")[1] ?? ""}
                                onChange={(event) => {
                                  const sys = row.pas.split("/")[0] ?? "";
                                  const pad = event.target.value;
                                  update(index, "pas", sys || pad ? `${sys}/${pad}` : "");
                                }}
                              />
                            </div>
                          ) : (
                            <Input
                              className="h-8 w-full min-w-0 px-1.5 text-center text-[11px]"
                              inputMode="decimal"
                              value={row[field.key]}
                              onChange={(event) => update(index, field.key, event.target.value)}
                            />
                          )}
                          <span
                            className={`shrink-0 rounded-full border px-1 py-0.5 text-[10px] font-semibold ${scoreBadgeClass(
                              scores[field.key] ?? 0,
                            )}`}
                          >
                            {scores[field.key] ?? 0}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-1">
                        <select
                          className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-1 text-[11px]"
                          value={row.mental}
                          onChange={(event) => update(index, "mental", event.target.value)}
                        >
                          {MENTAL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <span
                          className={`shrink-0 rounded-full border px-1 py-0.5 text-[10px] font-semibold ${scoreBadgeClass(
                            scores["mental"] ?? 0,
                          )}`}
                        >
                          {scores["mental"] ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-1.5">
                      <span
                        className={`inline-flex min-w-7 justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-bold ${scoreBadgeClass(
                          result.level,
                        )}`}
                      >
                        {result.total}
                      </span>
                    </td>
                    <td className="px-1 py-1.5">
                      <span
                        className={`block rounded-md border px-1.5 py-1 text-[10px] leading-snug ${levelCardClass(result.level)}`}
                      >
                        <strong>{result.classification}</strong> · {result.conduct}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Salvar e lançar no censo
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadNewsScaleDocx({
                evaluation_date: evaluationDate,
                nurse_name: nurseName,
                rows: docRows(rows),
              })
            }
          >
            <FileDown className="mr-2 size-4" /> Baixar A4 (paisagem)
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Histórico de avaliações</h2>
          {history.length ? (
            <Button variant="ghost" size="sm" onClick={() => persist([])}>
              <Trash2 className="mr-1.5 size-4" /> Limpar histórico
            </Button>
          ) : null}
        </div>

        {!history.length ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhuma escala salva ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => {
              const filledRows = item.rows.filter(isRowFilled);
              const critical = filledRows.filter((row) => computeNews(row).total >= 5).length;
              return (
                <li
                  key={item.id}
                  className="card-surface flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-display text-base font-semibold">
                      Escala NEWS de {item.evaluationDate.split("-").reverse().join("/")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.nurseName || "Sem responsável informado"} · {filledRows.length}{" "}
                      residentes preenchidos · {critical} com escore ≥ 5 · salvo em{" "}
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEvaluationDate(item.evaluationDate);
                        setNurseName(item.nurseName);
                        setRows(mergeNewsRows(residents ?? [], item.rows));
                      }}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadNewsScaleDocx({
                          evaluation_date: item.evaluationDate,
                          nurse_name: item.nurseName,
                          rows: docRows(item.rows),
                        })
                      }
                    >
                      <FileDown className="mr-1.5 size-4" /> .docx
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => persist(history.filter((row) => row.id !== item.id))}
                    >
                      <Trash2 className="mr-1.5 size-4" /> Excluir
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
