import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canAccessTab } from "@/lib/tabs";
import {
  EXIT_TYPES,
  asExitAttachments,
  exitFileUrl,
  formatExitDate,
  removeExitFile,
  uploadExitFile,
  type ExitAttachment,
  type ResidentExitRow,
} from "@/lib/exits";
import { downloadResidentExitDocx } from "@/lib/docx-export";
import type { ResidentRow } from "@/lib/residents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DoorOpen, Download, FileDown, FileText, Loader2, Paperclip, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saidas")({
  head: () => ({
    meta: [
      { title: "Saídas — Sistema Interno ILPI" },
      {
        name: "description",
        content:
          "Registre desacolhimentos e óbitos dos residentes da ILPI, com relatório completo e documentos anexados.",
      },
      { property: "og:title", content: "Saídas — Sistema Interno ILPI" },
      {
        property: "og:description",
        content: "Documentos e relatórios de desacolhimento e óbito dos residentes, guardados com segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaidasPage,
});

function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function SaidasPage() {
  const { data: session, isLoading: loadingSession } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [residentId, setResidentId] = useState("");
  const [residentName, setResidentName] = useState("");
  const [exitType, setExitType] = useState<string>(EXIT_TYPES[0]);
  const [exitDate, setExitDate] = useState(todayISO());
  const [destination, setDestination] = useState("");
  const [cause, setCause] = useState("");
  const [report, setReport] = useState("");
  const [attachments, setAttachments] = useState<ExitAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: residents } = useQuery({
    queryKey: ["residents-exits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, birth_date, sex")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ResidentRow[];
    },
  });

  const { data: exits, isLoading } = useQuery({
    queryKey: ["resident-exits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resident_exits")
        .select("*")
        .order("exit_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ResidentExitRow[];
    },
  });

  function resetForm() {
    setEditingId(null);
    setResidentId("");
    setResidentName("");
    setExitType(EXIT_TYPES[0]);
    setExitDate(todayISO());
    setDestination("");
    setCause("");
    setReport("");
    setAttachments([]);
  }

  function startEdit(row: ResidentExitRow) {
    setEditingId(row.id);
    setResidentId(row.resident_id ?? "");
    setResidentName(row.resident_name);
    setExitType(row.exit_type);
    setExitDate(row.exit_date);
    setDestination(row.destination ?? "");
    setCause(row.cause ?? "");
    setReport(row.report);
    setAttachments(asExitAttachments(row.attachments));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão expirada. Entre novamente.");
      const name = residentName.trim();
      if (!name) throw new Error("Informe o residente.");
      if (!report.trim()) throw new Error("Escreva o relatório da saída.");

      const payload = {
        resident_id: residentId || null,
        resident_name: name,
        exit_type: exitType,
        exit_date: exitDate,
        destination: destination.trim() || null,
        cause: cause.trim() || null,
        report: report.trim(),
        attachments,
      };

      if (editingId) {
        const { error } = await supabase.from("resident_exits").update(payload).eq("id", editingId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("resident_exits").insert({
        ...payload,
        author_id: session.userId,
        author_name: session.fullName || session.username,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      const editing = Boolean(editingId);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["resident-exits"] });
      toast.success(editing ? "Registro de saída atualizado." : "Saída registrada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (row: ResidentExitRow) => {
      const { error } = await supabase.from("resident_exits").delete().eq("id", row.id);
      if (error) throw error;
      for (const file of asExitAttachments(row.attachments)) await removeExitFile(file.path);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resident-exits"] });
      toast.success("Registro excluído.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
  });

  async function addFile(file: File) {
    if (!session) return;
    setUploading(true);
    try {
      const attachment = await uploadExitFile(file, session.userId);
      setAttachments((prev) => [...prev, attachment]);
      toast.success("Documento anexado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível anexar o documento.");
    } finally {
      setUploading(false);
    }
  }

  async function openFile(path: string) {
    try {
      const url = await exitFileUrl(path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    }
  }

  if (loadingSession) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!canAccessTab(session, "saidas")) {
    return (
      <div className="card-surface p-8 text-center shadow-soft">
        <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A aba Saídas é liberada pelas contas Master em “Permissões de abas”.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
          <DoorOpen className="size-3.5" /> Saídas de residentes
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Saídas</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Registre desacolhimentos e óbitos com relatório completo e anexe os documentos comprobatórios. Cada
          registro pode ser baixado em documento A4.
        </p>
      </header>

      <section className="card-surface space-y-5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exit-resident">Residente</Label>
            <select
              id="exit-resident"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={residentId}
              onChange={(event) => {
                const id = event.target.value;
                setResidentId(id);
                const found = residents?.find((r) => r.id === id);
                if (found) setResidentName(found.full_name);
              }}
            >
              <option value="">Selecione ou digite abaixo</option>
              {(residents ?? []).map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.full_name}
                </option>
              ))}
            </select>
            <Input
              value={residentName}
              onChange={(event) => setResidentName(event.target.value)}
              placeholder="Nome completo do residente"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exit-type">Tipo de saída</Label>
              <select
                id="exit-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={exitType}
                onChange={(event) => setExitType(event.target.value)}
              >
                {EXIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit-date">Data da saída</Label>
              <Input
                id="exit-date"
                type="date"
                value={exitDate}
                onChange={(event) => setExitDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exit-destination">
              {exitType === "Óbito" ? "Local do óbito / funerária" : "Destino e responsável pela retirada"}
            </Label>
            <Input
              id="exit-destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={exitType === "Óbito" ? "Ex.: Hospital Municipal" : "Ex.: Família — filho João"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit-cause">{exitType === "Óbito" ? "Causa do óbito" : "Motivo do desacolhimento"}</Label>
            <Input
              id="exit-cause"
              value={cause}
              onChange={(event) => setCause(event.target.value)}
              placeholder={exitType === "Óbito" ? "Conforme declaração de óbito" : "Ex.: reintegração familiar"}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="exit-report">Relatório</Label>
          <Textarea
            id="exit-report"
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder="Descreva o histórico, as providências adotadas, comunicações realizadas e encaminhamentos…"
            className="min-h-[220px] leading-relaxed"
          />
        </div>

        <div className="space-y-3">
          <Label>Documentos anexados</Label>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void addFile(file);
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Paperclip className="mr-2 size-4" />}
            Anexar documento
          </Button>
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum documento anexado ainda (até 25 MB por arquivo).</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label="Abrir" onClick={() => void openFile(file.path)}>
                      <Download className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remover"
                      onClick={() => {
                        setAttachments((prev) => prev.filter((item) => item.path !== file.path));
                        void removeExitFile(file.path);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {editingId ? "Salvar alterações" : "Registrar saída"}
          </Button>
          {editingId ? (
            <Button variant="ghost" onClick={resetForm}>
              Cancelar edição
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Registros de saída</h2>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !exits?.length ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhuma saída registrada até o momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {exits.map((row) => {
              const files = asExitAttachments(row.attachments);
              const canEdit = session?.isMaster || row.author_id === session?.userId;
              return (
                <li key={row.id} className="card-surface animate-rise space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold">{row.resident_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatExitDate(row.exit_date)} · registrado por {row.author_name}
                      </p>
                    </div>
                    <Badge variant={row.exit_type === "Óbito" ? "destructive" : "secondary"}>{row.exit_type}</Badge>
                  </div>

                  {row.destination || row.cause ? (
                    <p className="text-xs text-muted-foreground">
                      {row.destination ? <>Destino/local: {row.destination}</> : null}
                      {row.destination && row.cause ? " · " : null}
                      {row.cause ? <>Motivo/causa: {row.cause}</> : null}
                    </p>
                  ) : null}

                  <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{row.report}</p>

                  {files.length ? (
                    <div className="flex flex-wrap gap-2">
                      {files.map((file) => (
                        <Button
                          key={file.path}
                          size="sm"
                          variant="outline"
                          onClick={() => void openFile(file.path)}
                          className="max-w-[240px]"
                        >
                          <FileText className="mr-1.5 size-4" />
                          <span className="truncate">{file.name}</span>
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void downloadResidentExitDocx({
                          resident_name: row.resident_name,
                          exit_type: row.exit_type,
                          exit_date: row.exit_date,
                          destination: row.destination,
                          cause: row.cause,
                          report: row.report,
                          author_name: row.author_name,
                          attachments: files,
                        })
                      }
                    >
                      <FileDown className="mr-1.5 size-4" /> Baixar .docx
                    </Button>
                    {canEdit ? (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                        Editar
                      </Button>
                    ) : null}
                    {session?.isMaster ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="mr-1.5 size-4" /> Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir registro de saída?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O registro de {row.resident_name} ({row.exit_type}) e os documentos anexados serão
                              removidos definitivamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => remove.mutate(row)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
