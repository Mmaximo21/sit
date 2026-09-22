export type NumberedSectionTitle = {
  number: string | null;
  title: string;
};

/** Separa a numeração institucional já escrita no título sem alterar sua sequência. */
export function parseSectionTitle(value: string): NumberedSectionTitle {
  const title = value.trim();
  const match = /^(\d+(?:\.\d+)*|[IVXLC]+)\s*(?:[.\-–—)]\s*|\s+)(.+)$/i.exec(title);
  if (!match) return { number: null, title };

  return {
    number: match[1] ?? null,
    title: (match[2] ?? title).trim(),
  };
}
