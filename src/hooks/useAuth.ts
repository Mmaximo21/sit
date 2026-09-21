import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionInfo = {
  userId: string;
  username: string;
  fullName: string;
  specialty: string | null;
  registry: string | null;
  isMaster: boolean;
  /** Especialidade "Coordenação": acesso amplo, sem exclusões, prazos ou títulos de Master. */
  isCoordenacao: boolean;
  isCoordinator: boolean;
  /** null = todas as especialidades */
  coordinatorScopes: string[] | null;
  /** Permissões de abas definidas manualmente pelo Administrador (chave da aba -> liberado). */
  tabOverrides: Record<string, boolean>;
};

/** Especialidade sob responsabilidade da conta (master vê tudo). */
export function canSupervise(session: SessionInfo | null | undefined, specialty: string | null | undefined) {
  if (!session) return false;
  if (session.isMaster || session.isCoordenacao) return true;
  if (!session.isCoordinator) return false;
  if (session.coordinatorScopes === null) return true;
  return !!specialty && session.coordinatorScopes.includes(specialty);
}

/** Cardápios: só Nutrição, contas master e a coordenação técnica com escopo de Nutrição. */
export function canAccessMenus(session: SessionInfo | null | undefined) {
  if (!session) return false;
  if (session.isMaster || session.isCoordenacao) return true;
  if (session.specialty === "Nutrição") return true;
  return Array.isArray(session.coordinatorScopes) && session.coordinatorScopes.includes("Nutrição");
}

/** Censo de Enfermagem: exclusivo de Enfermagem, Técnico de Enfermagem, Geriatria e contas de direção/coordenação. */
export function canAccessCensus(session: SessionInfo | null | undefined) {
  if (!session) return false;
  if (session.isMaster || session.isCoordenacao) return true;
  return (
    session.specialty === "Enfermagem" ||
    session.specialty === "Técnico de Enfermagem" ||
    session.specialty === "Geriatria"
  );
}

export function useAuth() {
  return useQuery<SessionInfo | null, Error, SessionInfo | null>({
    queryKey: ["session-info"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }, { data: scopes }, { data: tabPerms }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("coordinator_scopes").select("specialty").eq("user_id", user.id),
        supabase.from("user_tab_permissions").select("tab, allowed").eq("user_id", user.id),
      ]);

      const tabOverrides: Record<string, boolean> = {};
      for (const row of tabPerms ?? []) tabOverrides[row.tab] = row.allowed;

      const scopeRows = scopes ?? [];
      const isCoordinator = scopeRows.length > 0;
      const coordinatorScopes = scopeRows.some((s) => s.specialty === null)
        ? null
        : scopeRows.map((s) => s.specialty as string);

      return {
        userId: user.id,
        username: profile?.username ?? (user.email ?? "").split("@")[0] ?? "",
        fullName: profile?.full_name ?? "",
        specialty: profile?.specialty ?? null,
        registry: profile?.professional_registry ?? null,
        isMaster: (roles ?? []).some((r) => r.role === "master"),
        isCoordenacao: (roles ?? []).some((r) => (r.role as string) === "coordenacao"),
        isCoordinator,
        coordinatorScopes: isCoordinator ? coordinatorScopes : [],
        tabOverrides,
      };
    },
  });
}

