import { canAccessCensus, canAccessMenus, type SessionInfo } from "@/hooks/useAuth";

export type TabKey =
  | "painel"
  | "pia"
  | "exames"
  | "cardapios"
  | "censo"
  | "news"
  | "plantao"
  | "saidas"
  | "usuarios"
  | "periodos"
  | "permissoes"
  | "chat"
  | "escala"
  | "escala_enfermagem"
  | "escala_administrativa"
  | "escala_tecnica"
  | "avisos"
  | "admin";


export type TabDef = {
  key: TabKey;
  label: string;
  to: string;
  /** Regra padrão do sistema, usada quando não há permissão personalizada. */
  defaultAccess: (session: SessionInfo) => boolean;
};

/** Supervisor Administrativo só acessa a aba Relatório de Plantão. */
function isShiftOnly(session: SessionInfo) {
  return (
    session.specialty === "Supervisor Administrativo" &&
    !session.isMaster &&
    !session.isCoordenacao &&
    !session.isCoordinator
  );
}

export const TABS: TabDef[] = [
  { key: "painel", label: "Avaliações", to: "/painel", defaultAccess: (s) => !isShiftOnly(s) },
  { key: "pia", label: "PIA", to: "/pia", defaultAccess: (s) => !isShiftOnly(s) },
  { key: "exames", label: "Exames", to: "/exames", defaultAccess: (s) => !isShiftOnly(s) },
  {
    key: "cardapios",
    label: "Cardápios",
    to: "/cardapios",
    defaultAccess: (s) => !isShiftOnly(s) && canAccessMenus(s),
  },
  {
    key: "censo",
    label: "Censo de Enfermagem",
    to: "/censo",
    defaultAccess: (s) => !isShiftOnly(s) && canAccessCensus(s),
  },
  {
    key: "news",
    label: "Escala NEWS",
    to: "/news",
    defaultAccess: (s) => !isShiftOnly(s) && canAccessCensus(s),
  },
  { key: "plantao", label: "Relatório de Plantão", to: "/plantao", defaultAccess: () => true },
  { key: "saidas", label: "Saídas", to: "/saidas", defaultAccess: (s) => s.isMaster },
  {
    key: "usuarios",
    label: "Usuários",
    to: "/usuarios",
    defaultAccess: (s) => !isShiftOnly(s) && (s.isMaster || s.isCoordenacao || s.isCoordinator),
  },
  { key: "periodos", label: "Prazos", to: "/periodos", defaultAccess: (s) => s.isMaster },
  {
    key: "permissoes",
    label: "Permissões de abas",
    to: "/permissoes",
    defaultAccess: (s) => s.isMaster,
  },
  { key: "chat", label: "Lumi", to: "/chat", defaultAccess: () => true },
  {
    key: "escala",
    label: "Escala de Trabalho",
    to: "/escala",
    defaultAccess: (s) => s.isMaster,
  },
  {
    key: "escala_enfermagem",
    label: "Escala de Enfermagem",
    to: "/escala-enfermagem",
    defaultAccess: (s) => s.isMaster,
  },
  {
    key: "escala_administrativa",
    label: "Escala Administrativa",
    to: "/escala-administrativa",
    defaultAccess: (s) => s.isMaster,
  },
  {
    key: "escala_tecnica",
    label: "Escala Técnica",
    to: "/escala-tecnica",
    defaultAccess: (s) => s.isMaster,
  },
  { key: "avisos", label: "Avisos", to: "/avisos", defaultAccess: (s) => s.isMaster },

  { key: "admin", label: "Administração", to: "/admin", defaultAccess: (s) => s.isMaster },
];

const TAB_BY_KEY = new Map(TABS.map((t) => [t.key, t]));

/**
 * Acesso a uma aba do menu: permissão personalizada definida pelo Administrador
 * tem prioridade sobre a regra padrão da especialidade.
 */
export function canAccessTab(session: SessionInfo | null | undefined, key: TabKey) {
  if (!session) return false;
  const override = session.tabOverrides?.[key];
  if (typeof override === "boolean") return override;
  return TAB_BY_KEY.get(key)?.defaultAccess(session) ?? false;
}

export function tabLabel(key: TabKey) {
  return TAB_BY_KEY.get(key)?.label ?? key;
}
