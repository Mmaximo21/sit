import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getFormSpec } from "@/lib/forms";
import { applyClosingSettings, missingRequiredFields } from "@/lib/forms/closing";
import { pickClosingTerm, useClosingTerms, useCouncilOptions } from "@/lib/settings";

import { formProgress } from "@/lib/forms/progress";
import { FormRenderer } from "@/components/FormRenderer";
import { STATUS_LABEL } from "@/lib/specialties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CloudUpload, FileDown, Lock, LockOpen, Save, Send, Trash2 } from "lucide-react";
import { formatResidentDate, residentPrefill, type ResidentRow } from "@/lib/residents";
import { downloadAssessmentDocx } from "@/lib/docx-export";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AssessmentUpdate = Database["public"]["Tables"]["assessments"]["Update"];

export const Route = createFileRoute("/_authenticated/avaliacao/$id")({
  head: () => ({
    meta: [
      { title: "Preenchimento da avaliação — AGA ILPI" },
      {
        name: "description",
        content: "Preencha e envie o formulário da avaliação geriátrica ampla.",
      },
      { property: "og:title", content: "Preenchimento da avaliação — AGA ILPI" },
      { property: "og:description", content: "Formulário padronizado da especialidade." },
    ],
  }),
  component: AvaliacaoPage,
});

type FormValues = Record<string, unknown>;

function AvaliacaoPage() {
  const { id } = Route.useParams();
  const { data: session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>({});
  const [residentName, setResidentName] = useState("");
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: resident } = useQuery({
    queryKey: ["resident", assessment?.resident_id],
    enabled: Boolean(assessment?.resident_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, birth_date, sex, admission_date, diagnosis")
        .eq("id", assessment!.resident_id!)
        .maybeSingle();
      if (error) throw error;
      return data as ResidentRow | null;
    },
  });

  useEffect(() => {
    if (assessment && !loaded && (!assessment.resident_id || resident !== undefined)) {
      const stored = (assessment.data as FormValues) ?? {};
      const prefill = resident ? residentPrefill(resident) : {};
      const merged: FormValues = { ...stored };
      for (const [key, value] of Object.entries(prefill)) {
        if (merged[key] === undefined || merged[key] === "") merged[key] = value;
      }
      setValues(merged);
      setResidentName(assessment.resident_name ?? resident?.full_name ?? "");
      setNotes(assessment.master_notes ?? "");
      setLoaded(true);
    }
  }, [assessment, resident, loaded]);

  const isMaster = (session?.isMaster ?? false) || (session?.isCoordenacao ?? false);
  const isCoordinator = (session?.isCoordinator ?? false) && !isMaster;
  const closed = assessment?.status === "fechado";
  const readOnly = isCoordinator || (session?.isCoordenacao ?? false) || (!isMaster && closed);
  const councilOptions = useCouncilOptions();
  const { data: closingTerms } = useClosingTerms();
  const spec = useMemo(() => {
    if (!assessment) return null;
    const base = getFormSpec(assessment.specialty);
    const term = pickClosingTerm(closingTerms, assessment.specialty);
    return applyClosingSettings(base, {
      councilOptions,
      title: term?.title,
      description: term?.description,
    });
  }, [assessment, closingTerms, councilOptions]);

  const save = useMutation({
    mutationFn: async (patch: AssessmentUpdate) => {
      const { error } = await supabase.from("assessments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment", id] });
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação excluída.");
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      navigate({ to: "/painel" });
    },
  });

  const requireComplete = () => {
    if (!spec) return false;
    const missing = missingRequiredFields(spec, values);
    if (!residentName.trim())
      missing.unshift({ type: "text", key: "resident_name", label: "Residente" });
    if (missing.length) {
      setMissingKeys(new Set(missing.map((f) => f.key)));
      toast.error(
        `Preencha o Termo de Encerramento e Assinaturas: ${missing.map((f) => f.label).join(", ")}.`,
      );
      const first = missing[0]!.key;
      const target =
        first === "resident_name"
          ? document.getElementById("resident")
          : document.querySelector(`[data-field="${first}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setMissingKeys(new Set());
    return true;
  };

  const progress = useMemo(() => (spec ? formProgress(spec, values) : null), [spec, values]);

  // Salvamento automático do rascunho (1,5 s após a última alteração).
  useEffect(() => {
    if (!loaded || readOnly || !dirty || !assessment) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      save.mutate(
        {
          data: values as NonNullable<AssessmentUpdate["data"]>,
          resident_name: residentName,
          admission_date: resident?.admission_date ?? null,
          diagnosis: resident?.diagnosis ?? null,
          ...(isMaster ? { master_notes: notes } : {}),
        },
        {
          onSuccess: () => {
            setSavedAt(new Date());
            setDirty(false);
          },
        },
      );
    }, 1500);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, residentName, notes, dirty, loaded, readOnly]);

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );

  if (!assessment || !spec)
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Avaliação não encontrada ou sem permissão de acesso.
        </p>
        <Link to="/painel" className="text-primary hover:underline">
          Voltar ao painel
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <Link
        to="/painel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Painel
      </Link>

      <div className="animate-rise relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-hero p-5 text-white shadow-elevated sm:p-7">
        <div
          className="bg-grid-soft pointer-events-none absolute inset-0 opacity-25"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">
              {assessment.specialty}
            </p>
            <h1 className="font-display mt-1.5 text-2xl font-semibold sm:text-3xl">{spec.title}</h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {residentName || "Residente não informado"}
            </p>
            {resident?.admission_date ||
            assessment.admission_date ||
            resident?.diagnosis ||
            assessment.diagnosis ? (
              <p className="mt-1 text-xs text-primary-foreground/60">
                {(resident?.admission_date ?? assessment.admission_date)
                  ? `Acolhimento: ${formatResidentDate(resident?.admission_date ?? assessment.admission_date)}`
                  : ""}
                {(resident?.admission_date ?? assessment.admission_date) &&
                (resident?.diagnosis ?? assessment.diagnosis)
                  ? " · "
                  : ""}
                {(resident?.diagnosis ?? assessment.diagnosis)
                  ? `Diagnóstico: ${resident?.diagnosis ?? assessment.diagnosis}`
                  : ""}
              </p>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
          >
            {STATUS_LABEL[assessment.status] ?? assessment.status}
          </Badge>
        </div>

        {progress ? (
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-xs text-primary-foreground/80">
              <span>
                {progress.filled} de {progress.total} campos preenchidos
              </span>
              <span className="font-semibold">{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/20">
              <div
                className="h-full rounded-full bg-primary-foreground/85 transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-primary-foreground/70">
              <CloudUpload className="size-3.5" />
              {readOnly
                ? "Somente leitura"
                : save.isPending
                  ? "Salvando…"
                  : savedAt
                    ? `Rascunho salvo às ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                    : "Salvamento automático ativo"}
            </p>
          </div>
        ) : null}
      </div>

      {readOnly ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          <Lock className="size-4" /> Esta avaliação foi fechada pela administração e está somente
          para leitura.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="card-surface sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seções
            </p>
            <ol className="space-y-0.5">
              {(progress?.sections ?? []).map((section, index) => {
                const complete = section.total > 0 && section.filled === section.total;
                return (
                  <li key={section.slug}>
                    <a
                      href={`#${section.slug}`}
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-semibold ${
                          complete ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="leading-snug">
                        {section.title}
                        <span className="ml-1 opacity-70">
                          ({section.filled}/{section.total})
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <div className="space-y-6">
          <div className="card-surface p-5">
            <div className="max-w-md space-y-2">
              <Label htmlFor="resident">
                Residente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resident"
                className={`scroll-mt-28 ${missingKeys.has("resident_name") ? "border-destructive/60" : ""}`}
                value={residentName}
                disabled={readOnly}
                onChange={(e) => {
                  setResidentName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
          </div>

          <FormRenderer
            spec={spec}
            values={values}
            readOnly={readOnly}
            highlight={missingKeys}
            assessmentId={assessment.id}
            onChange={(key, value) => {
              setValues((prev) => ({ ...prev, [key]: value }));
              setDirty(true);
              if (missingKeys.has(key)) {
                setMissingKeys((prev) => {
                  const next = new Set(prev);
                  next.delete(key);
                  return next;
                });
              }
            }}
          />
        </div>
      </div>

      {isMaster ? (
        <div className="card-surface p-5">
          <Label htmlFor="notes">Observações da administração</Label>
          <Textarea
            id="notes"
            className="mt-2"
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            placeholder="Devolutiva, pendências ou orientações."
          />
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        {progress ? (
          <span className="mr-auto hidden text-xs text-muted-foreground sm:block">
            {progress.percent}% preenchido
            {!readOnly && dirty ? " · alterações não salvas" : ""}
          </span>
        ) : null}

        {!readOnly ? (
          <>
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(
                  {
                    data: values as NonNullable<AssessmentUpdate["data"]>,
                    resident_name: residentName,
                    ...(isMaster ? { master_notes: notes } : {}),
                  },
                  { onSuccess: () => toast.success("Rascunho salvo.") },
                )
              }
            >
              <Save className="mr-2 size-4" /> Salvar
            </Button>
            {assessment.status !== "enviado" ? (
              <Button
                disabled={save.isPending}
                onClick={() => {
                  if (!requireComplete()) return;
                  save.mutate(
                    {
                      data: values as NonNullable<AssessmentUpdate["data"]>,
                      resident_name: residentName,
                      status: "enviado",
                      submitted_at: new Date().toISOString(),
                      ...(isMaster ? { master_notes: notes } : {}),
                    },
                    { onSuccess: () => toast.success("Avaliação enviada.") },
                  );
                }}
              >
                <Send className="mr-2 size-4" /> Enviar
              </Button>
            ) : null}
          </>
        ) : null}

        {isMaster ? (
          <>
            {closed ? (
              <Button
                variant="outline"
                onClick={() =>
                  save.mutate(
                    { status: "enviado", closed_at: null },
                    { onSuccess: () => toast.success("Avaliação reaberta.") },
                  )
                }
              >
                <LockOpen className="mr-2 size-4" /> Reabrir
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  if (!requireComplete()) return;
                  save.mutate(
                    {
                      data: values as NonNullable<AssessmentUpdate["data"]>,
                      resident_name: residentName,
                      master_notes: notes,
                      status: "fechado",
                      closed_at: new Date().toISOString(),
                    },
                    { onSuccess: () => toast.success("Avaliação fechada.") },
                  );
                }}
              >
                <Lock className="mr-2 size-4" /> Fechar avaliação
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                downloadAssessmentDocx(
                  {
                    id: assessment.id,
                    specialty: assessment.specialty,
                    resident_name: residentName,
                    status: STATUS_LABEL[assessment.status] ?? assessment.status,
                    master_notes: notes,
                    closed_at: assessment.closed_at,
                    data: values,
                    admission_date: resident?.admission_date ?? assessment.admission_date,
                    diagnosis: resident?.diagnosis ?? assessment.diagnosis,
                  },
                  spec,
                ).catch(() => toast.error("Não foi possível gerar o arquivo."))
              }
            >
              <FileDown className="mr-2 size-4" /> Baixar .docx
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Excluir esta avaliação definitivamente?")) remove.mutate();
              }}
            >
              <Trash2 className="mr-2 size-4" /> Excluir
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
