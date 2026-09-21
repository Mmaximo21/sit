import { createFileRoute } from "@tanstack/react-router";
import { BookOpenCheck, ShieldCheck } from "lucide-react";

import { ChatWorkspace } from "@/components/ai/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Central de Protocolos Clínicos — Sistema Interno I.L.P.I." },
      {
        name: "description",
        content:
          "Central de Protocolos Clínicos e Apoio Assistencial da I.L.P.I. Luiza Olindina da Silva Alves.",
      },
      { property: "og:title", content: "Central de Protocolos Clínicos — Sistema Interno I.L.P.I." },
      {
        property: "og:description",
        content: "Pesquisa de protocolos, escalas geriátricas e apoio à decisão multiprofissional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-primary">
          <BookOpenCheck className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Apoio Clínico & Diretrizes · Lumi
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <ShieldCheck className="size-3" /> Padrão ONA
          </span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Central de Protocolos Clínicos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Consulte protocolos assistenciais, escalas geriátricas validadas e boas práticas multiprofissionais.
          Cada setor dispõe de até 10 consultas diárias para assegurar o uso equilibrado e focado.
        </p>
      </header>
      <ChatWorkspace key={threadId} threadId={threadId} />
    </>
  );
}

