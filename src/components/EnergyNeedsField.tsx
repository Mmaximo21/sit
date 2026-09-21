import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flame, Activity, Droplets, Beef } from "lucide-react";
import {
  ACTIVITY_FACTORS,
  CONDITION_FACTORS,
  FORMULAS,
  computeEnergy,
  heightFromKneeHeight,
  type ConditionId,
  type EnergyInput,
} from "@/lib/nutrition/energy";

const n1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const n0 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export function EnergyNeedsField({
  value,
  onChange,
  readOnly,
  offeredKcal,
  offeredProtein,
}: {
  value: EnergyInput;
  onChange: (next: EnergyInput) => void;
  readOnly?: boolean;
  offeredKcal?: number;
  offeredProtein?: number;
}) {
  const result = useMemo(() => computeEnergy(value), [value]);
  const set = <K extends keyof EnergyInput>(key: K, v: EnergyInput[K]) =>
    onChange({ ...value, [key]: v });

  const toggleCondition = (id: ConditionId, checked: boolean) => {
    if (id === "nenhuma") {
      onChange({ ...value, conditions: checked ? ["nenhuma"] : [] });
      return;
    }
    const base = value.conditions.filter((c) => c !== "nenhuma" && c !== id);
    onChange({ ...value, conditions: checked ? [...base, id] : base });
  };

  const adherence =
    offeredKcal && result.total > 0 ? (offeredKcal / result.total) * 100 : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
          <Flame className="size-4 text-primary" /> Energia basal e necessidades diárias
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculado para o perfil de ILPI: idosos em grande parte acamados, com demência, DPOC e
          outras comorbidades. TMB × fator atividade × fator comorbidade × fator térmico.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Sexo</Label>
          <Select
            value={value.sex}
            disabled={Boolean(readOnly)}
            onValueChange={(v) => set("sex", v as EnergyInput["sex"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="F">Feminino</SelectItem>
              <SelectItem value="M">Masculino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Idade (anos)</Label>
          <Input
            type="number"
            min={0}
            value={value.age || ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => set("age", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Peso atual (kg)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            value={value.weight || ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => set("weight", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Altura (cm)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            value={value.height || ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => set("height", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-dashed border-border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Altura do joelho (cm) — estimativa para acamados</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            disabled={Boolean(readOnly)}
            placeholder="Ex.: 48"
            onChange={(e) => {
              const knee = Number(e.target.value);
              const est = heightFromKneeHeight(value.sex, value.age, knee);
              if (est) set("height", Math.round(est * 10) / 10);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Fórmula de Chumlea: preenche automaticamente a altura estimada acima.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Temperatura axilar média (°C)</Label>
          <Input
            type="number"
            step="0.1"
            value={value.temperature || ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => set("temperature", Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Acréscimo de 13% por grau acima de 37 °C.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Equação de energia basal</Label>
          <Select
            value={value.formula}
            disabled={Boolean(readOnly)}
            onValueChange={(v) => set("formula", v as EnergyInput["formula"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMULAS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {FORMULAS.find((f) => f.value === value.formula)?.note}
          </p>
        </div>

        {value.formula === "kcalkg" ? (
          <div className="space-y-2">
            <Label>kcal por kg de peso/dia</Label>
            <Input
              type="number"
              step="0.5"
              value={value.kcalPerKg || ""}
              disabled={Boolean(readOnly)}
              onChange={(e) => set("kcalPerKg", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              ESPEN geriatria: 27-30 kcal/kg/dia; acamados costumam ficar em 25-28.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Fator de atividade / mobilidade</Label>
            <Select
              value={String(value.activity)}
              disabled={Boolean(readOnly)}
              onValueChange={(v) => set("activity", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_FACTORS.map((a) => (
                  <SelectItem key={a.value} value={String(a.value)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Comorbidades / estresse metabólico</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONDITION_FACTORS.map((c) => {
            const checked = value.conditions.includes(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/60 p-3 text-sm transition hover:border-primary/40"
              >
                <Checkbox
                  checked={checked}
                  disabled={Boolean(readOnly)}
                  onCheckedChange={(v) => toggleCondition(c.id, Boolean(v))}
                />
                <span>
                  {c.label}
                  <span className="ml-1 text-xs text-muted-foreground">
                    (×{c.factor.toFixed(2).replace(".", ",")})
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Aplicamos o maior fator selecionado, evitando superestimar a meta calórica.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Meta de proteína (g/kg/dia)</Label>
          <Input
            type="number"
            step="0.1"
            value={value.proteinPerKg || ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => set("proteinPerKg", Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            1,0-1,2 g/kg na manutenção; 1,2-1,5 g/kg em desnutrição ou lesão por pressão.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Hidratação (mL/kg/dia)</Label>
          <Input
            type="number"
            step="1"
            value={value.fluidPerKg || ""}
            disabled={Boolean(readOnly)}
            onChange={(e) => set("fluidPerKg", Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            30 mL/kg/dia como referência; ajustar em ICC e insuficiência renal.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResultCard
          icon={<Activity className="size-4" />}
          label="Energia basal (TMB)"
          value={`${n0(result.bmr)} kcal`}
          hint={
            value.formula === "kcalkg"
              ? `${n1(value.kcalPerKg)} kcal/kg`
              : `Fatores: ${n1(result.activityFactor)} × ${n1(result.conditionFactor)} × ${n1(result.feverFactor)}`
          }
        />
        <ResultCard
          icon={<Flame className="size-4" />}
          label="Necessidade energética total"
          value={`${n0(result.total)} kcal/dia`}
          hint={`${n1(result.kcalPerKgAchieved)} kcal/kg/dia`}
          highlight
        />
        <ResultCard
          icon={<Beef className="size-4" />}
          label="Proteína"
          value={`${n0(result.protein)} g/dia`}
          hint={`${n1(value.proteinPerKg)} g/kg`}
        />
        <ResultCard
          icon={<Droplets className="size-4" />}
          label="Hidratação"
          value={`${n0(result.fluid)} mL/dia`}
          hint={`${n0(value.fluidPerKg)} mL/kg`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {result.bmi !== null ? (
          <Badge variant="secondary">
            IMC {n1(result.bmi)} kg/m² · {result.bmiClass}
          </Badge>
        ) : null}
        {adherence !== null ? (
          <Badge variant={adherence < 80 || adherence > 120 ? "destructive" : "secondary"}>
            Cardápio ofertado: {n0(offeredKcal ?? 0)} kcal ({n0(adherence)}% da meta)
          </Badge>
        ) : null}
        {offeredProtein && result.protein > 0 ? (
          <Badge variant="secondary">
            Proteína ofertada: {n1(offeredProtein)} g ({n0((offeredProtein / result.protein) * 100)}%
            da meta)
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Conduta nutricional e justificativa do cálculo</Label>
        <Textarea
          rows={3}
          value={value.notes}
          disabled={Boolean(readOnly)}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function ResultCard({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"
      }`}
    >
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className="font-display mt-2 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
