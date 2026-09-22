import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { WorkScheduleBoard } from "@/components/WorkScheduleBoard";

export const Route = createFileRoute("/_authenticated/escala-tecnica")({
  head: () => ({
    meta: [
      { title: "Escala Técnica — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Escala técnica 24x72 em planilha, com todos os dias do mês, plantões SD1 a SD4, diaristas e rotatividade programada.",
      },
      { property: "og:title", content: "Escala Técnica — Sistema Interno ILPI" },
      {
        property: "og:description",
        content:
          "Planilha da escala técnica com os dias de plantão destacados e download em Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EscalaTecnicaPage,
});

function EscalaTecnicaPage() {
  return (
    <WorkScheduleBoard
      sector="TECNICA"
      tabKey="escala_tecnica"
      eyebrow="Escala"
      title="Escala Técnica 24x72"
      description="Planilha da equipe técnica com todos os dias do mês. Cada plantão trabalha 24 horas e descansa 72 horas, seguindo o ciclo SD1 → SD2 → SD3 → SD4, com diaristas de segunda a sexta. Preencha uma vez: a escala se mantém até uma nova alteração."
      excelTitle="ESCALA TÉCNICA 24x72"
      fileSlug="escala-tecnica"
      icon={<Activity className="size-5" />}
    />
  );
}
