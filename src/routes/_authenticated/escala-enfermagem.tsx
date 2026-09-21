import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { WorkScheduleBoard } from "@/components/WorkScheduleBoard";

export const Route = createFileRoute("/_authenticated/escala-enfermagem")({
  head: () => ({
    meta: [
      { title: "Escala de Enfermagem — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Escala de enfermagem 24x72 em planilha, com todos os dias do mês, plantões SD1 a SD4, diaristas e rotatividade programada.",
      },
      { property: "og:title", content: "Escala de Enfermagem — Sistema Interno ILPI" },
      {
        property: "og:description",
        content: "Planilha da escala de enfermagem com os dias de plantão destacados e download em Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EscalaEnfermagemPage,
});

function EscalaEnfermagemPage() {
  return (
    <WorkScheduleBoard
      sector="ENFERMAGEM"
      tabKey="escala_enfermagem"
      eyebrow="Escala"
      title="Escala de Enfermagem 24x72"
      description="Planilha da equipe de enfermagem com todos os dias do mês. Cada plantão trabalha 24 horas e descansa 72 horas, seguindo o ciclo SD1 → SD2 → SD3 → SD4, com diaristas de segunda a sexta. Preencha uma vez: a escala se mantém até uma nova alteração."
      excelTitle="ESCALA DE ENFERMAGEM 24x72"
      fileSlug="escala-enfermagem"
      icon={<Stethoscope className="size-5" />}
    />
  );
}
