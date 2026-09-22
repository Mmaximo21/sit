import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpecialtyNames } from "@/lib/settings";
import { createExamUploadUrl, getExamDownloadUrl, deleteExam } from "@/lib/exams.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FlaskConical, Download, Trash2, Paperclip, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exames")({
  head: () => ({
    meta: [
      { title: "Exames dos residentes — AGA ILPI" },
      {
        name: "description",
        content:
          "Área compartilhada entre as especialidades para anexar e consultar exames antigos e recentes dos residentes.",
      },
      { property: "og:title", content: "Exames dos residentes — AGA ILPI" },
      {
        property: "og:description",
        content:
          "Anexe PDFs, documentos e imagens de exames e consulte o histórico de cada residente.",
      },
    ],
  }),
  component: ExamesPage,
});

const norm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MAX_SIZE = 25 * 1024 * 1024;

function ExamesPage() {
  const { data: session } = useAuth();
  const specialtyNames = useSpecialtyNames();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestUpload = useServerFn(createExamUploadUrl);
  const requestDownload = useServerFn(getExamDownloadUrl);
  const removeExam = useServerFn(deleteExam);

  const [residentId, setResidentId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("recente");
  const [examDate, setExamDate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const { data: residents } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, birth_date, sex")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ["exam-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_files")
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isCoordenacao = session?.isCoordenacao ?? false;
  const isMaster = (session?.isMaster ?? false) || isCoordenacao;
  const isCoordinator = (session?.isCoordinator ?? false) && !isMaster;
  const scopeList = useMemo(
    () =>
      isCoordinator && session?.coordinatorScopes !== null
        ? (session?.coordinatorScopes ?? [])
        : [],
    [isCoordinator, session?.coordinatorScopes],
  );
  const effectiveSpecialty = isMaster ? specialty : (session?.specialty ?? "");

  const resetForm = () => {
    setTitle("");
    setExamDate("");
    setNotes("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (!residentId) {
      toast.error("Selecione o residente.");
      return;
    }
    if (!title.trim()) {
      toast.error("Informe o título do exame.");
      return;
    }
    if (!file) {
      toast.error("Anexe o arquivo do exame.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("O arquivo deve ter no máximo 25 MB.");
      return;
    }

    setUploading(true);
    try {
      const signed = await requestUpload({ data: { residentId, fileName: file.name } });
      const { error: uploadError } = await supabase.storage
        .from("exames")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) throw new Error(uploadError.message);

      const { error: insertError } = await supabase.from("exam_files").insert({
        resident_id: residentId,
        title: title.trim(),
        category,
        exam_date: examDate || null,
        specialty: effectiveSpecialty || null,
        notes: notes.trim() || null,
        file_path: signed.path,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by: signed.uploadedBy,
      });
      if (insertError) throw new Error(insertError.message);

      toast.success("Exame anexado com sucesso.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["exam-files"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível anexar o exame.");
    } finally {
      setUploading(false);
    }
  };

  const download = async (examId: string) => {
    try {
      const { url } = await requestDownload({ data: { examId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o arquivo.");
    }
  };

  const deletion = useMutation({
    mutationFn: (examId: string) => removeExam({ data: { examId } }),
    onSuccess: () => {
      toast.success("Exame excluído.");
      queryClient.invalidateQueries({ queryKey: ["exam-files"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
  });

  const filtered = useMemo(() => {
    const term = norm(search.trim());
    return (exams ?? []).filter((exam) => {
      const residentName =
        (exam as { residents?: { full_name?: string } }).residents?.full_name ?? "";
      const matchesTerm =
        !term || norm(residentName).includes(term) || norm(exam.title).includes(term);
      const matchesCategory = categoryFilter === "todos" || exam.category === categoryFilter;
      const matchesScope =
        !isCoordinator ||
        scopeList.length === 0 ||
        (!!exam.specialty && scopeList.includes(exam.specialty));
      return matchesTerm && matchesCategory && matchesScope;
    });
  }, [exams, search, categoryFilter, isCoordinator, scopeList]);

  const canDelete = (uploadedBy: string) =>
    (session?.isMaster ?? false) || (!isCoordinator && uploadedBy === session?.userId);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-hero px-6 py-8 text-white shadow-soft sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-soft opacity-60"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            Área compartilhada
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Exames</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Todas as especialidades podem anexar e consultar exames antigos e recentes de qualquer
            residente — PDF, Word, planilhas, imagens e outros formatos.
          </p>
        </div>
      </section>

      {isCoordinator ? null : (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">Anexar exame</h2>
              <p className="text-sm text-muted-foreground">
                Selecione o residente, classifique como antigo ou recente e envie o arquivo.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Residente</Label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione pelo nome completo" />
                </SelectTrigger>
                <SelectContent>
                  {(residents ?? []).map((resident) => (
                    <SelectItem key={resident.id} value={resident.id}>
                      {resident.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-title">Título do exame</Label>
              <Input
                id="exam-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Hemograma completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Classificação</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recente">Recente</SelectItem>
                  <SelectItem value="antigo">Antigo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-date">Data do exame</Label>
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
              />
            </div>

            {isMaster ? (
              <div className="space-y-1.5">
                <Label>Especialidade responsável</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialtyNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="exam-file">Arquivo</Label>
              <Input
                id="exam-file"
                ref={fileInputRef}
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Qualquer formato (PDF, DOC, DOCX, XLS, JPG, PNG…), até 25 MB.
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="exam-notes">Observações</Label>
              <Textarea
                id="exam-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contexto clínico, laboratório, alterações relevantes…"
                rows={3}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={upload} disabled={uploading}>
              <Paperclip className="mr-2 size-4" />
              {uploading ? "Enviando…" : "Anexar exame"}
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por residente ou exame"
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os exames</SelectItem>
              <SelectItem value="recente">Recentes</SelectItem>
              <SelectItem value="antigo">Antigos</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {filtered.length} de {exams?.length ?? 0}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <FlaskConical className="size-8 text-muted-foreground" />
            <p className="font-medium">Nenhum exame encontrado</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {exams && exams.length > 0
                ? "Ajuste a busca ou o filtro de classificação."
                : "Anexe o primeiro exame usando o formulário acima."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((exam) => {
              const residentName =
                (exam as { residents?: { full_name?: string } }).residents?.full_name ??
                "Residente";
              return (
                <li key={exam.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-56 flex-1">
                    <p className="font-semibold leading-tight">{residentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.title} · {exam.file_name} · {formatSize(exam.file_size)}
                    </p>
                    {exam.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{exam.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={exam.category === "recente" ? "default" : "secondary"}>
                      {exam.category === "recente" ? "Recente" : "Antigo"}
                    </Badge>
                    {exam.specialty ? <Badge variant="outline">{exam.specialty}</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(exam.exam_date)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => download(exam.id)}>
                      <Download className="mr-1 size-4" /> Baixar
                    </Button>
                    {canDelete(exam.uploaded_by) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete({ id: exam.id, title: exam.title })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exame</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo “{pendingDelete?.title}” será removido definitivamente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deletion.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
