/** Anexo de teste/protocolo digitalizado e incorporado à avaliação. */
export type AssessmentAttachment = {
  path: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  /** Transcrição/digitalização gerada automaticamente a partir do arquivo. */
  text?: string;
  /** Miniatura (data URL) usada para encaixar a imagem no documento .docx. */
  preview?: string;
};

export function asAttachments(value: unknown): AssessmentAttachment[] {
  if (!Array.isArray(value)) return [];
  return (value as AssessmentAttachment[]).filter((a) => a && typeof a.path === "string");
}
