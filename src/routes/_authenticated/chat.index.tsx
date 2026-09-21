import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpenCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createThread, listThreads } from "@/lib/ai-chat";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Central de Protocolos Clínicos — Sistema Interno I.L.P.I." },
      {
        name: "description",
        content:
          "Central de Protocolos e Apoio à Decisão Clínica da equipe multiprofissional da ILPI.",
      },
      { property: "og:title", content: "Central de Protocolos Clínicos — Sistema Interno I.L.P.I." },
      {
        property: "og:description",
        content: "Pesquise protocolos e diretrizes de geriatria com apoio da Lumi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const threads = await listThreads();
        const thread = threads[0] ?? (await createThread());
        navigate({ to: "/chat/$threadId", params: { threadId: thread.id }, replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível abrir a Central de Protocolos.");
      }
    })();
  }, [navigate]);

  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
      <BookOpenCheck className="mx-auto size-8 text-primary" />
      <h1 className="mt-3 font-display text-xl font-semibold">Acessando a Central de Protocolos…</h1>
      <p className="mt-1 text-sm text-muted-foreground">Carregando diretrizes e histórico assistencial.</p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => {
          started.current = false;
          navigate({ to: "/chat", replace: true });
        }}
      >
        Tentar novamente
      </Button>
    </div>
  );
}

