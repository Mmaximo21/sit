import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";

type OAuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Parâmetro authorization_id ausente.");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center bg-login-bg p-6 text-login-ink">
      <p className="max-w-md text-center text-sm">
        Não foi possível carregar este pedido de autorização:{" "}
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "o aplicativo";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um endereço de retorno.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-login-bg p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-login-card/55 via-login-teal-deep/35 to-login-field/45 p-8 text-login-ink shadow-2xl backdrop-blur-xl">
        <ShieldCheck className="mb-4 size-8 text-login-teal" />
        <h1 className="font-display text-lg font-medium">Conectar {clientName} à sua conta</h1>
        <p className="mt-3 text-sm text-login-ink/75">
          {clientName} poderá consultar os dados do Sistema Interno com as mesmas permissões da sua
          conta.
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-login-ink text-sm font-bold uppercase tracking-[0.18em] text-login-field-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Autorizar
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="h-11 flex-1 rounded-md border border-white/25 text-sm font-semibold uppercase tracking-[0.18em] text-login-ink/80 disabled:opacity-60"
          >
            Recusar
          </button>
        </div>
      </div>
    </main>
  );
}
