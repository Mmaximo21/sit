import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL } from "@/lib/specialties";
import { useSpecialtyNames } from "@/lib/settings";
import { ageFromBirthDate, type ResidentRow } from "@/lib/residents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus2, NotebookPen, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pia/")({
  head: () => ({
    meta: [
      { title: "PIA — Plano Individual de Atendimento | ILPI" },
      {
        name: "description",
        content: "Elabore e acompanhe o Plano Individual de Atendimento de cada residente por especialidade.",
      },
      { property: "og:title", content: "PIA — Plano Individual de Atendimento" },
      { property: "og:description", content: "Metas, prazos e evolução do período por especialidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PiaList,
});

function PiaList() {
  const { data: session } = useAuth();
  const specialtyNames = useSpecialtyNames();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [residentId, setResidentId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [search, setSearch] = useState("");

  const isCoordenacao = session?.isCoordenacao ?? false;
  const isMaster = (session?.isMaster ?? false) || isCoordenacao;
  const isCoordinator = (session?.isCoordinator ?? false) && !isMaster;
  const targetSpecialty = session?.isMaster ? specialty : (session?.specialty ?? "");
  const canCreate =
    !isCoordinator && !isCoordenacao && session?.specialty !== "Supervisor Administrativo" && !!session;

  const { data: residents } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, birth_date, sex, admission_date, diagnosis")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data as ResidentRow[];
    },
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["care-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_plans")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedResident = (residents ?? []).find((r) => r.id === residentId);

  const create = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão expirada.");
      if (!targetSpecialty) throw new Error("Selecione a especialidade.");
      if (!selectedResident) throw new Error("Selecione o residente pelo nome completo.");
      if (!periodLabel.trim()) throw new Error("Informe o período do plano (ex.: Abril a junho, 2026).");

      const { data, error } = await supabase
        .from("care_plans")
        .insert({
          author_id: session.userId,
          specialty: targetSpecialty,
          resident_id: selectedResident.id,
          resident_name: selectedResident.full_name,
          period_label: periodLabel.trim(),
          admission_date: selectedResident.admission_date ?? null,
          diagnosis: selectedResident.diagnosis ?? null,
          data: {
            nome: selectedResident.full_name,
            nascimento: selectedResident.birth_date ?? "",
            idade: ageFromBirthDate(selectedResident.birth_date),
            acolhimento: selectedResident.admission_date ?? "",
            admissao: selectedResident.admission_date ?? "",
            diagnostico_principal: selectedResident.diagnosis ?? "",
            diagnostico: selectedResident.diagnosis ?? "",
            periodo: periodLabel.trim(),
            profissional: session.fullName,
            registro: session.registry ?? "",
          } as never,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["care-plans"] });
      navigate({ to: "/pia/$id", params: { id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível criar o PIA."),
  });

  const filtered = (plans ?? []).filter((plan) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      plan.resident_name.toLowerCase().includes(term) ||
      plan.specialty.toLowerCase().includes(term) ||
      (plan.period_label ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="animate-rise relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-hero p-5 text-white shadow-elevated sm:p-7">
        <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">Documento institucional</p>
          <h1 className="font-display mt-1.5 text-2xl font-semibold sm:text-3xl">
            PIA — Plano Individual de Atendimento
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/85">
            Estruturado por especialidade com diagnósticos, evolução do período, metas e prazos, seguindo o
            modelo institucional da ILPI.
          </p>
        </div>
      </div>

      {canCreate ? (
        <div className="card-surface space-y-4 p-5">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-4 text-primary" />
            <h2 className="font-medium">Novo PIA</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>Residente</Label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione pelo nome completo" />
                </SelectTrigger>
                <SelectContent>
                  {(residents ?? []).map((resident) => (
                    <SelectItem key={resident.id} value={resident.id}>
                      {resident.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {session?.isMaster ? (
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialtyNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input value={targetSpecialty} disabled />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="periodo">Período do plano</Label>
              <Input
                id="periodo"
                value={periodLabel}
                placeholder="Abril a junho, 2026"
                onChange={(e) => setPeriodLabel(e.target.value)}
              />
            </div>
          </div>
          {selectedResident ? (
            <p className="text-xs text-muted-foreground">
              Nascimento: {selectedResident.birth_date ?? "não informado"} ·{" "}
              {ageFromBirthDate(selectedResident.birth_date) || "idade não calculada"}
            </p>
          ) : null}
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <FilePlus2 className="mr-2 size-4" /> Criar PIA
          </Button>
        </div>
      ) : null}

      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Planos registrados</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              placeholder="Buscar residente, especialidade ou período"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nenhum PIA registrado ainda.</p>
          ) : (
            filtered.map((plan) => (
              <Link
                key={plan.id}
                to="/pia/$id"
                params={{ id: plan.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{plan.resident_name || "Residente não informado"}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.specialty}
                    {plan.period_label ? ` · ${plan.period_label}` : ""}
                  </p>
                </div>
                <Badge variant={plan.status === "fechado" ? "secondary" : "outline"}>
                  {STATUS_LABEL[plan.status] ?? plan.status}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
