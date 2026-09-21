import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { WorkScheduleBoard } from "@/components/WorkScheduleBoard";

export const Route = createFileRoute("/_authenticated/escala-administrativa")({
  head: () => ({
    meta: [
      { title: "Escala Administrativa — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Escala administrativa 24x72 em planilha, com todos os dias do mês, plantões SD1 a SD4, diaristas e rotatividade programada.",
      },
      { property: "og:title", content: "Escala Administrativa — Sistema Interno ILPI" },
      {
        property: "og:description",
        content: "Planilha da escala administrativa com os dias de plantão destacados e download em Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EscalaAdministrativaPage,
});

function EscalaAdministrativaPage() {
  return (
    <WorkScheduleBoard
      sector="ADMINISTRATIVA"
      tabKey="escala_administrativa"
      eyebrow="Escala"
      title="Escala Administrativa 24x72"
      description="Planilha da equipe administrativa com todos os dias do mês. Cada plantão trabalha 24 horas e descansa 72 horas, seguindo o ciclo SD1 → SD2 → SD3 → SD4, com diaristas de segunda a sexta. Preencha uma vez: a escala se mantém até uma nova alteração."
      excelTitle="ESCALA ADMINISTRATIVA 24x72"
      fileSlug="escala-administrativa"
      icon={<ClipboardCheck className="size-5" />}
    />
  );
}
