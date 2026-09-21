import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { asAttachments, type AssessmentAttachment } from "@/lib/attachments";
import {
  createTestUploadUrl,
  digitizeTestFile,
  getTestFileUrl,
  removeTestFile,
} from "@/lib/psych-tests.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, Loader2, ScanLine, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 25 * 1024 * 1024;

/** Gera uma miniatura (data URL) para encaixar a imagem no documento gerado. */
async function imagePreview(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

type Props = {
  label: string;
  hint?: string | undefined;
  accept?: string | undefined;
  required?: boolean | undefined;
  assessmentId: string;
  value: unknown;
  readOnly?: boolean | undefined;
  onChange: (next: AssessmentAttachment[]) => void;
};

export function AttachmentsField({
  label,
  hint,
  accept,
  required,
  assessmentId,
  value,
  readOnly,
  onChange,
}: Props) {
  const items = asAttachments(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo maior que 25 MB.");
      return;
    }
    setBusy("Enviando arquivo…");
    try {
      const { path, token } = await createTestUploadUrl({
        data: { assessmentId, fileName: file.name },
      });
      const { error } = await supabase.storage.from("exames").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);

      const preview = await imagePreview(file);
      setBusy("Digitalizando conteúdo do teste…");
      let text = "";
      try {
        const result = await digitizeTestFile({
          data: { path, fileName: file.name, fileType: file.type },
        });
        text = result.text;
        if (result.note) toast.warning(result.note);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Arquivo anexado, mas a digitalização falhou.",
        );
      }

      const attachment: AssessmentAttachment = {
        path,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        ...(text ? { text } : {}),
        ...(preview ? { preview } : {}),
      };
      onChange([...items, attachment]);
      toast.success(text ? "Teste anexado e digitalizado." : "Teste anexado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível anexar o arquivo.");
    } finally {
      setBusy(null);
    }
  };

  const redigitize = async (item: AssessmentAttachment) => {
    setBusy("Digitalizando novamente…");
    try {
      const result = await digitizeTestFile({
        data: { path: item.path, fileName: item.name, fileType: item.type },
      });
      if (result.note) toast.warning(result.note);
      onChange(items.map((a) => (a.path === item.path ? { ...a, text: result.text } : a)));
      if (result.text) toast.success("Digitalização atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na digitalização.");
    } finally {
      setBusy(null);
    }
  };

  const open = async (item: AssessmentAttachment) => {
    try {
      const { url } = await getTestFileUrl({ data: { path: item.path, fileName: item.name } });
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o arquivo.");
    }
  };

  const drop = async (item: AssessmentAttachment) => {
    onChange(items.filter((a) => a.path !== item.path));
    try {
      await removeTestFile({ data: { path: item.path } });
    } catch {
      /* o registro já saiu da avaliação */
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      {!readOnly ? (
        <div
          className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center transition-colors hover:bg-primary/10"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <ScanLine className="mx-auto size-6 text-primary" />
          <p className="mt-2 text-sm text-foreground">
            Arraste o protocolo do teste aqui ou selecione o arquivo
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ao enviar, o conteúdo é lido e digitalizado automaticamente e passa a integrar esta avaliação.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> {busy}
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" /> Adicionar teste
              </>
            )}
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum teste anexado até o momento.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.path} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {new Date(item.uploadedAt).toLocaleDateString("pt-BR")} ·{" "}
                      {item.text ? "digitalizado" : "sem digitalização"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => void open(item)} aria-label="Abrir arquivo">
                    <Download className="size-4" />
                  </Button>
                  {!readOnly ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={Boolean(busy)}
                        onClick={() => void redigitize(item)}
                        aria-label="Digitalizar novamente"
                      >
                        <ScanLine className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void drop(item)}
                        aria-label="Remover teste"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {item.preview ? (
                <img
                  src={item.preview}
                  alt={`Protocolo digitalizado: ${item.name}`}
                  className="mt-3 max-h-72 w-auto rounded-lg border border-border"
                />
              ) : null}

              <div className="mt-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Conteúdo digitalizado (transcrição incorporada à avaliação)
                </Label>
                <Textarea
                  className="mt-1 font-mono text-xs"
                  rows={8}
                  value={item.text ?? ""}
                  disabled={readOnly}
                  placeholder="Transcrição do protocolo."
                  onChange={(e) =>
                    onChange(items.map((a) => (a.path === item.path ? { ...a, text: e.target.value } : a)))
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
