import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPiaSpec } from "@/lib/forms/pia";
import { applyClosingSettings, missingRequiredFields } from "@/lib/forms/closing";
import { pickClosingTerm, useClosingTerms, useCouncilOptions } from "@/lib/settings";
import { formProgress } from "@/lib/forms/progress";
import { FormRenderer } from "@/components/FormRenderer";
import { STATUS_LABEL } from "@/lib/specialties";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CloudUpload, FileDown, Lock, LockOpen, Save, Send, Trash2 } from "lucide-react";
import { downloadAssessmentDocx } from "@/lib/docx-export";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { formatResidentDate, residentPrefill, type ResidentRow } from "@/lib/residents";

type CarePlanUpdate = Database["public"]["Tables"]["care_plans"]["Update"];
type FormValues = Record<string, unknown>;

export const Route = createFileRoute("/_authenticated/pia/$id")({
  head: () => ({
    meta: [
      { title: "Preenchimento do PIA — ILPI" },
      { name: "description", content: "Preencha o Plano Individual de Atendimento do residente." },
      { property: "og:title", content: "Preenchimento do PIA — ILPI" },
      { property: "og:description", content: "Diagnósticos, evolução, metas e prazos do período." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PiaPage,
});

function PiaPage() {
  const { id } = Route.useParams();
  const { data: session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>({});
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["care-plan", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_plans")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: resident } = useQuery({
    queryKey: ["resident", plan?.resident_id],
    enabled: Boolean(plan?.resident_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, birth_date, sex, admission_date, diagnosis")
        .eq("id", plan!.resident_id!)
        .maybeSingle();
      if (error) throw error;
      return data as ResidentRow | null;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: CarePlanUpdate) => {
      const { error } = await supabase.from("care_plans").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-plan", id] });
      queryClient.invalidateQueries({ queryKey: ["care-plans"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  useEffect(() => {
    if (plan && !loaded && (!plan.resident_id || resident !== undefined)) {
      const stored = (plan.data as FormValues) ?? {};
      const prefill = resident ? residentPrefill(resident) : {};
      const merged: FormValues = { ...stored };
      for (const [key, value] of Object.entries(prefill)) {
        if (merged[key] === undefined || merged[key] === "") merged[key] = value;
      }
      setValues(merged);
      setNotes(plan.master_notes ?? "");
      if (!plan?.resident_name && resident?.full_name) {
        save.mutate({ resident_name: resident.full_name });
      }
      setLoaded(true);
    }
  }, [plan, resident, loaded, save]);

  const isMaster = (session?.isMaster ?? false) || (session?.isCoordenacao ?? false);
  const isCoordinator = (session?.isCoordinator ?? false) && !isMaster;
  const closed = plan?.status === "fechado";
  const readOnly = isCoordinator || (session?.isCoordenacao ?? false) || (!isMaster && closed);
  const councilOptions = useCouncilOptions();
  const { data: closingTerms } = useClosingTerms();

  const spec = useMemo(() => {
    if (!plan) return null;
    const term = pickClosingTerm(closingTerms, plan.specialty);
    return applyClosingSettings(getPiaSpec(plan.specialty), {
      councilOptions,
      title: term?.title,
      description: term?.description,
    });
  }, [plan, closingTerms, councilOptions]);

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("care_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PIA excluído.");
      queryClient.invalidateQueries({ queryKey: ["care-plans"] });
      navigate({ to: "/pia" });
    },
  });

  const patchOf = (extra: CarePlanUpdate = {}): CarePlanUpdate => ({
    data: values as NonNullable<CarePlanUpdate["data"]>,
    period_label: String(values["periodo"] ?? plan?.period_label ?? ""),
    ...(isMaster ? { master_notes: notes } : {}),
    resident_name: resident?.full_name ?? plan?.resident_name ?? "",
    admission_date: resident?.admission_date ?? null,
    diagnosis: resident?.diagnosis ?? null,
    ...extra,
  });

  const requireComplete = () => {
    if (!spec) return false;
    const missing = missingRequiredFields(spec, values);
    if (missing.length) {
      setMissingKeys(new Set(missing.map((f) => f.key)));
      toast.error(`Campos obrigatórios pendentes: ${missing.map((f) => f.label).join(", ")}.`);
      document
        .querySelector(`[data-field="${missing[0]!.key}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setMissingKeys(new Set());
    return true;
  };

  const progress = useMemo(() => (spec ? formProgress(spec, values) : null), [spec, values]);

  useEffect(() => {
    if (!loaded || readOnly || !dirty || !plan) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      save.mutate(patchOf(), {
        onSuccess: () => {
          setSavedAt(new Date());
          setDirty(false);
        },
      });
    }, 1500);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, notes, dirty, loaded, readOnly]);

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );

  if (!plan || !spec)
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">PIA não encontrado ou sem permissão de acesso.</p>
        <Link to="/pia" className="text-primary hover:underline">
          Voltar aos planos
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <Link
        to="/pia"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Planos Individuais
      </Link>

      <div className="animate-rise relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-hero p-5 text-white shadow-elevated sm:p-7">
        <div
          className="bg-grid-soft pointer-events-none absolute inset-0 opacity-25"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">
              {plan.specialty}
            </p>
            <h1 className="font-display mt-1.5 text-2xl font-semibold sm:text-3xl">{spec.title}</h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {resident?.full_name || plan.resident_name || "Residente não informado"}
              {plan.period_label ? ` · ${plan.period_label}` : ""}
            </p>
            {(resident?.admission_date ||
              plan.admission_date ||
              resident?.diagnosis ||
              plan.diagnosis) && (
              <p className="mt-1 text-xs text-primary-foreground/60">
                {(resident?.admission_date ?? plan.admission_date)
                  ? `Acolhimento: ${formatResidentDate(resident?.admission_date ?? plan.admission_date)}`
                  : ""}
                {(resident?.admission_date ?? plan.admission_date) &&
                (resident?.diagnosis ?? plan.diagnosis)
                  ? " · "
                  : ""}
                {(resident?.diagnosis ?? plan.diagnosis)
                  ? `Diagnóstico: ${resident?.diagnosis ?? plan.diagnosis}`
                  : ""}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
          >
            {STATUS_LABEL[plan.status] ?? plan.status}
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
          <Lock className="size-4" /> Este plano está somente para leitura.
        </div>
      ) : null}

      <FormRenderer
        spec={spec}
        values={values}
        readOnly={readOnly}
        highlight={missingKeys}
        assessmentId={plan.id}
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
            {progress.percent}% preenchido{!readOnly && dirty ? " · alterações não salvas" : ""}
          </span>
        ) : null}

        {!readOnly ? (
          <>
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(patchOf(), { onSuccess: () => toast.success("Rascunho salvo.") })
              }
            >
              <Save className="mr-2 size-4" /> Salvar
            </Button>
            {plan.status !== "enviado" ? (
              <Button
                disabled={save.isPending}
                onClick={() => {
                  if (!requireComplete()) return;
                  save.mutate(
                    patchOf({ status: "enviado", submitted_at: new Date().toISOString() }),
                    { onSuccess: () => toast.success("PIA enviado.") },
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
                    { onSuccess: () => toast.success("PIA reaberto.") },
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
                  save.mutate(patchOf({ status: "fechado", closed_at: new Date().toISOString() }), {
                    onSuccess: () => toast.success("PIA fechado."),
                  });
                }}
              >
                <Lock className="mr-2 size-4" /> Fechar PIA
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                downloadAssessmentDocx(
                  {
                    id: plan.id,
                    specialty: plan.specialty,
                    resident_name: plan.resident_name,
                    status: STATUS_LABEL[plan.status] ?? plan.status,
                    master_notes: notes,
                    closed_at: plan.closed_at,
                    data: values,
                    admission_date: resident?.admission_date ?? plan.admission_date,
                    diagnosis: resident?.diagnosis ?? plan.diagnosis,
                  },
                  spec,
                  "PIA",
                ).catch(() => toast.error("Não foi possível gerar o arquivo."))
              }
            >
              <FileDown className="mr-2 size-4" /> Baixar .docx
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Excluir este PIA definitivamente?")) remove.mutate();
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
