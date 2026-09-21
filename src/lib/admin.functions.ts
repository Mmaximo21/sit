import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usuário deve ter ao menos 3 caracteres")
  .max(30)
  .regex(/^[a-z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline");

const passwordSchema = z.string().min(6, "Senha deve ter ao menos 6 caracteres").max(72);

const DOMAIN = "aga-ilpi.com";
const email = (username: string) => `${username}@${DOMAIN}`;

type TypedClient = SupabaseClient<Database>;

async function isMaster(supabase: TypedClient, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "master")
    .maybeSingle();
  return !!data;
}

/** Contas com a especialidade "Coordenação" (papel coordenacao). */
async function isCoordenacao(supabase: TypedClient, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "coordenacao" as never)
    .maybeSingle();
  return !!data;
}

/** Master ou Coordenação: gestão de acessos e senhas (sem títulos de Master nem exclusões). */
async function assertUserManager(supabase: TypedClient, userId: string) {
  if (await isMaster(supabase, userId)) return;
  if (await isCoordenacao(supabase, userId)) return;
  throw new Error("Você não tem permissão para gerenciar usuários.");
}

async function assertMaster(supabase: TypedClient, userId: string) {
  if (!(await isMaster(supabase, userId)))
    throw new Error("Apenas o usuário master pode executar esta ação.");
}

/** Master, ou coordenador com a especialidade do usuário-alvo no seu escopo. */
async function assertCanManageUser(supabase: TypedClient, userId: string, targetUserId: string) {
  if (await isMaster(supabase, userId)) return;
  if (await isCoordenacao(supabase, userId)) return;

  const { data: scopes } = await supabase.from("coordinator_scopes").select("specialty").eq("user_id", userId);
  if (!scopes || scopes.length === 0) throw new Error("Você não tem permissão para esta ação.");

  const { data: target } = await supabase.from("profiles").select("specialty").eq("id", targetUserId).maybeSingle();
  const targetSpecialty = target?.specialty ?? null;
  const coversAll = scopes.some((s) => s.specialty === null);
  if (coversAll ? !targetSpecialty : !targetSpecialty || !scopes.some((s) => s.specialty === targetSpecialty))
    throw new Error("Este usuário não pertence às especialidades sob sua coordenação.");
}


/** One-time setup: creates the master account when none exists yet. */
export const masterExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "master");
  return { exists: (count ?? 0) > 0 };
});

export const createMasterAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string; fullName: string }) =>
    z
      .object({
        username: usernameSchema,
        password: passwordSchema,
        fullName: z.string().trim().min(2).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "master");
    if ((count ?? 0) > 0) throw new Error("O usuário master já foi criado.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: email(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o master.");

    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username: data.username,
      full_name: data.fullName,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "master" });
    return { ok: true as const };
  });

export const createProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      username: string;
      password: string;
      fullName: string;
      specialty: string;
      registry?: string;
    }) =>
      z
        .object({
          username: usernameSchema,
          password: passwordSchema,
          fullName: z.string().trim().min(2).max(120),
          specialty: z.string().trim().min(2).max(60),
          registry: z.string().trim().max(60).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertUserManager(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: email(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o usuário.");

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username: data.username,
      full_name: data.fullName,
      specialty: data.specialty,
      professional_registry: data.registry ?? null,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }
    const role = data.specialty === "Coordenação" ? ("coordenacao" as never) : "profissional";
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role });
    return { ok: true as const, id: created.user.id };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) =>
    z.object({ userId: z.string().uuid(), password: passwordSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageUser(context.supabase, context.userId, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertMaster(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta master.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* --------------------------- Contas administradoras --------------------------- */

/** Contas protegidas: não podem ganhar nem perder o título de Administrador. */
const PROTECTED_NAMES = ["matheus", "vanessa"];

const isProtectedProfile = (fullName: string | null | undefined, username: string | null | undefined) => {
  const name = (fullName ?? "").trim().toLowerCase();
  const login = (username ?? "").trim().toLowerCase();
  return PROTECTED_NAMES.some((p) => name === p || name.startsWith(`${p} `) || login === p) ||
    ["root", "direcao"].includes(login);
};

/** Cria uma nova conta com título de Administrador (master). */
export const createMasterUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string; password: string; fullName: string }) =>
    z
      .object({ username: usernameSchema, password: passwordSchema, fullName: z.string().trim().min(2).max(120) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMaster(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: email(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar a conta.");

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username: data.username,
      full_name: data.fullName,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "master" });
    return { ok: true as const, id: created.user.id };
  });

/** Concede ou revoga o título de Administrador de uma conta existente. */
export const setMasterRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; master: boolean }) =>
    z.object({ userId: z.string().uuid(), master: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMaster(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("full_name, username")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("Conta não encontrada.");
    if (isProtectedProfile(target.full_name, target.username))
      throw new Error("As contas de Matheus e Vanessa são protegidas e não podem ser alteradas.");
    if (data.userId === context.userId && !data.master)
      throw new Error("Você não pode revogar o seu próprio título de Administrador.");

    if (data.master) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "master" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "master");
      if (error) throw new Error(error.message);
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.userId);
      if ((count ?? 0) === 0)
        await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "profissional" });
    }
    return { ok: true as const };
  });
