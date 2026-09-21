import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarResidentes from "./tools/listar-residentes";
import avaliacoesDoResidente from "./tools/avaliacoes-do-residente";
import censoDeEnfermagem from "./tools/censo-de-enfermagem";
import relatoriosDePlantao from "./tools/relatorios-de-plantao";
import calcularNews from "./tools/calcular-news";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "sistema-interno-ilpi",
  title: "Sistema Interno — I.L.P.I",
  version: "0.1.0",
  instructions:
    "Ferramentas do Sistema Interno da I.L.P.I Luiza Olindina da Silva Alves. Use listar_residentes para localizar residentes, avaliacoes_do_residente para ver avaliações e PIA, censo_de_enfermagem para o censo diário, relatorios_de_plantao para os plantões e calcular_news para a escala NEWS 2. Os dados visíveis respeitam as permissões do usuário conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarResidentes, avaliacoesDoResidente, censoDeEnfermagem, relatoriosDePlantao, calcularNews],
});
