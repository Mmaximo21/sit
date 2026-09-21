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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ageFromBirthDate, formatResidentDate, type ResidentRow } from "@/lib/residents";
import {
  councilLabel,
  useClosingTerms,
  useCouncils,
  useSpecialties,
  type ClosingTermRow,
  type CouncilRow,
  type SpecialtyRow,
} from "@/lib/settings";
import { CalendarClock, Gavel, History, KeyRound, PenLine, Plus, Save, Settings2, ShieldCheck, Stethoscope, Trash2, UserRound } from "lucide-react";
import { TabPermissionsPanel } from "@/components/TabPermissionsPanel";
import { SignaturePanel } from "@/components/SignaturePanel";
import { useServerFn } from "@tanstack/react-start";
import { createMasterUser, setMasterRole } from "@/lib/admin.functions";
import { formatDeletionMoment, type DeletionLogRow } from "@/lib/deletion-log";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração do sistema — AGA ILPI" },
      {
        name: "description",
        content:
          "Painel do administrador para gerenciar residentes, especialidades, termos de encerramento e siglas dos conselhos.",
      },
      { property: "og:title", content: "Administração do sistema — AGA ILPI" },
      {
        property: "og:description",
        content: "Gerencie residentes, especialidades, termos de encerramento e conselhos profissionais.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </>
    );
  }

  if (!session?.isMaster) {
    return (
      <>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva do Administrador do sistema.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-primary">
          <Settings2 className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Administração</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Painel de administração</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Gerencie os residentes da instituição, as especialidades atendidas, os termos de encerramento das
          avaliações e as siglas dos conselhos profissionais.
        </p>
      </header>

      <Tabs defaultValue="residentes">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="residentes" className="gap-1.5">
            <UserRound className="size-4" /> Residentes
          </TabsTrigger>
          <TabsTrigger value="especialidades" className="gap-1.5">
            <Stethoscope className="size-4" /> Especialidades
          </TabsTrigger>
          <TabsTrigger value="termos" className="gap-1.5">
            <CalendarClock className="size-4" /> Termos de encerramento
          </TabsTrigger>
          <TabsTrigger value="conselhos" className="gap-1.5">
            <Gavel className="size-4" /> Conselhos
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="gap-1.5">
            <PenLine className="size-4" /> Assinaturas
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-1.5">
            <KeyRound className="size-4" /> Permissões de abas
          </TabsTrigger>
          <TabsTrigger value="administradores" className="gap-1.5">
            <ShieldCheck className="size-4" /> Administradores
          </TabsTrigger>
          <TabsTrigger value="exclusoes" className="gap-1.5">
            <History className="size-4" /> Histórico de exclusões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="residentes" className="mt-5">
          <ResidentsTab />
        </TabsContent>
        <TabsContent value="especialidades" className="mt-5">
          <SpecialtiesTab />
        </TabsContent>
        <TabsContent value="termos" className="mt-5">
          <ClosingTermsTab />
        </TabsContent>
        <TabsContent value="conselhos" className="mt-5">
          <CouncilsTab />
        </TabsContent>
        <TabsContent value="assinaturas" className="mt-5">
          <SignaturePanel />
        </TabsContent>
        <TabsContent value="permissoes" className="mt-5">
          <TabPermissionsPanel />
        </TabsContent>
        <TabsContent value="administradores" className="mt-5">
          <MastersTab />
        </TabsContent>
        <TabsContent value="exclusoes" className="mt-5">
          <DeletionsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Excluir ${label}`}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Registros já vinculados a avaliações permanecem no histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------- Residentes ------------------------------- */

/** Edição de acolhimento e diagnóstico — disponível apenas nesta área (contas Master). */
function ResidentExtraFields({ resident, onSaved }: { resident: ResidentRow; onSaved: () => void }) {
  const [admission, setAdmission] = useState(resident.admission_date ?? "");
  const [diagnosis, setDiagnosis] = useState(resident.diagnosis ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("residents")
        .update({ admission_date: admission || null, diagnosis: diagnosis.trim() || null })
        .eq("id", resident.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados do residente atualizados.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = (resident.admission_date ?? "") !== admission || (resident.diagnosis ?? "") !== diagnosis;

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor={`adm-${resident.id}`} className="text-xs">
          Data de acolhimento
        </Label>
        <Input
          id={`adm-${resident.id}`}
          type="date"
          value={admission}
          onChange={(e) => setAdmission(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`diag-${resident.id}`} className="text-xs">
          Diagnóstico
        </Label>
        <Input
          id={`diag-${resident.id}`}
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Ex.: Demência de Alzheimer, HAS, DM2"
        />
      </div>
      <Button size="sm" variant="secondary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
        Salvar
      </Button>
    </div>
  );
}

function ResidentsTab() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const { data: residents, isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id,full_name,birth_date,sex,admission_date,diagnosis")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ResidentRow[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["residents"] });

  const create = useMutation({
    mutationFn: async () => {
      const name = fullName.trim();
      if (name.length < 3) throw new Error("Informe o nome completo do residente.");
      const { error } = await supabase.from("residents").insert({
        full_name: name,
        birth_date: birthDate || null,
        sex: sex || null,
        admission_date: admissionDate || null,
        diagnosis: diagnosis.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFullName("");
      setBirthDate("");
      setSex("");
      setAdmissionDate("");
      setDiagnosis("");
      toast.success("Residente cadastrado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("residents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Residente excluído.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Novo residente" description="Nome, nascimento e sexo alimentam o preenchimento automático.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="res-name">Nome completo</Label>
            <Input id="res-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="res-birth">Data de nascimento</Label>
            <Input id="res-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sexo</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Feminino">Feminino</SelectItem>
                <SelectItem value="Masculino">Masculino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="res-admission">Data de acolhimento</Label>
            <Input
              id="res-admission"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="res-diagnosis">Diagnóstico</Label>
            <Textarea
              id="res-diagnosis"
              rows={3}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Ex.: Demência de Alzheimer, HAS, DM2"
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            <Plus className="mr-1 size-4" /> Cadastrar
          </Button>
        </form>
      </Panel>

      <Panel title={`Residentes cadastrados (${(residents ?? []).length})`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (residents ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum residente cadastrado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(residents ?? []).map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[ageFromBirthDate(r.birth_date), r.sex].filter(Boolean).join(" · ") || "Sem dados adicionais"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Acolhimento: {formatResidentDate(r.admission_date) || "não informado"} · Diagnóstico:{" "}
                      {r.diagnosis?.trim() || "não informado"}
                    </p>
                  </div>
                  <ConfirmDelete label={r.full_name} onConfirm={() => remove.mutate(r.id)} />
                </div>
                <ResidentExtraFields resident={r} onSaved={refresh} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ----------------------------- Especialidades ----------------------------- */

function SpecialtiesTab() {
  const queryClient = useQueryClient();
  const { data: specialties, isLoading } = useSpecialties({ includeInactive: true });
  const { data: councils } = useCouncils({ includeInactive: true });
  const [name, setName] = useState("");
  const [council, setCouncil] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["specialties"] });

  const create = useMutation({
    mutationFn: async () => {
      const value = name.trim();
      if (value.length < 2) throw new Error("Informe o nome da especialidade.");
      const nextOrder = ((specialties ?? []).at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase
        .from("specialties")
        .insert({ name: value, default_council: council || null, sort_order: nextOrder });
      if (error) throw new Error(error.message.includes("duplicate") ? "Especialidade já cadastrada." : error.message);
    },
    onSuccess: () => {
      setName("");
      setCouncil("");
      toast.success("Especialidade cadastrada.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SpecialtyRow> }) => {
      const { error } = await supabase.from("specialties").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("specialties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Especialidade excluída.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Nova especialidade" description="Aparece nas listas de usuários, prazos e avaliações.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="spec-name">Nome</Label>
            <Input
              id="spec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Odontologia"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Conselho padrão</Label>
            <Select value={council} onValueChange={setCouncil}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a sigla" />
              </SelectTrigger>
              <SelectContent>
                {(councils ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.acronym}>
                    {councilLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            <Plus className="mr-1 size-4" /> Cadastrar
          </Button>
        </form>
      </Panel>

      <Panel title={`Especialidades (${(specialties ?? []).length})`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="divide-y divide-border">
            {(specialties ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {s.name}
                    {!s.active ? <Badge variant="secondary">Inativa</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Conselho padrão: {s.default_council || "não definido"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Ativa
                    <Switch
                      checked={s.active}
                      onCheckedChange={(checked) => update.mutate({ id: s.id, patch: { active: checked } })}
                    />
                  </label>
                  <ConfirmDelete label={s.name} onConfirm={() => remove.mutate(s.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------ Termos de encerramento ------------------------- */

function ClosingTermsTab() {
  const queryClient = useQueryClient();
  const { data: terms, isLoading } = useClosingTerms();
  const { data: specialties } = useSpecialties({ includeInactive: true });
  const [specialty, setSpecialty] = useState("__default__");
  const [title, setTitle] = useState("Termo de Encerramento e Assinaturas");
  const [description, setDescription] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["closing-terms"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe o título do termo.");
      const { error } = await supabase.from("closing_terms").insert({
        specialty: specialty === "__default__" ? null : specialty,
        title: title.trim(),
        description: description.trim(),
      });
      if (error) {
        throw new Error(
          error.message.includes("duplicate")
            ? "Já existe um termo para essa especialidade. Edite o termo existente."
            : error.message,
        );
      }
    },
    onSuccess: () => {
      setDescription("");
      toast.success("Termo cadastrado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ClosingTermRow> }) => {
      const { error } = await supabase.from("closing_terms").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Termo atualizado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("closing_terms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Termo excluído.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel
        title="Novo termo"
        description="Use o termo geral para todas as especialidades ou crie um específico."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Aplicar a</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Todas as especialidades (geral)</SelectItem>
                {(specialties ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="term-title">Título</Label>
            <Input id="term-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="term-desc">Texto de orientação</Label>
            <Textarea
              id="term-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Preenchimento obrigatório: a avaliação só pode ser enviada com o termo completo."
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            <Plus className="mr-1 size-4" /> Cadastrar
          </Button>
        </form>
      </Panel>

      <Panel title={`Termos cadastrados (${(terms ?? []).length})`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (terms ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum termo cadastrado.</p>
        ) : (
          <ul className="space-y-4">
            {(terms ?? []).map((t) => (
              <TermEditor
                key={t.id}
                term={t}
                onSave={(patch) => update.mutate({ id: t.id, patch })}
                onDelete={() => remove.mutate(t.id)}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function TermEditor({
  term,
  onSave,
  onDelete,
}: {
  term: ClosingTermRow;
  onSave: (patch: Partial<ClosingTermRow>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(term.title);
  const [description, setDescription] = useState(term.description);

  return (
    <li className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={term.specialty ? "secondary" : "default"}>
          {term.specialty ?? "Geral — todas as especialidades"}
        </Badge>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Ativo
            <Switch checked={term.active} onCheckedChange={(checked) => onSave({ active: checked })} />
          </label>
          <ConfirmDelete label="este termo" onConfirm={onDelete} />
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título do termo" />
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Texto de orientação"
        />
        <Button size="sm" variant="outline" onClick={() => onSave({ title, description })}>
          <Save className="mr-1 size-4" /> Salvar alterações
        </Button>
      </div>
    </li>
  );
}

/* -------------------------------- Conselhos ------------------------------- */

function CouncilsTab() {
  const queryClient = useQueryClient();
  const { data: councils, isLoading } = useCouncils({ includeInactive: true });
  const [acronym, setAcronym] = useState("");
  const [name, setName] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["councils"] });

  const create = useMutation({
    mutationFn: async () => {
      const sigla = acronym.trim();
      if (sigla.length < 2) throw new Error("Informe a sigla do conselho.");
      const nextOrder = ((councils ?? []).at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase
        .from("councils")
        .insert({ acronym: sigla, name: name.trim(), sort_order: nextOrder });
      if (error) throw new Error(error.message.includes("duplicate") ? "Sigla já cadastrada." : error.message);
    },
    onSuccess: () => {
      setAcronym("");
      setName("");
      toast.success("Conselho cadastrado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CouncilRow> }) => {
      const { error } = await supabase.from("councils").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("councils").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conselho excluído.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Nova sigla" description="As siglas alimentam o campo Conselho profissional do termo.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="council-acronym">Sigla</Label>
            <Input
              id="council-acronym"
              value={acronym}
              onChange={(e) => setAcronym(e.target.value)}
              placeholder="Ex.: CRO"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="council-name">Nome do conselho</Label>
            <Input
              id="council-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Conselho Regional de Odontologia"
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            <Plus className="mr-1 size-4" /> Cadastrar
          </Button>
        </form>
      </Panel>

      <Panel title={`Conselhos (${(councils ?? []).length})`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="divide-y divide-border">
            {(councils ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {c.acronym}
                    {!c.active ? <Badge variant="secondary">Inativo</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{c.name || "Sem descrição"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Ativo
                    <Switch
                      checked={c.active}
                      onCheckedChange={(checked) => update.mutate({ id: c.id, patch: { active: checked } })}
                    />
                  </label>
                  <ConfirmDelete label={c.acronym} onConfirm={() => remove.mutate(c.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------- Administradores ---------------------------- */

const PROTECTED_LOGINS = ["root", "direcao"];
const isProtectedAccount = (fullName: string | null, username: string | null) => {
  const name = (fullName ?? "").trim().toLowerCase();
  const login = (username ?? "").trim().toLowerCase();
  return ["matheus", "vanessa"].some((p) => name === p || name.startsWith(p + " ")) ||
    PROTECTED_LOGINS.includes(login);
};

function MastersTab() {
  const { data: session } = useAuth();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createMasterUser);
  const setRoleFn = useServerFn(setMasterRole);
  const [form, setForm] = useState({ fullName: "", username: "", password: "" });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,username,full_name,specialty").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        isMaster: (roles ?? []).some((r) => r.user_id === p.id && r.role === "master"),
      }));
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["session-info"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const fullName = form.fullName.trim();
      const username = form.username.trim().toLowerCase();
      if (fullName.length < 2) throw new Error("Informe o nome completo.");
      if (!/^[a-z0-9._-]{3,30}$/.test(username))
        throw new Error("Login inválido: 3 a 30 caracteres, sem espaços ou acentos.");
      if (form.password.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
      return createFn({ data: { fullName, username, password: form.password } });
    },
    onSuccess: () => {
      toast.success("Nova conta Administradora criada.");
      setForm({ fullName: "", username: "", password: "" });
      refresh();
    },
    onError: (e: Error) =>
      toast.error(/already been registered|duplicate/i.test(e.message) ? "Já existe uma conta com esse login." : e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ userId, master }: { userId: string; master: boolean }) => setRoleFn({ data: { userId, master } }),
    onSuccess: (_d, v) => {
      toast.success(v.master ? "Título de Administrador concedido." : "Título de Administrador revogado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = users ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel
        title="Nova conta Administradora"
        description="Contas Administradoras têm acesso total ao sistema, prazos e avaliações."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="adm-name">Nome completo</Label>
            <Input id="adm-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-login">Usuário (login)</Label>
            <Input
              id="adm-login"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ex: direcao2"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-pass">Senha</Label>
            <Input
              id="adm-pass"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="mínimo 6 caracteres"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            <ShieldCheck className="mr-1 size-4" /> Criar Administrador
          </Button>
        </form>
      </Panel>

      <Panel title="Títulos de Administrador" description="Conceda ou revogue o título das contas existentes.">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((u) => {
              const locked = isProtectedAccount(u.full_name, u.username) || u.id === session?.userId;
              return (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.full_name || u.username}{" "}
                      {u.isMaster ? <Badge className="ml-1 align-middle">Administrador</Badge> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[u.username, u.specialty].filter(Boolean).join(" · ")}
                      {isProtectedAccount(u.full_name, u.username) ? " · conta protegida" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {locked ? (
                      <span className="text-xs text-muted-foreground">Bloqueado</span>
                    ) : (
                      <Switch
                        checked={u.isMaster}
                        disabled={toggle.isPending}
                        onCheckedChange={(checked) => toggle.mutate({ userId: u.id, master: checked })}
                        aria-label={`Alternar Administrador de ${u.username}`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}


function DeletionsTab() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["deletion-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deletion_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DeletionLogRow[];
    },
  });

  return (
    <Panel
      title="Histórico de exclusões"
      description="Registro permanente dos arquivos e registros excluídos, com o responsável, a data e a hora da exclusão."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !logs?.length ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nenhuma exclusão registrada até agora.
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{log.record_type}</Badge>
                <p className="font-display text-sm font-semibold">{log.record_label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Excluído por <strong className="text-foreground">{log.deleted_by_name}</strong> em{" "}
                {formatDeletionMoment(log.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
