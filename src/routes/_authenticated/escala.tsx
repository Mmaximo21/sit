import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { WorkScheduleBoard } from "@/components/WorkScheduleBoard";

export const Route = createFileRoute("/_authenticated/escala")({
  head: () => ({
    meta: [
      { title: "Escala de Trabalho — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Escala de trabalho 24x72 em planilha, com todos os dias do mês, plantões SD1 a SD4 e rotatividade programada de colaboradores.",
      },
      { property: "og:title", content: "Escala de Trabalho — Sistema Interno ILPI" },
      {
        property: "og:description",
        content: "Planilha da escala 24x72 com os dias de plantão destacados e download em Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EscalaPage,
});

function EscalaPage() {
  return (
    <WorkScheduleBoard
      sector="TRABALHO"
      tabKey="escala"
      eyebrow="Escala"
      title="Escala de Trabalho 24x72"
      description="Planilha com todos os dias do mês. Cada plantão trabalha 24 horas e descansa 72 horas, seguindo o ciclo SD1 → SD2 → SD3 → SD4. Preencha uma vez: a escala se mantém até uma nova alteração."
      excelTitle="ESCALA DE TRABALHO 24x72"
      fileSlug="escala-trabalho"
      icon={<CalendarDays className="size-5" />}
    />
  );
}
