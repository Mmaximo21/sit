import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TABS, canAccessTab, type TabKey } from "@/lib/tabs";
import type { SessionInfo } from "@/hooks/useAuth";
import { toast } from "sonner";

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

/* ------------------------- Permissões de abas por usuário ------------------------- */

type PermUser = {
  id: string;
  username: string;
  full_name: string;
  specialty: string | null;
  isMaster: boolean;
  isCoordenacao: boolean;
  isCoordinator: boolean;
  coordinatorScopes: string[] | null;
  overrides: Record<string, boolean>;
};

/** Sessão sintética para avaliar a regra padrão de cada aba do usuário-alvo. */
const asSession = (u: PermUser): SessionInfo => ({
  userId: u.id,
  username: u.username,
  fullName: u.full_name,
  specialty: u.specialty,
  registry: null,
  isMaster: u.isMaster,
  isCoordenacao: u.isCoordenacao,
  isCoordinator: u.isCoordinator,
  coordinatorScopes: u.isCoordinator ? u.coordinatorScopes : [],
  tabOverrides: {},
});

export function TabPermissionsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["tab-permissions"],
    queryFn: async (): Promise<PermUser[]> => {
      const [{ data: profiles }, { data: roles }, { data: scopes }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("id,username,full_name,specialty").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("coordinator_scopes").select("user_id, specialty"),
        supabase.from("user_tab_permissions").select("user_id, tab, allowed"),
      ]);
      return (profiles ?? []).map((p) => {
        const myScopes = (scopes ?? []).filter((s) => s.user_id === p.id);
        const overrides: Record<string, boolean> = {};
        for (const row of perms ?? []) if (row.user_id === p.id) overrides[row.tab] = row.allowed;
        return {
          id: p.id,
          username: p.username,
          full_name: p.full_name,
          specialty: p.specialty,
          isMaster: (roles ?? []).some((r) => r.user_id === p.id && r.role === "master"),
          isCoordenacao: (roles ?? []).some((r) => r.user_id === p.id && (r.role as string) === "coordenacao"),
          isCoordinator: myScopes.length > 0,
          coordinatorScopes: myScopes.some((s) => s.specialty === null)
            ? null
            : myScopes.map((s) => s.specialty as string),
          overrides,
        };
      });
    },
  });

  const setPermission = useMutation({
    mutationFn: async ({ userId, tab, allowed }: { userId: string; tab: TabKey; allowed: boolean }) => {
      const { error } = await supabase
        .from("user_tab_permissions")
        .upsert({ user_id: userId, tab, allowed }, { onConflict: "user_id,tab" });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      toast.success(v.allowed ? "Acesso liberado." : "Acesso revogado.");
      queryClient.invalidateQueries({ queryKey: ["tab-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["session-info"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPermission = useMutation({
    mutationFn: async ({ userId, tab }: { userId: string; tab: TabKey }) => {
      const { error } = await supabase
        .from("user_tab_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("tab", tab);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Permissão voltou ao padrão da especialidade.");
      queryClient.invalidateQueries({ queryKey: ["tab-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["session-info"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const list = (users ?? []).filter(
    (u) =>
      !term ||
      u.full_name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.specialty ?? "").toLowerCase().includes(term),
  );

  return (
    <Panel
      title="Permissões de abas"
      description="Libere ou revogue, usuário por usuário, o acesso a cada aba do menu. Sem personalização, vale a regra padrão da especialidade."
    >
      <div className="mb-4 max-w-sm">
        <Label htmlFor="perm-search">Buscar usuário</Label>
        <Input
          id="perm-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="nome, login ou especialidade"
          className="mt-1.5"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-4">
          {list.map((u) => {
            const target = asSession(u);
            return (
              <div key={u.id} className="rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{u.full_name || u.username}</p>
                  {u.isMaster ? <Badge>Administrador</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {[u.username, u.specialty].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {TABS.map((tab) => {
                    const override = u.overrides[tab.key];
                    const active = canAccessTab({ ...target, tabOverrides: u.overrides }, tab.key);
                    return (
                      <div
                        key={tab.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{tab.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {typeof override === "boolean" ? (
                              <button
                                type="button"
                                className="underline decoration-dotted hover:text-foreground"
                                onClick={() => resetPermission.mutate({ userId: u.id, tab: tab.key })}
                              >
                                personalizado · voltar ao padrão
                              </button>
                            ) : (
                              "padrão da especialidade"
                            )}
                          </p>
                        </div>
                        <Switch
                          checked={active}
                          disabled={setPermission.isPending || resetPermission.isPending}
                          onCheckedChange={(checked) =>
                            setPermission.mutate({ userId: u.id, tab: tab.key, allowed: checked })
                          }
                          aria-label={`${tab.label} para ${u.username}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
