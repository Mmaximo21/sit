/** Escala de trabalho 24x72: um dia de plantão de 24 horas seguido de 72 horas de descanso. */
export const SHIFTS = ["SD1", "SD2", "SD3", "SD4"] as const;
/** Diaristas trabalham de segunda a sexta, sem fins de semana nem feriados. */
export const DIARISTA = "DIARISTA" as const;
export const SHIFT_OPTIONS = [...SHIFTS, DIARISTA] as const;
export type Shift = (typeof SHIFT_OPTIONS)[number];

export function isDiarista(shift: Shift) {
  return shift === DIARISTA;
}

/** Escalas independentes: geral (Escala de Trabalho) e da equipe de enfermagem. */
export const SCHEDULE_SECTORS = ["TRABALHO", "ENFERMAGEM", "ADMINISTRATIVA", "TECNICA"] as const;
export type ScheduleSector = (typeof SCHEDULE_SECTORS)[number];

export type ShiftMember = {
  id: string;
  name: string;
  job_title: string | null;
  /** Conselho profissional (escalas Técnica e Administrativa). */
  council?: string | null;
  registry_number?: string | null;
  work_hours?: string | null;
  shift: Shift;
  sector?: ScheduleSector;
  created_at: string;
  updated_at: string;
};

export type ShiftRotation = {
  id: string;
  member_id: string;
  to_shift: Shift;
  effective_date: string;
  note: string | null;
  created_at: string;
};

/** Período de férias do colaborador e o profissional que cobre a ausência. */
export type ShiftVacation = {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  cover_name: string;
  cover_job_title: string | null;
  note: string | null;
  created_at: string;
};

/** Período em que o colaborador está afastado por motivo médico. */
export type ShiftMedicalLeave = {
  id: string;
  /** Vínculo opcional com um colaborador cadastrado (registros antigos). */
  member_id: string | null;
  /** Nome digitado do colaborador afastado. */
  member_name: string | null;
  /** Escala em que o afastamento foi registrado. */
  sector: string | null;
  start_date: string;
  /** Data de retorno — opcional; null = afastamento em aberto. */
  end_date: string | null;
  note: string | null;
  created_at: string;
};

/** Normaliza nomes para comparação (sem acentos, minúsculo, espaços simples). */
export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Nome exibido para um afastamento médico. */
export function medicalLeaveName(
  leave: ShiftMedicalLeave,
  members: { id: string; name: string }[] = [],
) {
  if (leave.member_name?.trim()) return leave.member_name.trim();
  return members.find((item) => item.id === leave.member_id)?.name ?? "Colaborador";
}

export type ScheduleSettings = {
  anchor_date: string;
  notes: string | null;
  updated_at: string;
};

/** A rotatividade só pode ser programada a partir de 30 dias. */
export const MIN_ROTATION_DAYS = 30;

export const CYCLE_LENGTH = SHIFTS.length;

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function parseISODate(value: string) {
  const [y, m, d] = value.split("-").map((part) => Number(part));
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDaysISO(value: string, days: number) {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysBetween(fromISO: string, toISOValue: string) {
  const diff = parseISODate(toISOValue).getTime() - parseISODate(fromISO).getTime();
  return Math.round(diff / 86_400_000);
}

export function formatDateBR(value: string) {
  const [y, m, d] = value.split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

export function monthDates(year: number, month: number) {
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) => new Date(year, month, index + 1));
}

/** Plantão que trabalha em determinado dia, a partir da data de referência da SD1. */
export function shiftOnDate(anchorDate: string, dayISO: string): Shift {
  const diff = daysBetween(anchorDate, dayISO);
  const index = ((diff % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  return SHIFTS[index]!;
}

function easterISO(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISODate(new Date(year, month - 1, day));
}

/**
 * Feriados usados na escala dos diaristas: nacionais, estaduais do Rio de Janeiro
 * e municipais de Angra dos Reis (aniversário da cidade e padroeira).
 */
export function holidaysOfYear(year: number): Record<string, string> {
  const easter = easterISO(year);
  const fixed: Record<string, string> = {
    [`${year}-01-01`]: "Confraternização Universal",
    [`${year}-01-06`]: "Aniversário de Angra dos Reis",
    [`${year}-04-21`]: "Tiradentes",
    [`${year}-04-23`]: "São Jorge (RJ)",
    [`${year}-05-01`]: "Dia do Trabalho",
    [`${year}-09-07`]: "Independência do Brasil",
    [`${year}-10-12`]: "Nossa Senhora Aparecida",
    [`${year}-11-02`]: "Finados",
    [`${year}-11-15`]: "Proclamação da República",
    [`${year}-11-20`]: "Consciência Negra",
    [`${year}-12-08`]: "Nossa Senhora da Conceição (padroeira de Angra dos Reis)",
    [`${year}-12-25`]: "Natal",
  };
  fixed[addDaysISO(easter, -48)] = "Carnaval";
  fixed[addDaysISO(easter, -47)] = "Carnaval";
  fixed[addDaysISO(easter, -2)] = "Sexta-feira Santa";
  fixed[addDaysISO(easter, 60)] = "Corpus Christi";
  return fixed;
}

export function holidayName(dayISO: string) {
  const year = Number(dayISO.slice(0, 4));
  return holidaysOfYear(year)[dayISO] ?? null;
}

export function isHoliday(dayISO: string) {
  return holidayName(dayISO) !== null;
}

export function isWeekend(dayISO: string) {
  const weekday = parseISODate(dayISO).getDay();
  return weekday === 0 || weekday === 6;
}

export function isWorkDay(shift: Shift, anchorDate: string, dayISO: string) {
  if (isDiarista(shift)) return !isWeekend(dayISO) && !isHoliday(dayISO);
  return shiftOnDate(anchorDate, dayISO) === shift;
}

/** Plantão do colaborador na data informada, considerando as rotatividades já em vigor. */
export function memberShiftOn(
  member: ShiftMember,
  rotations: ShiftRotation[],
  dayISO: string,
): Shift {
  const applied = rotations
    .filter((rotation) => rotation.member_id === member.id && rotation.effective_date <= dayISO)
    .sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  return applied.at(-1)?.to_shift ?? member.shift;
}

export function todayISO() {
  return toISODate(new Date());
}

/** Férias do colaborador em vigor no dia informado (ou null). */
export function vacationOn(
  memberId: string,
  vacations: ShiftVacation[],
  dayISO: string,
): ShiftVacation | null {
  return (
    vacations.find(
      (item) => item.member_id === memberId && item.start_date <= dayISO && dayISO <= item.end_date,
    ) ?? null
  );
}

export function vacationOverlapsMonth(vacation: ShiftVacation, year: number, month: number) {
  const first = toISODate(new Date(year, month, 1));
  const last = toISODate(new Date(year, month + 1, 0));
  return vacation.start_date <= last && vacation.end_date >= first;
}

export function medicalLeaveOn(
  member: { id: string; name: string },
  leaves: ShiftMedicalLeave[],
  dayISO: string,
): ShiftMedicalLeave | null {
  const target = normalizeName(member.name);
  return (
    leaves.find(
      (item) =>
        (item.member_id === member.id ||
          (!!item.member_name && normalizeName(item.member_name) === target)) &&
        item.start_date <= dayISO &&
        (item.end_date === null || dayISO <= item.end_date),
    ) ?? null
  );
}

export function medicalLeaveOverlapsMonth(leave: ShiftMedicalLeave, year: number, month: number) {
  const first = toISODate(new Date(year, month, 1));
  const last = toISODate(new Date(year, month + 1, 0));
  return leave.start_date <= last && (leave.end_date === null || leave.end_date >= first);
}

export function daysFromToday(dayISO: string) {
  return daysBetween(todayISO(), dayISO);
}

export function shiftWorkDaysInMonth(
  shift: Shift,
  anchorDate: string,
  year: number,
  month: number,
) {
  return monthDates(year, month).filter((date) => isWorkDay(shift, anchorDate, toISODate(date)))
    .length;
}
