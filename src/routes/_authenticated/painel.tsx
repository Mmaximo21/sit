import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL } from "@/lib/specialties";
import { useSpecialtyNames } from "@/lib/settings";
import { ageFromBirthDate, residentPrefill, type ResidentRow } from "@/lib/residents";
import { getFormSpec } from "@/lib/forms";
import { carryForwardData } from "@/lib/carry-forward";
import { downloadAssessmentDocx } from "@/lib/docx-export";
import { SignaturePanel } from "@/components/SignaturePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileDown,
  FilePlus2,
  Lock,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Avaliações — AGA ILPI" },
      {
        name: "description",
        content: "Acompanhe, preencha e envie as avaliações da sua especialidade.",
      },
      { property: "og:title", content: "Avaliações — AGA ILPI" },
      { property: "og:description", content: "Painel de avaliações AGA por especialidade." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: session } = useAuth();
  const specialtyNames = useSpecialtyNames();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [residentId, setResidentId] = useState("");
  const [specialty, setSpecialty] = useState<string>("");
  const [newResident, setNewResident] = useState({ full_name: "", birth_date: "", sex: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [specFilter, setSpecFilter] = useState("todas");

  // Supervisor Administrativo acessa apenas o Relatório de Plantão.
  const shiftOnly =
    session?.specialty === "Supervisor Administrativo" &&
    !session?.isMaster &&
    !session?.isCoordinator;
  useEffect(() => {
    if (shiftOnly) navigate({ to: "/plantao", replace: true });
  }, [shiftOnly, navigate]);

  const { data: period } = useQuery({
    queryKey: ["current-period"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assessment_periods")
        .select("*, period_deadlines(*)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

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

  const { data: assessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isCoordenacao = session?.isCoordenacao ?? false;
  const isMaster = (session?.isMaster ?? false) || isCoordenacao;
  const canDeleteRecords = session?.isMaster ?? false;
  const isCoordinator = (session?.isCoordinator ?? false) && !isMaster;
  const coordinatorScopes = session?.coordinatorScopes ?? [];
  /** Especialidades que a coordenação supervisiona (vazio = todas). */
  const scopeList = isCoordinator && coordinatorScopes !== null ? coordinatorScopes : [];
  const targetSpecialty = isMaster ? specialty : (session?.specialty ?? "");
  /** Coordenação e Supervisor Administrativo não criam avaliações — apenas visualizam. */
  const canCreateAssessments =
    !isCoordinator && !isCoordenacao && session?.specialty !== "Supervisor Administrativo";
  const periodOpen = period?.status === "aberto";
  const selectedResident = (residents ?? []).find((r) => r.id === residentId);

  const deadline =
    (period?.period_deadlines ?? []).find((d) => d.specialty === targetSpecialty)?.due_date ??
    period?.due_date ??
    null;

  const createResident = useMutation({
    mutationFn: async () => {
      if (!newResident.full_name.trim()) throw new Error("Informe o nome completo do residente.");
      const { data, error } = await supabase
        .from("residents")
        .insert({
          full_name: newResident.full_name.trim(),
          birth_date: newResident.birth_date || null,
          sex: newResident.sex || null,
          created_by: session?.userId ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setNewResident({ full_name: "", birth_date: "", sex: "" });
      setResidentId(id);
      toast.success("Residente cadastrado.");
      queryClient.invalidateQueries({ queryKey: ["residents"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar residente."),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão expirada.");
      if (!targetSpecialty) throw new Error("Selecione a especialidade.");
      if (!selectedResident) throw new Error("Selecione o residente pelo nome completo.");

      /** Busca a avaliação mais recente do residente em ciclos anteriores para reaproveitar os dados. */
      let previous = supabase
        .from("assessments")
        .select("data, period_id, updated_at")
        .eq("resident_id", selectedResident.id)
        .eq("specialty", targetSpecialty)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (period?.id) previous = previous.neq("period_id", period.id);
      const { data: previousRows } = await previous;
      const previousData = (previousRows?.[0]?.data as Record<string, unknown> | null) ?? null;
      const initialData = carryForwardData(
        getFormSpec(targetSpecialty),
        previousData,
        residentPrefill(selectedResident),
      );

      const { data, error } = await supabase
        .from("assessments")
        .insert({
          author_id: session.userId,
          specialty: targetSpecialty,
          resident_id: selectedResident.id,
          resident_name: selectedResident.full_name,
          admission_date: selectedResident.admission_date ?? null,
          diagnosis: selectedResident.diagnosis ?? null,
          period_id: period?.id ?? null,
          data: initialData as never,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id, carried: !!previousData };
    },
    onSuccess: ({ id, carried }) => {
      setResidentId("");
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      if (carried)
        toast.success(
          "Dados do ciclo anterior deste residente foram carregados. Revise e atualize.",
        );
      navigate({ to: "/avaliacao/$id", params: { id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao criar avaliação."),
  });

  const removeResident = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("residents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (residentId === id) setResidentId("");
      toast.success("Residente excluído.");
      queryClient.invalidateQueries({ queryKey: ["residents"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao excluir residente."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação excluída.");
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao excluir."),
  });

  const visible = assessments ?? [];
  const counts = {
    total: visible.length,
    rascunho: visible.filter((a) => a.status === "rascunho").length,
    enviado: visible.filter((a) => a.status === "enviado").length,
    fechado: visible.filter((a) => a.status === "fechado").length,
  };

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const filtered = visible.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (specFilter !== "todas" && a.specialty !== specFilter) return false;
    if (search.trim() && !normalize(a.resident_name ?? "").includes(normalize(search.trim())))
      return false;
    return true;
  });

  const deadlineDate = deadline
    ? new Date(deadline.length === 10 ? `${deadline}T23:59:59` : deadline)
    : null;
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysLeft = deadlineDate
    ? Math.round((startOfDay(deadlineDate) - startOfDay(new Date())) / 86_400_000)
    : null;

  const [deadlineAlertOpen, setDeadlineAlertOpen] = useState(false);
  const pendingCount = visible.filter((a) => a.status === "rascunho").length;

  const deadlineFor = (spec: string) =>
    (period?.period_deadlines ?? []).find((d) => d.specialty === spec)?.due_date ??
    period?.due_date ??
    null;

  const pendingBySpecialty = Object.entries(
    visible
      .filter((a) => a.status === "rascunho")
      .reduce<Record<string, number>>((acc, a) => {
        const key = a.specialty || "—";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .map(([spec, count]) => ({ spec, count, due: deadlineFor(spec) }))
    .sort((a, b) => a.spec.localeCompare(b.spec, "pt-BR"));

  useEffect(() => {
    if (!periodOpen || daysLeft === null || daysLeft > 5 || daysLeft < 0 || !period?.id) return;
    const key = `aga-deadline-alert:${period.id}:${targetSpecialty || "geral"}:${new Date().toDateString()}`;
    if (typeof window === "undefined" || window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    setDeadlineAlertOpen(true);
  }, [periodOpen, daysLeft, period?.id, targetSpecialty]);

  return (
    <div className="space-y-8">
      <section className="animate-rise relative isolate overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-hero p-6 text-white shadow-elevated sm:p-9">
        <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_8%_0%,rgba(255,255,255,0.2),transparent_58%)]" />
        <div className="animate-drift pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-accent/25 blur-3xl" />
        <div className="animate-drift animate-delay-2000 pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-success/20 blur-3xl" />
        <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/40 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="animate-rise animate-delay-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary-foreground/60">
              Painel interno
            </p>
            <h1 className="font-display mt-3 text-[2.4rem] font-semibold leading-[1.02] tracking-tight sm:text-[3rem]">
              Avaliações
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
              {isMaster
                ? "Acesso total às especialidades, com permissão para editar, fechar e excluir."
                : isCoordinator
                  ? `Coordenação (somente leitura): ${scopeList.length ? scopeList.join(", ") : "todas as especialidades"}`
                  : `Especialidade: ${session?.specialty ?? "—"}`}
            </p>
          </div>
          <div className="animate-rise animate-delay-200 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 text-sm backdrop-blur">
            <p className="flex items-center gap-2 font-medium">
              <CalendarClock className="size-4" />
              {period ? period.title : "Nenhum ciclo criado"}
            </p>
            <p className="mt-1 text-primary-foreground/75">
              {period
                ? `${periodOpen ? "Aberto" : "Fechado"}${deadline ? ` · prazo ${formatDate(deadline)}` : ""}`
                : "Aguarde o Administrador abrir um ciclo."}
            </p>
            {periodOpen && daysLeft !== null ? (
              <p
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  daysLeft < 0
                    ? "bg-destructive/20 text-primary-foreground"
                    : daysLeft <= 3
                      ? "bg-warning/25 text-primary-foreground"
                      : "bg-primary-foreground/15 text-primary-foreground/90"
                }`}
              >
                {daysLeft < 0
                  ? `Atrasado há ${Math.abs(daysLeft)} dia(s)`
                  : daysLeft === 0
                    ? "Último dia do prazo"
                    : `Faltam ${daysLeft} dia(s)`}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Avaliações", value: counts.total, icon: ClipboardList },
          { label: "Rascunhos", value: counts.rascunho, icon: FilePlus2 },
          { label: "Enviadas", value: counts.enviado, icon: Send },
          { label: "Fechadas", value: counts.fechado, icon: CheckCircle2 },
        ].map((card, i) => (
          <div
            key={card.label}
            style={{ animationDelay: `${(i + 1) * 90}ms` }}
            className="animate-rise group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
          >
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {card.label}
              </span>
              <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <card.icon className="size-4" />
              </span>
            </div>
            <p className="font-display mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
          </div>
        ))}
      </section>

      {isMaster ? (
        <div className="animate-rise card-surface rounded-2xl border border-border p-5 shadow-soft transition-shadow duration-300 hover:shadow-elevated sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
              <Users className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Cadastro de residentes</h2>
              <p className="text-sm text-muted-foreground">
                Alimenta automaticamente nome, data de nascimento, idade e sexo nos formulários.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-56 flex-1 space-y-2">
              <Label htmlFor="new-resident">Nome completo</Label>
              <Input
                id="new-resident"
                value={newResident.full_name}
                onChange={(e) => setNewResident((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Nome completo do residente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-birth">Data de nascimento</Label>
              <Input
                id="new-birth"
                type="date"
                value={newResident.birth_date}
                onChange={(e) => setNewResident((p) => ({ ...p, birth_date: e.target.value }))}
              />
            </div>
            <div className="min-w-40 space-y-2">
              <Label>Sexo</Label>
              <Select
                value={newResident.sex}
                onValueChange={(value) => setNewResident((p) => ({ ...p, sex: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => createResident.mutate()}
              disabled={createResident.isPending}
            >
              <UserPlus className="mr-2 size-4" /> Cadastrar residente
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium">
              Residentes cadastrados ({(residents ?? []).length})
            </h3>
            <ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {(residents ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors duration-200 hover:bg-muted/50"
                >
                  <span>
                    <span className="font-medium">{r.full_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.birth_date ? formatDate(r.birth_date) : "sem nascimento"} ·{" "}
                      {ageFromBirthDate(r.birth_date) || "idade —"} · {r.sex ?? "sexo —"}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${r.full_name}`}
                    className="text-destructive hover:text-destructive"
                    disabled={removeResident.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          `Excluir o residente ${r.full_name}? As avaliações vinculadas permanecerão.`,
                        )
                      )
                        removeResident.mutate(r.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
              {(residents ?? []).length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum residente cadastrado.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      {(periodOpen || isMaster) && canCreateAssessments ? (
        <div className="animate-rise card-surface rounded-2xl border border-border p-5 shadow-soft transition-shadow duration-300 hover:shadow-elevated sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Nova avaliação</h2>
              <p className="text-sm text-muted-foreground">
                Selecione o residente e confirme — nome, nascimento, idade e sexo vêm preenchidos.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="min-w-64 flex-1 space-y-2">
              <Label>Residente</Label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger className="transition-colors duration-200 hover:border-primary/50">
                  <SelectValue placeholder="Selecione pelo nome completo" />
                </SelectTrigger>
                <SelectContent>
                  {(residents ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedResident ? (
                <p className="animate-fade-in flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-normal">
                    {selectedResident.birth_date
                      ? formatDate(selectedResident.birth_date)
                      : "sem nascimento"}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {ageFromBirthDate(selectedResident.birth_date) || "idade —"}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {selectedResident.sex ?? "sexo —"}
                  </Badge>
                </p>
              ) : (residents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum residente cadastrado. Peça ao Administrador para cadastrar.
                </p>
              ) : null}
            </div>
            {isMaster ? (
              <div className="min-w-52 space-y-2">
                <Label>Especialidade</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="transition-colors duration-200 hover:border-primary/50">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialtyNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              className="group relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
              onClick={() => {
                if (!targetSpecialty) {
                  toast.error("Selecione a especialidade.");
                  return;
                }
                if (!selectedResident) {
                  toast.error("Selecione o residente pelo nome completo.");
                  return;
                }
                setConfirmOpen(true);
              }}
              disabled={create.isPending}
            >
              <FilePlus2 className="mr-2 size-4 transition-transform duration-200 group-hover:rotate-6" />
              {create.isPending ? "Criando..." : "Criar e preencher"}
            </Button>
          </div>
        </div>
      ) : isCoordinator ? (
        <div className="animate-rise flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground">
          <Lock className="size-4" /> Perfil de coordenação: consulta e download das avaliações
          enviadas, sem criar, editar ou excluir registros.
        </div>
      ) : (
        <div className="animate-rise flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground">
          <Lock className="size-4" /> O ciclo está fechado. Não é possível criar novas avaliações.
        </div>
      )}

      <AlertDialog open={deadlineAlertOpen} onOpenChange={setDeadlineAlertOpen}>
        <AlertDialogContent className="border-warning/40">
          <AlertDialogHeader>
            <div className="animate-rise mx-auto flex size-14 items-center justify-center rounded-full bg-warning/15 text-warning">
              <CalendarClock className="size-7" />
            </div>
            <AlertDialogTitle className="font-display text-center">
              {daysLeft === 0
                ? "O prazo encerra hoje"
                : `Faltam ${daysLeft} dia(s) para o fechamento`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-center text-sm">
                <p>
                  O ciclo{" "}
                  <span className="font-medium text-foreground">{period?.title ?? "atual"}</span>{" "}
                  encerra em{" "}
                  <span className="font-medium text-foreground">
                    {deadline ? formatDate(deadline) : "—"}
                  </span>
                  .
                </p>
                <p>
                  {pendingCount > 0
                    ? `Existem ${pendingCount} avaliação(ões) em rascunho aguardando envio. Finalize antes do fechamento.`
                    : "Nenhum rascunho pendente. Confira se todas as avaliações necessárias foram enviadas."}
                </p>
                {pendingBySpecialty.length > 0 && (
                  <div className="divide-y divide-border rounded-xl border border-border bg-muted/30 text-left">
                    <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Especialidade</span>
                      <span>Rascunhos · prazo</span>
                    </div>
                    {pendingBySpecialty.map((item) => (
                      <div
                        key={item.spec}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="font-medium text-foreground">{item.spec}</span>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-semibold text-warning">{item.count}</span> ·{" "}
                          {item.due ? formatDate(item.due) : "sem prazo"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeadlineAlertOpen(false)}>
              <CheckCircle2 className="mr-2 size-4" /> Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Confirmar novo preenchimento
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>Será criada uma nova avaliação com os dados abaixo:</p>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-foreground">
                  <p className="flex items-center gap-2 font-medium">
                    <Users className="size-4 text-primary" />
                    {selectedResident?.full_name ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedResident?.birth_date
                      ? formatDate(selectedResident.birth_date)
                      : "sem nascimento"}{" "}
                    · {ageFromBirthDate(selectedResident?.birth_date ?? null) || "idade —"} ·{" "}
                    {selectedResident?.sex ?? "sexo —"}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs">
                    <ClipboardList className="size-3.5 text-primary" />
                    Especialidade: <span className="font-medium">{targetSpecialty || "—"}</span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => create.mutate()}>
              <CheckCircle2 className="mr-2 size-4" /> Confirmar e abrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por residente"
              aria-label="Buscar por residente"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" aria-label="Filtrar por situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as situações</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Enviada</SelectItem>
              <SelectItem value="fechado">Fechada</SelectItem>
            </SelectContent>
          </Select>
          {isMaster || isCoordinator ? (
            <Select value={specFilter} onValueChange={setSpecFilter}>
              <SelectTrigger className="w-48" aria-label="Filtrar por especialidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as especialidades</SelectItem>
                {(isCoordinator && scopeList.length
                  ? specialtyNames.filter((n) => scopeList.includes(n))
                  : specialtyNames
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {filtered.length} de {visible.length}
          </span>
        </div>
        {loadingAssessments ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Residente</th>
                <th className="px-4 py-3">Especialidade</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Atualizado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-border transition-colors duration-200 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium">{a.resident_name || "Sem nome"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.specialty}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        a.status === "fechado"
                          ? "secondary"
                          : a.status === "enviado"
                            ? "default"
                            : "outline"
                      }
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(a.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to="/avaliacao/$id"
                        params={{ id: a.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        Abrir
                      </Link>
                      {isMaster || isCoordinator ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Baixar .docx"
                            onClick={() =>
                              downloadAssessmentDocx(
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
                              ).catch(() => toast.error("Não foi possível gerar o arquivo."))
                            }
                          >
                            <FileDown className="size-4" />
                          </Button>
                          {canDeleteRecords ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir avaliação"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Excluir a avaliação de ${a.resident_name || "residente"}?`,
                                  )
                                )
                                  remove.mutate(a.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <ClipboardList className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-3 font-medium">Nenhuma avaliação encontrada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {visible.length
                        ? "Ajuste a busca ou os filtros para ver outros registros."
                        : isCoordinator
                          ? "Ainda não há avaliações enviadas nas especialidades sob sua coordenação."
                          : "Selecione um residente acima para iniciar o primeiro preenchimento."}
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {!session?.isMaster ? <SignaturePanel compact /> : null}
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
