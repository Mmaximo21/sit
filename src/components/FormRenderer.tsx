import type { Field, FormSpec, TableColumn } from "@/lib/forms/types";
import { sectionSlug } from "@/lib/forms/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2 } from "lucide-react";
import { AttachmentsField } from "@/components/AttachmentsField";
import { CalorieCalculatorField } from "@/components/CalorieCalculatorField";
import type { AssessmentAttachment } from "@/lib/attachments";
import { parseSectionTitle } from "@/lib/forms/section-numbering";

export type FormValues = Record<string, unknown>;

function toNumber(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string" || raw.trim() === "") return 0;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

function computeSum(field: Extract<Field, { type: "computed" }>, values: FormValues, spec: FormSpec): number {
  let total = 0;
  for (const key of field.sum) {
    const target = findField(spec, key);
    if (target && target.type === "computed") total += computeSum(target, values, spec);
    else total += toNumber(values[key]);
  }
  return total;
}

function findField(spec: FormSpec, key: string): Field | undefined {
  for (const section of spec.sections) {
    for (const field of section.fields) if (field.key === key) return field;
  }
  return undefined;
}

type Props = {
  spec: FormSpec;
  values: FormValues;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean | undefined;
  highlight?: Set<string> | undefined;
  assessmentId?: string | undefined;
};

export function FormRenderer({ spec, values, onChange, readOnly = false, highlight, assessmentId }: Props) {
  return (
    <div className="space-y-8">
      {spec.sections.map((section, index) => {
        const numberedTitle = parseSectionTitle(section.title);
        const isClosing = section.fields.some((f) => f.key === "data_encerramento");
        return <section
          key={section.title}
          id={sectionSlug(section.title)}
          className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7"
        >
          <header className="mb-5 flex items-start gap-3 border-b border-border pb-3">
            {isClosing ? null : (
              <span className="font-display mt-0.5 grid h-8 min-w-8 shrink-0 place-items-center rounded-lg bg-primary/10 px-1.5 text-sm font-semibold text-primary">
                {numberedTitle.number ?? index + 1}
              </span>
            )}
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">{numberedTitle.title}</h2>
              {section.subtitle ? (
                <p className="mt-1 text-sm font-semibold uppercase text-foreground">{section.subtitle}</p>
              ) : null}
              {section.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              ) : null}
            </div>
          </header>
          <div className="space-y-5">
            {section.fields.map((field) => (
              <div
                key={field.key}
                data-field={field.key}
                className={
                  highlight?.has(field.key)
                    ? "scroll-mt-28 rounded-lg bg-destructive/5 p-3 ring-1 ring-destructive/40"
                    : "scroll-mt-28"
                }
              >
                <FieldView
                  field={field}
                  spec={spec}
                  values={values}
                  onChange={onChange}
                  readOnly={readOnly}
                  assessmentId={assessmentId}
                />

              </div>
            ))}
          </div>
        </section>;
      })}
    </div>
  );
}


function FieldView({
  field,
  spec,
  values,
  onChange,
  readOnly,
  assessmentId,
}: Props & { field: Field }) {
  const value = values[field.key];


  switch (field.type) {
    case "note":
      return (
        <p className="pt-2 font-display text-sm font-semibold uppercase tracking-wide text-primary">
          {field.label}
        </p>
      );

    case "text":
    case "date":
      return (
        <Row label={field.label} required={"required" in field ? field.required : undefined}>
          <Input
            type={field.type === "date" ? "date" : "text"}
            className={field.required && !String(value ?? "").trim() ? "border-destructive/60" : undefined}
            value={(value as string) ?? ""}
            placeholder={field.type === "text" ? field.placeholder : undefined}
            disabled={Boolean(readOnly)}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </Row>
      );

    case "number":
      return (
        <Row label={field.suffix ? `${field.label} (${field.suffix})` : field.label} required={field.required}>
          <Input
            type="text"
            inputMode="decimal"
            value={(value as string) ?? ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </Row>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <Textarea
            rows={field.rows ?? 4}
            value={(value as string) ?? ""}
            disabled={readOnly}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      );

    case "select":
      return (
        <Row label={field.label} hint={field.hint} required={"required" in field ? field.required : undefined}>
          <Select
            value={(value as string) ?? ""}
            disabled={Boolean(readOnly)}
            onValueChange={(next) => onChange(field.key, next)}
          >
            <SelectTrigger className={field.required && !String(value ?? "").trim() ? "border-destructive/60" : undefined}>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>{field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
      );

    case "radio":
      return (
        <Row label={field.label} hint={field.hint} required={"required" in field ? field.required : undefined}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <RadioGroup value={(value as string) ?? ""} onValueChange={(next) => onChange(field.key, next)} disabled={readOnly} className="flex flex-wrap gap-x-5 gap-y-2">
            {field.options.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={opt} />
                {opt}
              </label>
            ))}
            </RadioGroup>
            {!readOnly && value ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => onChange(field.key, "")}
              >
                limpar
              </Button>
            ) : null}
          </div>
        </Row>
      );

    case "checkbox":
      return (
        <label className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={Boolean(value)}
            disabled={readOnly}
            onCheckedChange={(checked) => onChange(field.key, Boolean(checked))}
          />
          {field.label}
        </label>
      );

    case "sided": {
      const record = (value as Record<string, string>) ?? {};
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {field.sides.map((side) => (
              <div key={side} className="rounded-md border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{side}</p>
                <RadioGroup value={record[side] ?? ""} onValueChange={(next) => onChange(field.key, { ...record, [side]: next })} disabled={readOnly} className="flex flex-wrap gap-4">
                  {field.options.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value={opt} />
                      {opt}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "computed": {
      const total = computeSum(field, values, spec);
      return (
        <Row label={field.label} hint={field.hint}>
          <output className="flex h-10 items-center rounded-md border border-primary/30 bg-primary/5 px-3 font-display text-sm font-semibold text-primary">
            {formatNumber(total)}
          </output>
        </Row>
      );
    }

    case "table":
      return (
        <TableField field={field} value={value} onChange={onChange} readOnly={readOnly} />
      );

    case "calorias":
      return (
        <CalorieCalculatorField
          label={field.label}
          hint={field.hint}
          readOnly={readOnly}
          value={value}
          onChange={(next) => onChange(field.key, next)}
        />
      );

    case "attachments":
      return assessmentId ? (
        <AttachmentsField
          label={field.label}
          hint={field.hint}
          accept={field.accept}
          required={field.required}
          assessmentId={assessmentId}
          value={value}
          readOnly={readOnly}
          onChange={(next: AssessmentAttachment[]) => onChange(field.key, next)}
        />
      ) : null;



    default:
      return null;
  }
}

function TableField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: Extract<Field, { type: "table" }>;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean | undefined;
}) {
  const rows: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : (field.rows ?? [{}]);

  const update = (index: number, col: string, next: unknown) => {
    const copy = rows.map((r) => ({ ...r }));
    copy[index] = { ...copy[index], [col]: next };
    onChange(field.key, copy);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{field.label}</Label>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              {field.columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </th>
              ))}
              {!readOnly && field.addable ? <th className="w-10" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {field.columns.map((col) => (
                  <td key={col.key} className="px-2 py-1.5 align-middle">
                    <Cell
                      col={col}
                      value={row[col.key]}
                      readOnly={readOnly}
                      onChange={(next) => update(index, col.key, next)}
                    />
                  </td>
                ))}
                {!readOnly && field.addable ? (
                  <td className="px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onChange(field.key, rows.filter((_, i) => i !== index))}
                      aria-label="Remover linha"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && field.addable ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(field.key, [...rows, {}])}>
          <Plus className="mr-1 size-4" /> Adicionar linha
        </Button>
      ) : null}
    </div>
  );
}

function Cell({
  col,
  value,
  onChange,
  readOnly,
}: {
  col: TableColumn;
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean | undefined;
}) {
  if (col.type === "checkbox") {
    return (
      <Checkbox checked={Boolean(value)} disabled={readOnly} onCheckedChange={(c) => onChange(Boolean(c))} />
    );
  }
  if (col.type === "select") {
    return (
      <Select
        value={(value as string) ?? ""}
        disabled={Boolean(readOnly)}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione…" /></SelectTrigger>
        <SelectContent>{(col.options ?? []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  return (
    <Input
      className="h-9"
      inputMode={col.type === "number" ? "numeric" : undefined}
      value={(value as string) ?? ""}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Row({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-start sm:gap-4">
      <div>
        <Label className="text-sm font-medium leading-snug">
          {label}
          {required ? <span className="ml-1 text-destructive" title="Campo obrigatório">*</span> : null}
        </Label>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
