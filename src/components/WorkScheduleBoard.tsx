import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canAccessTab, type TabKey } from "@/lib/tabs";
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
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  BriefcaseMedical,
  Palmtree,
  Plus,
  Repeat,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { downloadWorkSchedulePdf } from "@/lib/work-schedule-pdf";
import {
  MIN_ROTATION_DAYS,
  MONTH_LABELS,
  SHIFT_OPTIONS,
  WEEKDAY_LABELS,
  addDaysISO,
  daysFromToday,
  formatDateBR,
  holidayName,
  isDiarista,
  isWorkDay,
  medicalLeaveOn,
  medicalLeaveName,
  normalizeName,
  memberShiftOn,
  monthDates,
  toISODate,
  todayISO,
  vacationOn,
  vacationOverlapsMonth,
  type ScheduleSector,
  type Shift,
  type ShiftMember,
  type ShiftMedicalLeave,
  type ShiftRotation,
  type ShiftVacation,
} from "@/lib/work-schedule";

export type WorkScheduleBoardProps = {
  sector: ScheduleSector;
  tabKey: TabKey;
  eyebrow: string;
  title: string;
  description: string;
  excelTitle: string;
  fileSlug: string;
  icon: React.ReactNode;
};

export function WorkScheduleBoard({
  sector,
  tabKey,
  eyebrow,
  title,
  description,
  excelTitle,
  fileSlug,
  icon,
}: WorkScheduleBoardProps) {
  const { data: session, isLoading: loadingSession } = useAuth();
  const queryClient = useQueryClient();
  const allowed = canAccessTab(session, tabKey);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [anchorDate, setAnchorDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [newName, setNewName] = useState("");
  const [newJob, setNewJob] = useState("");
  const [newCouncil, setNewCouncil] = useState("");
  const [newRegistry, setNewRegistry] = useState("");
  const [newHours, setNewHours] = useState("");
  const extended = sector === "TECNICA" || sector === "ADMINISTRATIVA";
  const [newShift, setNewShift] = useState<Shift>("SD1");
  const [rotMember, setRotMember] = useState("");
  const [rotShift, setRotShift] = useState<Shift>("SD2");
  const [rotDays, setRotDays] = useState(String(MIN_ROTATION_DAYS));
  const [vacMember, setVacMember] = useState("");
  const [vacStart, setVacStart] = useState("");
  const [vacEnd, setVacEnd] = useState("");
  const [vacCover, setVacCover] = useState("");
  const [vacCoverJob, setVacCoverJob] = useState("");
  const [leaveMember, setLeaveMember] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveNote, setLeaveNote] = useState("");
  const [downloading, setDownloading] = useState(false);

  const settings = useQuery({
    queryKey: ["work-schedule-sector", sector],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedule_sectors")
        .select("anchor_date, notes, updated_at")
        .eq("sector", sector)
        .maybeSingle();
      if (error) throw error;
      setAnchorDate((current) => current || data?.anchor_date || todayISO());
      setNotes((current) => current || data?.notes || "");
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["work-shift-members", sector],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_shift_members")
        .select("*")
        .eq("sector", sector)
        .order("shift")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ShiftMember[];
    },
  });

  const rotations = useQuery({
    queryKey: ["work-shift-rotations"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_shift_rotations")
        .select("*")
        .order("effective_date");
      if (error) throw error;
      return (data ?? []) as ShiftRotation[];
    },
  });

  const vacations = useQuery({
    queryKey: ["work-shift-vacations"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_shift_vacations")
        .select("*")
        .order("start_date");
      if (error) throw error;
      return (data ?? []) as ShiftVacation[];
    },
  });

  const medicalLeaves = useQuery({
    queryKey: ["work-shift-medical-leaves"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_shift_medical_leaves")
        .select("*")
        .order("start_date");
      if (error) throw error;
      return (data ?? []) as ShiftMedicalLeave[];
    },
  });

  const anchor = anchorDate || settings.data?.anchor_date || todayISO();
  const days = useMemo(() => monthDates(year, month), [year, month]);
  const monthHolidays = useMemo(
    () =>
      days
        .map((date) => ({ dayISO: toISODate(date), name: holidayName(toISODate(date)) }))
        .filter((item): item is { dayISO: string; name: string } => item.name !== null),
    [days],
  );
  const memberList = members.data ?? [];
  const memberIds = new Set(memberList.map((member) => member.id));
  const rotationList = (rotations.data ?? []).filter((rotation) => memberIds.has(rotation.member_id));
  const vacationList = (vacations.data ?? []).filter((item) => memberIds.has(item.member_id));
  const medicalLeaveList = (medicalLeaves.data ?? []).filter((item) =>
    item.sector ? item.sector === sector : item.member_id ? memberIds.has(item.member_id) : false,
  );

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_schedule_sectors").upsert({
        sector,
        anchor_date: anchor,
        notes: notes.trim() || null,
        updated_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-schedule-sector", sector] });
      toast.success("Escala salva.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error("Informe o nome do colaborador.");
      const { error } = await supabase.from("work_shift_members").insert({
        name,
        job_title: newJob.trim() || null,
        council: extended ? newCouncil.trim() || null : null,
        registry_number: extended ? newRegistry.trim() || null : null,
        work_hours: extended ? newHours.trim() || null : null,
        shift: newShift,
        sector,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNewName("");
      setNewJob("");
      setNewCouncil("");
      setNewRegistry("");
      setNewHours("");
      await queryClient.invalidateQueries({ queryKey: ["work-shift-members", sector] });
      toast.success("Colaborador incluído na escala.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível incluir."),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_shift_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-shift-members", sector] });
      await queryClient.invalidateQueries({ queryKey: ["work-shift-rotations"] });
      toast.success("Colaborador removido da escala.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível remover."),
  });

  const addRotation = useMutation({
    mutationFn: async () => {
      const days_ = Number(rotDays);
      if (!rotMember) throw new Error("Escolha o colaborador.");
      if (!Number.isFinite(days_) || days_ < MIN_ROTATION_DAYS) {
        throw new Error(`A rotatividade só pode ser programada a partir de ${MIN_ROTATION_DAYS} dias.`);
      }
      const effective = addDaysISO(todayISO(), Math.round(days_));
      const member = memberList.find((item) => item.id === rotMember);
      const { error } = await supabase.from("work_shift_rotations").insert({
        member_id: rotMember,
        to_shift: rotShift,
        effective_date: effective,
        note: member ? `${member.name} passa para o plantão ${rotShift} em ${Math.round(days_)} dias.` : null,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-shift-rotations"] });
      toast.success("Rotatividade programada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível programar."),
  });

  const removeRotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_shift_rotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-shift-rotations"] });
      toast.success("Rotatividade cancelada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível cancelar."),
  });

  const addVacation = useMutation({
    mutationFn: async () => {
      if (!vacMember) throw new Error("Escolha o colaborador que sai de férias.");
      if (!vacStart || !vacEnd) throw new Error("Informe a data de entrada e o retorno das férias.");
      if (vacEnd < vacStart) throw new Error("O retorno deve ser depois da entrada em férias.");
      const cover = vacCover.trim();
      if (!cover) throw new Error("Informe o profissional que vai cobrir as férias.");
      const { error } = await supabase.from("work_shift_vacations").insert({
        member_id: vacMember,
        start_date: vacStart,
        end_date: vacEnd,
        cover_name: cover,
        cover_job_title: vacCoverJob.trim() || null,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setVacStart("");
      setVacEnd("");
      setVacCover("");
      setVacCoverJob("");
      await queryClient.invalidateQueries({ queryKey: ["work-shift-vacations"] });
      toast.success("Férias registradas na escala.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar."),
  });

  const removeVacation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_shift_vacations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-shift-vacations"] });
      toast.success("Férias removidas da escala.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível remover."),
  });

  const addMedicalLeave = useMutation({
    mutationFn: async () => {
      const name = leaveMember.trim();
      if (!name) throw new Error("Digite o nome do colaborador afastado.");
      if (!leaveStart) throw new Error("Informe o início do afastamento.");
      if (leaveEnd && leaveEnd < leaveStart) throw new Error("O retorno deve ser depois do início do afastamento.");
      const matched = memberList.find((item) => normalizeName(item.name) === normalizeName(name));
      const { error } = await supabase.from("work_shift_medical_leaves").insert({
        member_id: matched?.id ?? null,
        member_name: name,
        sector,
        start_date: leaveStart,
        end_date: leaveEnd || null,
        note: leaveNote.trim() || null,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setLeaveMember("");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveNote("");
      await queryClient.invalidateQueries({ queryKey: ["work-shift-medical-leaves"] });
      toast.success("Afastamento médico registrado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar."),
  });

  const removeMedicalLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_shift_medical_leaves").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-shift-medical-leaves"] });
      toast.success("Afastamento médico removido.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível remover."),
  });

  async function download() {
    try {
      setDownloading(true);
      await downloadWorkSchedulePdf({
        year,
        month,
        anchorDate: anchor,
        members: memberList,
        rotations: rotationList,
        vacations: vacationList,
        medicalLeaves: medicalLeaveList,
        notes,
        title: excelTitle,
        fileSlug,
        extended,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    } finally {
      setDownloading(false);
    }
  }

  function shiftMonth(step: number) {
    const date = new Date(year, month + step, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  }

  if (loadingSession) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Somente as contas liberadas pelo Administrador podem ver esta escala.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-widest">{eyebrow}</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Configuração do ciclo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor={`anchor-${sector}`}>Dia em que o plantão SD1 trabalha</Label>
            <Input
              id={`anchor-${sector}`}
              type="date"
              value={anchor}
              onChange={(event) => setAnchorDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`notes-${sector}`}>Observações</Label>
            <Input
              id={`notes-${sector}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: trocas combinadas, feriados, avisos da equipe"
            />
          </div>
          <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
            Salvar
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <BriefcaseMedical className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Afastamento médico</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre o período para retirar automaticamente os dias do colaborador da escala e identificá-lo no PDF.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_150px_150px_1fr_auto] xl:items-end">
          <div>
            <Label htmlFor={`leave-member-${sector}`}>Colaborador</Label>
            <Input
              id={`leave-member-${sector}`}
              value={leaveMember}
              onChange={(event) => setLeaveMember(event.target.value)}
              placeholder="Digite o nome do colaborador"
            />
          </div>
          <div>
            <Label htmlFor={`leave-start-${sector}`}>Início</Label>
            <Input id={`leave-start-${sector}`} type="date" value={leaveStart} onChange={(event) => setLeaveStart(event.target.value)} />
          </div>
          <div>
            <Label htmlFor={`leave-end-${sector}`}>Retorno (opcional)</Label>
            <Input id={`leave-end-${sector}`} type="date" value={leaveEnd} onChange={(event) => setLeaveEnd(event.target.value)} />
          </div>
          <div>
            <Label htmlFor={`leave-note-${sector}`}>Observação</Label>
            <Input id={`leave-note-${sector}`} value={leaveNote} onChange={(event) => setLeaveNote(event.target.value)} placeholder="Ex.: atestado médico" />
          </div>
          <Button onClick={() => addMedicalLeave.mutate()} disabled={addMedicalLeave.isPending}>
            <Plus className="mr-1 size-4" /> Registrar
          </Button>
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {medicalLeaveList.length === 0 ? <li className="text-muted-foreground">Nenhum afastamento médico registrado.</li> : null}
          {medicalLeaveList.map((leave) => {
            return (
              <li key={leave.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 px-4 py-3">
                <span>
                  <strong>{medicalLeaveName(leave, memberList)}</strong>{" "}
                  {leave.end_date
                    ? <>afastado de {formatDateBR(leave.start_date)} a {formatDateBR(leave.end_date)}</>
                    : <>afastado desde {formatDateBR(leave.start_date)} — retorno em aberto</>}
                  {leave.note ? <span className="block text-xs text-muted-foreground">{leave.note}</span> : null}
                </span>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMedicalLeave.mutate(leave.id)}>
                  <Trash2 className="mr-1 size-4" /> Remover
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Colaboradores por plantão</h2>
        <div
          className={`mt-4 grid gap-3 sm:items-end ${
            extended
              ? "sm:grid-cols-[1fr_1fr_130px_130px_130px_auto]"
              : "sm:grid-cols-[1fr_1fr_140px_auto]"
          }`}
        >
          <div>
            <Label htmlFor={`name-${sector}`}>Nome do colaborador</Label>
            <Input
              id={`name-${sector}`}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <Label htmlFor={`job-${sector}`}>Profissão</Label>
            <Input
              id={`job-${sector}`}
              value={newJob}
              onChange={(event) => setNewJob(event.target.value)}
              placeholder="Ex.: Técnico de Enfermagem"
            />
          </div>
          {extended ? (
            <>
              <div>
                <Label htmlFor={`council-${sector}`}>Conselho</Label>
                <Input
                  id={`council-${sector}`}
                  value={newCouncil}
                  onChange={(event) => setNewCouncil(event.target.value)}
                  placeholder="Ex.: COREN-RJ 123456"
                />
              </div>
              <div>
                <Label htmlFor={`registry-${sector}`}>Matrícula</Label>
                <Input
                  id={`registry-${sector}`}
                  value={newRegistry}
                  onChange={(event) => setNewRegistry(event.target.value)}
                  placeholder="Ex.: 12345"
                />
              </div>
              <div>
                <Label htmlFor={`hours-${sector}`}>Horário</Label>
                <Input
                  id={`hours-${sector}`}
                  value={newHours}
                  onChange={(event) => setNewHours(event.target.value)}
                  placeholder="Ex.: 08h às 17h"
                />
              </div>
            </>
          ) : null}
          <div>
            <Label>Plantão</Label>
            <Select value={newShift} onValueChange={(value) => setNewShift(value as Shift)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_OPTIONS.map((shift) => (
                  <SelectItem key={shift} value={shift}>
                    {shift}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => addMember.mutate()} disabled={addMember.isPending}>
            <Plus className="mr-1 size-4" /> Incluir
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {SHIFT_OPTIONS.map((shift) => {
            const team = memberList.filter((member) => memberShiftOn(member, rotationList, todayISO()) === shift);
            return (
              <div key={shift} className="rounded-xl border border-border/70 bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold">{isDiarista(shift) ? "Diaristas" : shift}</span>
                  <Badge variant="secondary">{team.length}</Badge>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {team.length === 0 ? <li className="text-muted-foreground">Sem colaboradores.</li> : null}
                  {team.map((member) => (
                    <li key={member.id} className="flex items-start justify-between gap-2">
                      <span>
                        {member.name}
                        {member.job_title ? (
                          <span className="block text-xs text-muted-foreground">{member.job_title}</span>
                        ) : null}
                        {extended && (member.council || member.registry_number || member.work_hours) ? (
                          <span className="block text-xs text-muted-foreground">
                            {[
                              member.council ? `Conselho ${member.council}` : null,
                              member.registry_number ? `Matrícula ${member.registry_number}` : null,
                              member.work_hours,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => removeMember.mutate(member.id)}
                        aria-label={`Remover ${member.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Repeat className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Rotatividade de colaborador</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Programe a mudança de plantão a partir de {MIN_ROTATION_DAYS} dias. A troca entra em vigor
          automaticamente na data prevista.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_140px_auto] sm:items-end">
          <div>
            <Label>Colaborador</Label>
            <Select value={rotMember} onValueChange={setRotMember}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {memberList.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({memberShiftOn(member, rotationList, todayISO())})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Novo plantão</Label>
            <Select value={rotShift} onValueChange={(value) => setRotShift(value as Shift)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_OPTIONS.map((shift) => (
                  <SelectItem key={shift} value={shift}>
                    {shift}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`dias-${sector}`}>Em quantos dias</Label>
            <Input
              id={`dias-${sector}`}
              type="number"
              min={MIN_ROTATION_DAYS}
              value={rotDays}
              onChange={(event) => setRotDays(event.target.value)}
            />
          </div>
          <Button onClick={() => addRotation.mutate()} disabled={addRotation.isPending}>
            <Plus className="mr-1 size-4" /> Programar
          </Button>
        </div>

        <ul className="mt-5 space-y-2 text-sm">
          {rotationList.length === 0 ? (
            <li className="text-muted-foreground">Nenhuma rotatividade programada.</li>
          ) : null}
          {rotationList.map((rotation) => {
            const member = memberList.find((item) => item.id === rotation.member_id);
            const remaining = daysFromToday(rotation.effective_date);
            return (
              <li
                key={rotation.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
              >
                <span>
                  <strong>{member?.name ?? "Colaborador"}</strong> passa para o plantão{" "}
                  <strong>{rotation.to_shift}</strong> em {formatDateBR(rotation.effective_date)}
                  <span className="block text-xs text-muted-foreground">
                    {remaining > 0 ? `Faltam ${remaining} dias` : "Já em vigor"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeRotation.mutate(rotation.id)}
                >
                  <Trash2 className="mr-1 size-4" /> Cancelar
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Palmtree className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Férias</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe quando o colaborador entra e retorna das férias e quem vai cobrir o período. Os dias de
          férias saem da escala do colaborador e passam para o profissional da cobertura.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_150px_150px_1fr_1fr_auto] xl:items-end">
          <div>
            <Label>Colaborador</Label>
            <Select value={vacMember} onValueChange={setVacMember}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {memberList.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({memberShiftOn(member, rotationList, todayISO())})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`vac-inicio-${sector}`}>Entra em férias</Label>
            <Input
              id={`vac-inicio-${sector}`}
              type="date"
              value={vacStart}
              onChange={(event) => setVacStart(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`vac-fim-${sector}`}>Retorna das férias</Label>
            <Input
              id={`vac-fim-${sector}`}
              type="date"
              value={vacEnd}
              onChange={(event) => setVacEnd(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`vac-cover-${sector}`}>Profissional que cobre</Label>
            <Input
              id={`vac-cover-${sector}`}
              value={vacCover}
              onChange={(event) => setVacCover(event.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <Label htmlFor={`vac-cover-job-${sector}`}>Profissão de quem cobre</Label>
            <Input
              id={`vac-cover-job-${sector}`}
              value={vacCoverJob}
              onChange={(event) => setVacCoverJob(event.target.value)}
              placeholder="Ex.: Técnico de Enfermagem"
            />
          </div>
          <Button onClick={() => addVacation.mutate()} disabled={addVacation.isPending}>
            <Plus className="mr-1 size-4" /> Registrar
          </Button>
        </div>

        <ul className="mt-5 space-y-2 text-sm">
          {vacationList.length === 0 ? (
            <li className="text-muted-foreground">Nenhuma férias registrada.</li>
          ) : null}
          {vacationList.map((vacation) => {
            const member = memberList.find((item) => item.id === vacation.member_id);
            return (
              <li
                key={vacation.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
              >
                <span>
                  <strong>{member?.name ?? "Colaborador"}</strong> em férias de{" "}
                  {formatDateBR(vacation.start_date)} a {formatDateBR(vacation.end_date)}
                  <span className="block text-xs text-muted-foreground">
                    Cobertura: {vacation.cover_name}
                    {vacation.cover_job_title ? ` — ${vacation.cover_job_title}` : ""}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeVacation.mutate(vacation.id)}
                >
                  <Trash2 className="mr-1 size-4" /> Remover
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="font-display text-lg font-semibold">
              {MONTH_LABELS[month]} de {year}
            </h2>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button onClick={download} disabled={downloading || memberList.length === 0}>
            {downloading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <FileDown className="mr-1 size-4" />}
            Baixar escala (PDF)
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 min-w-44 bg-muted/90 px-3 py-2 text-left font-semibold">
                  Colaborador
                </th>
                <th className="min-w-28 px-2 py-2 font-semibold">Profissão</th>
                {extended ? (
                  <>
                    <th className="min-w-24 px-2 py-2 font-semibold">Conselho</th>
                    <th className="min-w-20 px-2 py-2 font-semibold">Matrícula</th>
                    <th className="min-w-24 px-2 py-2 font-semibold">Horário</th>
                  </>
                ) : null}
                <th className="px-2 py-2 font-semibold">Plantão</th>
                {days.map((date) => {
                  const headHoliday = holidayName(toISODate(date));
                  return (
                    <th
                      key={date.getDate()}
                      className={`w-8 px-1 py-1 text-center font-semibold ${
                        headHoliday ? "bg-amber-200/70 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100" : ""
                      }`}
                      title={headHoliday ? `Feriado: ${headHoliday}` : undefined}
                    >
                      <span className="block">{date.getDate()}</span>
                      <span
                        className={`block text-[10px] font-normal ${
                          headHoliday ? "font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {WEEKDAY_LABELS[date.getDay()]}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {memberList.length === 0 ? (
                <tr>
                  <td
                    colSpan={days.length + (extended ? 6 : 3)}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Inclua os colaboradores acima para montar a escala.
                  </td>
                </tr>
              ) : null}
              {memberList.flatMap((member) => {
                const firstDayShift = memberShiftOn(member, rotationList, toISODate(days[0]!));
                const memberVacations = vacationList.filter(
                  (item) => item.member_id === member.id && vacationOverlapsMonth(item, year, month),
                );
                return [
                  <tr key={member.id} className="border-t border-border/60">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">
                      {member.name}
                    </td>
                    <td className="px-2 py-2 text-center text-muted-foreground">{member.job_title ?? "—"}</td>
                    {extended ? (
                      <>
                        <td className="px-2 py-2 text-center text-muted-foreground">{member.council ?? "—"}</td>
                        <td className="px-2 py-2 text-center text-muted-foreground">
                          {member.registry_number ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-center text-muted-foreground">{member.work_hours ?? "—"}</td>
                      </>
                    ) : null}
                    <td className="px-2 py-2 text-center font-semibold">
                      {isDiarista(firstDayShift) ? "Diarista" : firstDayShift}
                    </td>
                    {days.map((date) => {
                      const dayISO = toISODate(date);
                      const shift = memberShiftOn(member, rotationList, dayISO);
                      const vacation = vacationOn(member.id, vacationList, dayISO);
                      const medicalLeave = medicalLeaveOn(member, medicalLeaveList, dayISO);
                      const works = !vacation && !medicalLeave && isWorkDay(shift, anchor, dayISO);
                      const diarista = isDiarista(shift);
                      const holiday = holidayName(dayISO);
                      return (
                        <td
                          key={dayISO}
                          className={`border-l border-border/40 px-1 py-2 text-center ${
                            medicalLeave
                              ? "bg-destructive/15 font-semibold text-destructive"
                              : vacation
                              ? "bg-muted font-semibold text-muted-foreground"
                              : works
                                ? "bg-gradient-brand font-semibold text-primary-foreground"
                                : "text-muted-foreground"
                          }`}
                          title={
                            medicalLeave
                              ? `${member.name} em afastamento médico${medicalLeave.note ? ` — ${medicalLeave.note}` : ""}`
                              : vacation
                              ? `${member.name} em férias — cobertura: ${vacation.cover_name}${
                                  vacation.cover_job_title ? ` (${vacation.cover_job_title})` : ""
                                }`
                              : works
                                ? `${member.name} — ${diarista ? "diarista" : `plantão ${shift}`} em ${formatDateBR(dayISO)}`
                                : diarista && holiday
                                  ? `${holiday} — diarista não trabalha`
                                  : undefined
                          }
                        >
                          {medicalLeave ? "AFT" : vacation ? "FÉR" : works ? (diarista ? "T" : "24h") : "—"}
                        </td>
                      );
                    })}
                  </tr>,
                  ...memberVacations.map((vacation) => (
                    <tr key={vacation.id} className="border-t border-border/60 bg-background/40">
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-[11px] italic">
                        Cobertura de férias: {vacation.cover_name}
                        <span className="block text-[10px] not-italic text-muted-foreground">
                          {formatDateBR(vacation.start_date)} a {formatDateBR(vacation.end_date)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center text-muted-foreground">
                        {vacation.cover_job_title ?? "—"}
                      </td>
                      {extended ? (
                        <>
                          <td className="px-2 py-2 text-center text-muted-foreground">—</td>
                          <td className="px-2 py-2 text-center text-muted-foreground">—</td>
                          <td className="px-2 py-2 text-center text-muted-foreground">—</td>
                        </>
                      ) : null}
                      <td className="px-2 py-2 text-center font-semibold">
                        {isDiarista(firstDayShift) ? "Diarista" : firstDayShift}
                      </td>
                      {days.map((date) => {
                        const dayISO = toISODate(date);
                        const shift = memberShiftOn(member, rotationList, dayISO);
                        const inRange = vacation.start_date <= dayISO && dayISO <= vacation.end_date;
                        const works = inRange && isWorkDay(shift, anchor, dayISO);
                        return (
                          <td
                            key={dayISO}
                            className={`border-l border-border/40 px-1 py-2 text-center ${
                              works ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {works ? (isDiarista(shift) ? "T" : "24h") : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Legenda:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-gradient-brand" /> Dia de trabalho (24h / T)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-muted ring-1 ring-border" /> Férias (FÉR)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-destructive/40 ring-1 ring-destructive/60" /> Afastamento médico (AFT)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-amber-200 ring-1 ring-amber-500 dark:bg-amber-400/40" /> Feriado (Angra
            dos Reis / RJ / nacional)
          </span>
        </div>
        {monthHolidays.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Feriados do mês:</span>{" "}
            {monthHolidays.map((item) => `${formatDateBR(item.dayISO)} — ${item.name}`).join(" · ")}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Plantões SD1 a SD4 marcam 24h seguidas de 72 horas de descanso; diaristas (marcados com T) trabalham de
          segunda a sexta, sem fins de semana nem feriados. "FÉR" indica férias, e a linha logo abaixo mostra o
          profissional que cobre o período. "AFT" indica afastamento médico.
        </p>
      </section>
    </div>
  );
}
