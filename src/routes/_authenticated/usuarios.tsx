import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canSupervise, useAuth } from "@/hooks/useAuth";
import { useSpecialtyNames } from "@/lib/settings";
import { createProfessional, deleteProfessional, resetUserPassword } from "@/lib/admin.functions";
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
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — AGA ILPI" },
      {
        name: "description",
        content: "Cadastro de profissionais por especialidade e redefinição de senhas.",
      },
      { property: "og:title", content: "Usuários — AGA ILPI" },
      { property: "og:description", content: "Painel master de gestão de acessos." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { data: session } = useAuth();
  const specialtyNames = useSpecialtyNames();
  const queryClient = useQueryClient();
  const create = useServerFn(createProfessional);
  const reset = useServerFn(resetUserPassword);
  const del = useServerFn(deleteProfessional);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    specialty: "",
    registry: "",
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        isMaster: (roles ?? []).some((r) => r.user_id === p.id && r.role === "master"),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const fullName = form.fullName.trim();
      const username = form.username.trim().toLowerCase();
      if (fullName.length < 2) throw new Error("Informe o nome completo do profissional.");
      if (!/^[a-z0-9._-]{3,30}$/.test(username))
        throw new Error(
          "Login inválido: use 3 a 30 caracteres, apenas letras, números, ponto, hífen ou underline (sem espaços ou acentos).",
        );
      if (form.password.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
      if (!form.specialty) throw new Error("Selecione a especialidade.");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session)
        throw new Error("Sua sessão expirou. Saia e entre novamente para criar usuários.");

      return create({
        data: {
          fullName,
          username,
          password: form.password,
          specialty: form.specialty,
          ...(form.registry.trim() ? { registry: form.registry.trim() } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Usuário criado.");
      setForm({ fullName: "", username: "", password: "", specialty: "", registry: "" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      const raw = error instanceof Error ? error.message : String(error);
      let message = raw;
      if (/unauthorized|401|jwt|invalid claim/i.test(raw))
        message = "Sua sessão expirou. Saia e entre novamente para criar usuários.";
      else if (/already been registered|already exists|duplicate key/i.test(raw))
        message = "Já existe um usuário com esse login.";
      toast.error(message);
    },
  });

  const isCoordenacao = session?.isCoordenacao ?? false;
  const isMaster = (session?.isMaster ?? false) || isCoordenacao;
  const canDeleteUsers = session?.isMaster ?? false;
  const isCoordinator = (session?.isCoordinator ?? false) && !isMaster;

  if (session && !isMaster && !isCoordinator) {
    return <p className="text-muted-foreground">Área exclusiva da administração.</p>;
  }

  const visibleUsers = (users ?? []).filter((u) =>
    isMaster ? true : u.id !== session?.userId && !u.isMaster && canSupervise(session, u.specialty),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isCoordinator
            ? "Você pode redefinir a senha dos profissionais das especialidades sob sua coordenação."
            : "Cada profissional acessa somente o formulário da especialidade cadastrada aqui."}
        </p>
      </div>

      {isMaster ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Novo profissional</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome completo">
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Usuário (login)">
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ex: nutricao"
              />
            </Field>
            <Field label="Senha">
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mínimo 6 caracteres"
              />
            </Field>
            <Field label="Especialidade">
              <Select
                value={form.specialty}
                onValueChange={(v) => setForm({ ...form, specialty: v })}
              >
                <SelectTrigger>
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
            </Field>
            <Field label="Registro profissional (opcional)">
              <Input
                value={form.registry}
                onChange={(e) => setForm({ ...form, registry: e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                <UserPlus className="mr-2 size-4" /> Criar usuário
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                <td className="px-4 py-3">
                  {u.isMaster ? (
                    <Badge>Master</Badge>
                  ) : (
                    <span className="text-muted-foreground">{u.specialty}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const password = prompt(`Nova senha para ${u.username}:`);
                        if (!password) return;
                        try {
                          await reset({ data: { userId: u.id, password } });
                          toast.success("Senha redefinida.");
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Erro ao redefinir.",
                          );
                        }
                      }}
                    >
                      <KeyRound className="mr-1 size-4" /> Senha
                    </Button>
                    {canDeleteUsers && !u.isMaster ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!confirm(`Excluir o usuário ${u.username}?`)) return;
                          try {
                            await del({ data: { userId: u.id } });
                            toast.success("Usuário excluído.");
                            queryClient.invalidateQueries({ queryKey: ["users"] });
                          } catch (error) {
                            toast.error(
                              error instanceof Error ? error.message : "Erro ao excluir.",
                            );
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
