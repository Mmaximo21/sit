import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSpecialtyNames } from "@/lib/settings";
import {
  SIGNATURE_ACCEPT,
  deleteSpecialtySignature,
  signaturePreviewUrl,
  uploadSpecialtySignature,
  useSpecialtySignatures,
  type SpecialtySignatureRow,
} from "@/lib/signatures";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

function SignaturePreview({ row }: { row: SpecialtySignatureRow }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    signaturePreviewUrl(row.file_path)
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => setUrl(null));
    return () => {
      active = false;
    };
  }, [row.file_path]);

  if (!url) return <div className="h-16 w-40 rounded-lg bg-muted" />;
  return (
    <img
      src={url}
      alt={`Assinatura digitalizada de ${row.specialty}`}
      className="h-16 w-auto max-w-56 rounded-lg border border-border bg-white object-contain p-1"
    />
  );
}

function SignatureRow({
  specialty,
  row,
}: {
  specialty: string;
  row: SpecialtySignatureRow | undefined;
}) {
  const { data: session } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["specialty-signatures"] });
  };

  const upload = useMutation({
    mutationFn: async (file: File) => uploadSpecialtySignature(specialty, file, session!.userId),
    onSuccess: () => {
      toast.success(
        "Assinatura registrada. Ela passará a constar nos documentos desta especialidade.",
      );
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a assinatura."),
  });

  const remove = useMutation({
    mutationFn: async () => deleteSpecialtySignature(row!),
    onSuccess: () => {
      toast.success("Assinatura removida.");
      invalidate();
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover a assinatura.",
      ),
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {row ? (
          <SignaturePreview row={row} />
        ) : (
          <div className="grid h-16 w-40 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Sem assinatura
          </div>
        )}
        <div>
          <p className="font-display text-sm font-semibold">{specialty}</p>
          {row ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Enviada em {new Date(row.updated_at).toLocaleDateString("pt-BR")} · {row.file_name}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Envie uma vez e ela constará em todos os documentos.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {row ? <Badge variant="secondary">Ativa</Badge> : null}
        <input
          ref={inputRef}
          type="file"
          accept={SIGNATURE_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload.mutate(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 size-4" /> {row ? "Substituir" : "Enviar assinatura"}
        </Button>
        {row ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm(`Remover a assinatura de ${specialty}?`)) remove.mutate();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Assinaturas digitalizadas por especialidade. O Administrador gerencia todas;
 * cada profissional gerencia apenas a assinatura da sua especialidade.
 */
export function SignaturePanel({ compact = false }: { compact?: boolean }) {
  const { data: session } = useAuth();
  const specialtyNames = useSpecialtyNames();
  const { data: signatures, isLoading } = useSpecialtySignatures();

  const isMaster = session?.isMaster ?? false;
  const list = isMaster ? specialtyNames : session?.specialty ? [session.specialty] : [];

  if (!session || !list.length) return null;

  const bySpecialty = new Map((signatures ?? []).map((row) => [row.specialty, row]));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-primary">
        <PenLine className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-widest">Assinatura digital</span>
      </div>
      <h2 className="mt-1 font-display text-lg font-semibold">
        {compact ? "Sua assinatura digitalizada" : "Assinaturas das especialidades"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Envie a assinatura digitalizada (PNG ou JPG, fundo branco). Uma vez enviada, ela aparece
        automaticamente no Termo de Encerramento de todas as Avaliações e PIAs da especialidade.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((specialty) => (
            <SignatureRow key={specialty} specialty={specialty} row={bySpecialty.get(specialty)} />
          ))}
        </ul>
      )}
    </section>
  );
}
