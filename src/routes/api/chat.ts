import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { AI_CHAT_SYSTEM_PROMPT, resolveLumiChat } from "@/lib/ai-gateway.server";
import { checkAndIncrementSpecialtyChat } from "@/lib/chat-limits";
import { generateImagePng } from "@/lib/lumi-images.server";
import { computeNews, type NewsVitals } from "@/lib/news-score";

type ChatRequestBody = { messages?: unknown; threadId?: unknown };

const LUMI_BUCKET = "lumi-arquivos";

type UserClient = ReturnType<typeof createClient<Database>>;

function createUserClient(accessToken: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function ageFrom(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Reduz JSON grande para caber no contexto do modelo. */
function trim(value: unknown, max = 4000) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > max ? `${text.slice(0, max)}… (conteúdo truncado)` : text;
}

function slug(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "imagem"
  );
}

/** Traduz falhas do serviço de IA em mensagens claras para a equipe. */
function describeAiError(error: unknown) {
  const status =
    (error as { statusCode?: number; status?: number } | null)?.statusCode ??
    (error as { status?: number } | null)?.status;
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (status === 402 || /payment required/i.test(message)) {
    return "Os créditos de inteligência artificial da instituição acabaram, por isso a Lumi não consegue responder agora. Um administrador precisa adicionar créditos para reativar o assistente.";
  }
  if (status === 429) {
    return "A Lumi recebeu muitos pedidos ao mesmo tempo. Aguarde alguns segundos e envie a mensagem novamente.";
  }
  if (status === 401 || status === 403) {
    return "A Lumi está sem autorização para usar o serviço de inteligência artificial. Avise um administrador do sistema.";
  }
  if (status === 503 || /high demand|unavailable/i.test(message)) {
    return "O serviço de inteligência artificial está com muita procura neste momento. Envie a mensagem novamente em alguns instantes.";
  }
  if (status && status >= 500) {
    return "O serviço de inteligência artificial está instável neste momento. Tente novamente em alguns instantes.";
  }
  return message || "Não foi possível falar com a Lumi. Tente novamente.";
}

function buildTools(supabase: UserClient, userId: string, apiKey: string, useGemini: boolean) {
  return {
    gerar_imagem: tool({
      description:
        "Gera uma imagem a partir de uma descrição em texto (ilustrações, cartazes, esquemas educativos, materiais de orientação). A imagem fica disponível para visualizar e baixar no chat.",
      inputSchema: z.object({
        descricao: z
          .string()
          .describe("Descrição detalhada da imagem desejada, incluindo estilo, cores e textos."),
        nome: z
          .string()
          .optional()
          .describe("Nome curto do arquivo, sem extensão. Ex.: cartaz-hidratacao."),
      }),
      execute: async ({ descricao, nome }) => {
        try {
          const bytes = await generateImagePng(descricao, apiKey, useGemini);
          const fileName = `${slug(nome ?? descricao)}-${Date.now()}.png`;
          const path = `${userId}/${fileName}`;
          const { error } = await supabase.storage
            .from(LUMI_BUCKET)
            .upload(path, bytes, { contentType: "image/png", upsert: false });
          if (error) return { erro: `Não foi possível salvar a imagem: ${error.message}` };
          return {
            tipo: "imagem_gerada",
            arquivo: path,
            nome: fileName,
            descricao,
            observacao:
              "A imagem já aparece no chat com botão de download. Não repita a descrição em detalhes.",
          };
        } catch (error) {
          return { erro: error instanceof Error ? error.message : "Falha ao gerar a imagem." };
        }
      },
    }),

    buscar_residentes: tool({
      description:
        "Busca residentes cadastrados por parte do nome. Retorna nome completo, data de nascimento, idade e sexo.",
      inputSchema: z.object({
        nome: z.string().describe("Parte do nome do residente. Use vazio para listar todos."),
      }),
      execute: async ({ nome }) => {
        let query = supabase
          .from("residents")
          .select("id, full_name, birth_date, sex, active")
          .order("full_name")
          .limit(30);
        if (nome.trim()) query = query.ilike("full_name", `%${nome.trim()}%`);
        const { data, error } = await query;
        if (error) return { erro: error.message };
        return {
          total: data?.length ?? 0,
          residentes: (data ?? []).map((r) => ({
            id: r.id,
            nome: r.full_name,
            nascimento: r.birth_date,
            idade: ageFrom(r.birth_date),
            sexo: r.sex,
            ativo: r.active,
          })),
        };
      },
    }),

    avaliacoes_do_residente: tool({
      description:
        "Lista as avaliações mais recentes de um residente (opcionalmente de uma especialidade), com status, período e conteúdo preenchido.",
      inputSchema: z.object({
        nome: z.string().describe("Nome ou parte do nome do residente."),
        especialidade: z
          .string()
          .optional()
          .describe("Ex.: Enfermagem, Geriatria, Nutrição, Fisioterapia, Psicologia."),
        incluir_conteudo: z
          .boolean()
          .optional()
          .describe("Quando true, inclui os dados preenchidos da avaliação."),
      }),
      execute: async ({ nome, especialidade, incluir_conteudo }) => {
        let query = supabase
          .from("assessments")
          .select("id, resident_name, specialty, status, updated_at, closed_at, data")
          .ilike("resident_name", `%${nome.trim()}%`)
          .order("updated_at", { ascending: false })
          .limit(8);
        if (especialidade?.trim()) query = query.eq("specialty", especialidade.trim());
        const { data, error } = await query;
        if (error) return { erro: error.message };
        return {
          total: data?.length ?? 0,
          avaliacoes: (data ?? []).map((a) => ({
            id: a.id,
            residente: a.resident_name,
            especialidade: a.specialty,
            status: a.status,
            atualizado_em: a.updated_at,
            fechado_em: a.closed_at,
            ...(incluir_conteudo ? { conteudo: trim(a.data) } : {}),
          })),
        };
      },
    }),

    ultimo_censo: tool({
      description:
        "Retorna o censo de enfermagem mais recente disponível para este usuário (data, responsável e conteúdo resumido).",
      inputSchema: z.object({
        data: z.string().optional().describe("Data específica no formato AAAA-MM-DD."),
      }),
      execute: async ({ data: censusDate }) => {
        let query = supabase
          .from("nursing_census")
          .select("id, census_date, nurse_name, data, updated_at")
          .order("census_date", { ascending: false })
          .limit(1);
        if (censusDate?.trim()) query = query.eq("census_date", censusDate.trim());
        const { data, error } = await query;
        if (error) return { erro: error.message };
        const row = data?.[0];
        if (!row) return { encontrado: false };
        return {
          encontrado: true,
          data: row.census_date,
          responsavel: row.nurse_name,
          atualizado_em: row.updated_at,
          conteudo: trim(row.data, 6000),
        };
      },
    }),

    calcular_news: tool({
      description:
        "Calcula a pontuação da escala NEWS 2 a partir dos sinais vitais e devolve a classificação de risco e a conduta recomendada.",
      inputSchema: z.object({
        fr: z.string().describe("Frequência respiratória em irpm."),
        spo2: z.string().describe("Saturação de O2 em %."),
        temp: z.string().describe("Temperatura em °C."),
        pas: z.string().describe("Pressão arterial sistólica em mmHg."),
        fc: z.string().describe("Frequência cardíaca em bpm."),
        estado_mental_alterado: z
          .boolean()
          .optional()
          .describe("true quando há confusão, agitação ou letargia."),
      }),
      execute: async ({ fr, spo2, temp, pas, fc, estado_mental_alterado }) => {
        const vitals: NewsVitals = {
          fr,
          spo2,
          temp,
          pas,
          fc,
          mental: estado_mental_alterado
            ? "Alterado (confusão, agitação, letargia)"
            : "Normal / Alerta",
        };
        const result = computeNews(vitals);
        return {
          total: result.total,
          classificacao: result.classification,
          conduta: result.conduct,
          parametros: result.params.map((p) => ({
            parametro: p.label,
            valor: p.value,
            unidade: p.unit,
            pontos: p.score,
          })),
        };
      },
    }),
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return new Response("Não autorizado", { status: 401 });

        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const threadId = typeof body.threadId === "string" ? body.threadId : null;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Requisição inválida", { status: 400 });
        }

        if (messages.length > 50) {
          return new Response("Conversa excedeu o limite máximo de mensagens.", { status: 400 });
        }

        const supabase = createUserClient(token);
        if (!supabase) return new Response("Backend indisponível", { status: 500 });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) return new Response("Não autorizado", { status: 401 });

        const { data: thread } = await supabase
          .from("ai_threads")
          .select("id")
          .eq("id", threadId)
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (!thread) return new Response("Conversa não encontrada", { status: 404 });

        const lumi = resolveLumiChat();
        if (!lumi) return new Response("Assistente de IA não configurado", { status: 500 });

        const [{ data: profile }, { data: roles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, specialty")
            .eq("id", userData.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userData.user.id),
        ]);

        const isMaster = (roles ?? []).some((r) => r.role === "master");
        const specialty = profile?.specialty ?? "Geral";

        const uiMessages = messages as UIMessage[];
        const lastMessage = uiMessages[uiMessages.length - 1];

        // Validar e sanitizar mensagem do usuário
        if (lastMessage?.role === "user") {
          // Limite de 10 perguntas diárias por especialidade (master possui flexibilidade de teste)
          if (!isMaster) {
            const quota = await checkAndIncrementSpecialtyChat(
              supabase,
              specialty,
              userData.user.id,
              10,
            );
            if (!quota.allowed) {
              return new Response(
                `O limite diário de 10 perguntas para a especialidade ${specialty} foi atingido hoje. O limite será renovado à meia-noite para assegurar o uso equilibrado dos recursos.`,
                { status: 429 },
              );
            }
          }

          // Sanitizar comprimento de textos
          if (Array.isArray(lastMessage.parts)) {
            for (const part of lastMessage.parts) {
              if (
                part &&
                typeof part === "object" &&
                "text" in part &&
                typeof part.text === "string"
              ) {
                if (part.text.length > 4000) {
                  part.text = part.text.slice(0, 4000);
                }
              }
            }
          }

          await supabase.from("ai_messages").insert({
            thread_id: threadId,
            role: "user",
            content: lastMessage.parts as never,
          });
          await supabase
            .from("ai_threads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", threadId);
        }

        const context = profile
          ? `\n\n## Usuário atual\nNome: ${profile.full_name ?? "não informado"}. Especialidade: ${specialty}. Data de hoje: ${new Date().toISOString().slice(0, 10)}.\nAdapte a profundidade técnica e os exemplos a essa especialidade.`
          : `\n\nData de hoje: ${new Date().toISOString().slice(0, 10)}.`;

        const result = streamText({
          model: lumi.model,
          system: `${AI_CHAT_SYSTEM_PROMPT}${context}`,
          messages: await convertToModelMessages(uiMessages),
          tools: buildTools(supabase, userData.user.id, lumi.imageKey, lumi.useGemini),
          stopWhen: stepCountIs(50),
          abortSignal: request.signal,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onError: (error) => describeAiError(error),
          onFinish: async ({ responseMessage }) => {
            if (!responseMessage) return;
            const { error } = await supabase.from("ai_messages").insert({
              thread_id: threadId,
              role: "assistant",
              content: responseMessage.parts as never,
            });
            if (error) console.error("Falha ao salvar mensagem da IA", error);
          },
        });
      },
    },
  },
});
