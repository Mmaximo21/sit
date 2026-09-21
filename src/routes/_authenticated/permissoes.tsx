import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { TabPermissionsPanel } from "@/components/TabPermissionsPanel";
import { useAuth } from "@/hooks/useAuth";
import { canAccessTab } from "@/lib/tabs";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões de abas — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Defina, conta por conta, quais abas do Sistema Interno cada profissional pode acessar no menu.",
      },
      { property: "og:title", content: "Permissões de abas — Sistema Interno ILPI" },
      {
        property: "og:description",
        content: "Libere ou revogue o acesso de cada conta às abas do menu do Sistema Interno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PermissionsPage,
});

function PermissionsPage() {
  const { data: session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </>
    );
  }

  if (!canAccessTab(session, "permissoes")) {
    return (
      <>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente contas autorizadas podem gerenciar as permissões de abas.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-primary">
          <KeyRound className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Permissões</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Permissões de abas</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Escolha, conta por conta, quais abas do menu ficam disponíveis. A própria aba “Permissões de abas”
          pode ser liberada para outras contas, sem precisar torná-las Administrador.
        </p>
      </header>

      <TabPermissionsPanel />
    </>
  );
}
