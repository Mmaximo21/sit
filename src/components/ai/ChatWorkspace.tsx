import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  MessageSquarePlus,
  Paperclip,
  ShieldCheck,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getSpecialtyChatUsage } from "@/lib/chat-limits";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import lumiLogo from "@/assets/lumi.png";
import {
  accessToken,
  createThread,
  deleteThread,
  listMessages,
  listThreads,
  lumiFileUrl,
  messageText,
  renameThread,
  threadTitleFromText,
} from "@/lib/ai-chat";

const SUGGESTIONS = [
  "Protocolo de prevenção de lesão por pressão (RDC 502/2021)",
  "Calcule o NEWS 2: FR 24, SpO₂ 91%, temp 38,2 °C, PAS 96, FC 112, confuso",
  "Condutas assistenciais e monitoramento no censo de enfermagem",
  "Critérios de reavaliação no Plano Individual de Atenção (PIA)",
  "Orientações nutricionais e espessamento na disfagia moderada",
  "Diretrizes ONA para registros e passagens de plantão seguras",
];

const TOOL_LABELS: Record<string, string> = {
  buscar_residentes: "Consultando residentes",
  avaliacoes_do_residente: "Lendo avaliações e PIA",
  ultimo_censo: "Verificando o censo de enfermagem",
  calcular_news: "Calculando a escala NEWS 2",
  gerar_imagem: "Gerando imagem",
};

const ACCEPTED_FILES = "image/*,application/pdf,text/plain,text/csv,text/markdown";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function LumiMark({ className }: { className?: string }) {
  return (
    <img
      src={lumiLogo}
      alt="Lumi"
      width={512}
      height={512}
      loading="lazy"
      className={cn("size-8 object-contain", className)}
    />
  );
}

/** Miniaturas dos arquivos anexados antes do envio. */
function AttachmentChips() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {attachments.files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-2 py-1 text-xs"
        >
          {file.mediaType?.startsWith("image/") ? (
            <img src={file.url} alt="" className="size-8 rounded-lg object-cover" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
          <span className="max-w-[160px] truncate">{file.filename ?? "arquivo"}</span>
          <button
            type="button"
            aria-label={`Remover ${file.filename ?? "arquivo"}`}
            onClick={() => attachments.remove(file.id)}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AttachButton() {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton type="button" onClick={attachments.openFileDialog}>
      <Paperclip className="size-4" />
      Anexar
    </PromptInputButton>
  );
}

/** Imagem gerada pela Lumi, com visualização e download. */
function GeneratedImage({ path, name }: { path: string; name: string }) {
  const query = useQuery({
    queryKey: ["lumi-file", path],
    queryFn: () => lumiFileUrl(path),
    staleTime: 30 * 60 * 1000,
  });

  if (query.isPending) return <Shimmer>Preparando a imagem…</Shimmer>;
  if (query.error || !query.data) {
    return <p className="text-xs text-destructive">Não foi possível abrir a imagem gerada.</p>;
  }

  return (
    <figure className="my-2 space-y-2">
      <img
        src={query.data}
        alt={name}
        className="max-h-[420px] w-auto rounded-xl border border-border object-contain"
      />
      <Button asChild size="sm" variant="outline">
        <a href={query.data} download={name}>
          <Download className="mr-2 size-4" /> Baixar imagem
        </a>
      </Button>
    </figure>
  );
}

/** Arquivos enviados pelo usuário (ou devolvidos pela Lumi) dentro da mensagem. */
function MessageFiles({ files }: { files: FileUIPart[] }) {
  if (files.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file, index) => {
        const name = file.filename ?? `arquivo-${index + 1}`;
        return file.mediaType?.startsWith("image/") ? (
          <a key={`${name}-${index}`} href={file.url} download={name} title={`Baixar ${name}`}>
            <img
              src={file.url}
              alt={name}
              className="max-h-48 rounded-xl border border-border object-contain"
            />
          </a>
        ) : (
          <a
            key={`${name}-${index}`}
            href={file.url}
            download={name}
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs transition-colors hover:border-primary/40"
          >
            <FileText className="size-4 text-muted-foreground" />
            <span className="max-w-[200px] truncate">{name}</span>
            <Download className="size-3.5 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}

export function ChatWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState("");
  const titledRef = useRef(false);

  const specialty = session?.specialty;
  const isMaster = Boolean(session?.isMaster);

  const threadsQuery = useQuery({ queryKey: ["ai-threads"], queryFn: listThreads });
  const historyQuery = useQuery({
    queryKey: ["ai-messages", threadId],
    queryFn: () => listMessages(threadId),
  });

  // Consulta da cota diária de 10 perguntas por especialidade
  const quotaQuery = useQuery({
    queryKey: ["specialty-chat-usage", specialty],
    queryFn: () => getSpecialtyChatUsage(supabase, specialty, 10),
    refetchInterval: 30_000,
  });

  const quota = quotaQuery.data;
  const isExhausted = !isMaster && quota ? quota.remaining <= 0 : false;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: async () => {
          const token = await accessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );

  const initialMessages = historyQuery.data;
  const { messages, sendMessage, status, stop, setMessages } = useChat<UIMessage>({
    id: threadId,
    transport,
    onError: (error) => toast.error(error.message || "Não foi possível enviar a pergunta."),
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      void queryClient.invalidateQueries({ queryKey: ["specialty-chat-usage"] });
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
    titledRef.current = Boolean(initialMessages && initialMessages.length > 0);
  }, [initialMessages, setMessages, threadId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const busy = status === "submitted" || status === "streaming";

  const submit = useCallback(
    async (text: string, files: FileUIPart[] = []) => {
      const value = text.trim();
      if ((!value && files.length === 0) || busy) return;

      if (isExhausted) {
        toast.error(
          `Limite diário de 10 perguntas atingido para ${specialty || "esta especialidade"}.`,
        );
        return;
      }

      setInput("");
      if (!titledRef.current) {
        titledRef.current = true;
        try {
          await renameThread(
            threadId,
            threadTitleFromText(value || files[0]?.filename || "Arquivo enviado"),
          );
          void queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
        } catch {
          /* título é apenas cosmético */
        }
      }
      await sendMessage({ text: value, files });
    },
    [busy, isExhausted, queryClient, sendMessage, specialty, threadId],
  );

  async function handleNewThread() {
    try {
      const thread = await createThread();
      await queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conversa.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteThread(id);
      const rest = (threadsQuery.data ?? []).filter((t) => t.id !== id);
      await queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      if (id === threadId) {
        if (rest[0]) navigate({ to: "/chat/$threadId", params: { threadId: rest[0].id } });
        else navigate({ to: "/chat" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a conversa.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-3">
        <Button className="w-full" onClick={handleNewThread}>
          <MessageSquarePlus className="mr-2 size-4" /> Nova conversa
        </Button>
        <div className="space-y-1 rounded-2xl border border-border bg-card p-2 shadow-soft">
          {(threadsQuery.data ?? []).length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
          ) : null}
          {(threadsQuery.data ?? []).map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "flex items-center gap-1 rounded-xl px-1 transition-colors",
                thread.id === threadId ? "bg-primary/10" : "hover:bg-muted/60",
              )}
            >
              <Link
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                className="flex-1 truncate px-2 py-2 text-left text-sm"
                title={thread.title}
              >
                {thread.title}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Excluir conversa ${thread.title}`}
                onClick={() => handleDelete(thread.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex h-[70vh] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {/* Barra de conformidade e cota diária por especialidade */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="font-semibold text-foreground">
              {session?.isMaster ? "Modo Administrador" : `Especialidade: ${specialty || "Geral"}`}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {session?.isMaster
                ? "Acesso técnico sem restrição de cota"
                : `${quota?.count ?? 0} de ${quota?.limit ?? 10} perguntas hoje (${quota?.remaining ?? 10} restantes)`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isExhausted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                <AlertCircle className="size-3" /> Cota esgotada hoje
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <CheckCircle className="size-3" /> Cota ativa (10/dia)
              </span>
            )}
          </div>
        </div>

        <Conversation className="flex-1">
          <ConversationContent className="gap-6">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<Stethoscope className="size-9 text-primary" />}
                title="Central de Protocolos Clínicos & Apoio Multiprofissional"
                description="Consulte protocolos institucionais, cálculo de escalas (NEWS 2), apoio à elaboração de PIA e conferência assistencial da ILPI Luiza Olindina da Silva Alves (Acreditada ONA)."
              >
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void submit(s)}
                      disabled={isExhausted}
                      className="rounded-xl border border-border bg-background/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : null}

            {messages.map((message) => {
              const text = messageText(message);
              const fileParts = message.parts.filter(
                (part): part is FileUIPart => part.type === "file",
              );
              const toolParts = message.parts.filter(
                (part) => part.type.startsWith("tool-") || part.type === "dynamic-tool",
              );
              return (
                <Message key={message.id} from={message.role}>
                  {message.role === "assistant" ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <LumiMark className="size-5" /> Lumi
                    </div>
                  ) : null}
                  <MessageContent>
                    <MessageFiles files={fileParts} />
                    {toolParts.map((part, index) => {
                      const raw = part as {
                        type: string;
                        state: never;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                        toolName?: string;
                      };
                      const name = raw.toolName ?? raw.type.replace("tool-", "");
                      const image = raw.output as
                        { tipo?: string; arquivo?: string; nome?: string } | undefined;
                      const isImage =
                        name === "gerar_imagem" &&
                        image?.tipo === "imagem_gerada" &&
                        typeof image.arquivo === "string";
                      return (
                        <div key={`${message.id}-tool-${index}`}>
                          <Tool defaultOpen={false}>
                            <ToolHeader
                              type={raw.type as never}
                              state={raw.state}
                              title={TOOL_LABELS[name] ?? name}
                            />
                            <ToolContent>
                              <ToolInput input={raw.input} />
                              <ToolOutput
                                output={
                                  raw.output ? (
                                    <pre className="overflow-x-auto text-xs">
                                      {JSON.stringify(raw.output, null, 2)}
                                    </pre>
                                  ) : undefined
                                }
                                errorText={raw.errorText}
                              />
                            </ToolContent>
                          </Tool>
                          {isImage ? (
                            <GeneratedImage
                              path={image.arquivo as string}
                              name={image.nome ?? "imagem-lumi.png"}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                    {message.role === "assistant" ? (
                      <MessageResponse>{text}</MessageResponse>
                    ) : (
                      <p className="whitespace-pre-wrap">{text}</p>
                    )}
                  </MessageContent>
                </Message>
              );
            })}

            {status === "submitted" ? <Shimmer>Lumi está pensando…</Shimmer> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          {isExhausted ? (
            <div className="mb-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-center text-xs text-foreground">
              <p className="font-semibold text-warning-foreground">
                Limite diário de 10 perguntas atingido para {specialty || "esta especialidade"}.
              </p>
              <p className="mt-1 text-muted-foreground">
                Para preservar a equidade e o foco clínico entre os setores, cada especialidade
                dispõe de 10 consultas diárias. A cota será renovada à meia-noite.
              </p>
            </div>
          ) : null}

          <PromptInput
            accept={ACCEPTED_FILES}
            multiple
            maxFiles={5}
            maxFileSize={MAX_FILE_SIZE}
            onError={(error) =>
              toast.error(
                error.code === "max_file_size"
                  ? "Cada arquivo deve ter até 20 MB."
                  : error.code === "max_files"
                    ? "Envie no máximo 5 arquivos por mensagem."
                    : "Envie imagens, PDF ou arquivos de texto.",
              )
            }
            onSubmit={(message, event) => {
              event.preventDefault();
              if (isExhausted) return;
              void submit(input, message.files);
            }}
          >
            <AttachmentChips />
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              disabled={isExhausted || busy}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                isExhausted
                  ? "Cota diária da especialidade atingida. Retorno amanhã às 00:00."
                  : "Consulte protocolos assistenciais, diretrizes ou anexe documentos…"
              }
            />
            <PromptInputFooter>
              <PromptInputTools>
                <AttachButton />
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} disabled={isExhausted} />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Anexos aceitos: imagens, PDF e texto (até 20 MB). A Central de Apoio Clínico apoia a
            tomada de decisão e não substitui a avaliação presencial do profissional responsável
            (RDC 502/2021).
          </p>
        </div>
      </section>
    </div>
  );
}
