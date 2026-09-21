import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FOODS, type Food } from "@/lib/nutrition/foods";
import { MACROS, MICROS, NUTRIENTS, formatValue } from "@/lib/nutrition/nutrients";
import {
  MEALS,
  asCalorieValue,
  entryFromFood,
  entryValue,
  sumEntries,
  type CalorieEntry,
} from "@/lib/nutrition/calc";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Props = {
  label: string;
  hint?: string | undefined;
  readOnly?: boolean | undefined;
  value: unknown;
  onChange: (next: { entries: CalorieEntry[] }) => void;
};

export function CalorieCalculatorField({ label, hint, readOnly, value, onChange }: Props) {
  const entries = asCalorieValue(value).entries;
  const [meal, setMeal] = useState<string>(MEALS[2]);
  const [query, setQuery] = useState("");

  const totals = useMemo(() => sumEntries(entries), [entries]);
  const totalGrams = entries.reduce((s, e) => s + (Number(e.grams) || 0), 0);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return FOODS.filter(
      (f) => normalize(f.name).includes(q) || normalize(f.category).includes(q),
    ).slice(0, 24);
  }, [query]);

  const grouped = useMemo(
    () =>
      MEALS.map((m) => ({ meal: m, items: entries.filter((e) => e.meal === m) })).filter(
        (g) => g.items.length > 0,
      ),
    [entries],
  );

  const add = (food: Food, grams: number) => {
    onChange({ entries: [...entries, entryFromFood(food, grams, meal)] });
    setQuery("");
  };

  const kcalOf = (list: CalorieEntry[]) => list.reduce((s, e) => s + entryValue(e, "kcal"), 0);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      {!readOnly ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Refeição
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
              >
                {MEALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Buscar alimento
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ex.: arroz, frango, banana"
                  className="h-10 pl-9"
                />
              </span>
            </label>
          </div>

          {results.length > 0 ? (
            <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
              {results.map((food) => (
                <FoodRow key={food.id} food={food} onAdd={add} />
              ))}
            </ul>
          ) : query.trim() ? (
            <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum alimento encontrado para “{query}”.
            </p>
          ) : null}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          Nenhum alimento registrado.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.meal}>
              <h4 className="mb-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span>{group.meal}</span>
                <span className="tabular-nums">{Math.round(kcalOf(group.items))} kcal</span>
              </h4>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {group.items.map((entry) => (
                  <li key={entry.uid} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {Math.round(entry.grams)} g · {Math.round(entryValue(entry, "kcal"))} kcal · P{" "}
                        {entryValue(entry, "protein").toFixed(1)} g · C{" "}
                        {entryValue(entry, "carbs").toFixed(1)} g · G{" "}
                        {entryValue(entry, "fat").toFixed(1)} g
                      </p>
                    </div>
                    {!readOnly ? (
                      <>
                        <Input
                          value={String(entry.grams)}
                          inputMode="decimal"
                          aria-label={`Quantidade de ${entry.name}`}
                          onChange={(e) => {
                            const grams = Number(e.target.value.replace(",", ".")) || 0;
                            onChange({
                              entries: entries.map((it) =>
                                it.uid === entry.uid ? { ...it, grams } : it,
                              ),
                            });
                          }}
                          className="h-9 w-20 text-right text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${entry.name}`}
                          onClick={() =>
                            onChange({ entries: entries.filter((it) => it.uid !== entry.uid) })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h4 className="font-display flex items-center gap-2 text-sm font-semibold text-primary">
            <Flame className="size-4" /> Resumo nutricional
          </h4>
          <span className="text-xs tabular-nums text-muted-foreground">
            {entries.length} {entries.length === 1 ? "item" : "itens"} · {Math.round(totalGrams)} g
          </span>
        </div>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {[...MACROS, ...MICROS].map((n) => {
            const total = totals[n.key] ?? 0;
            const pct = n.dv ? Math.round((total / n.dv) * 100) : 0;
            return (
              <div
                key={n.key}
                className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1 text-sm"
              >
                <span className="text-muted-foreground">{n.label}</span>
                <span className="tabular-nums font-medium text-foreground">
                  {formatValue(total, n)} {n.unit}
                  <span className="ml-2 text-xs text-muted-foreground">{pct}% VD</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          % VD sobre valores diários de referência para adultos (dieta de 2000 kcal). Base: USDA
          FoodData Central, TBCA/TACO e FAO/INFOODS. {NUTRIENTS.length} nutrientes avaliados.
        </p>
      </div>
    </div>
  );
}

function FoodRow({ food, onAdd }: { food: Food; onAdd: (food: Food, grams: number) => void }) {
  const [grams, setGrams] = useState<string>(String(food.unit?.grams ?? 100));
  const value = Number(grams.replace(",", ".")) || 0;

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{food.name}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {food.category} · {Math.round(food.kcal)} kcal/100 g
          {food.unit ? ` · 1 ${food.unit.label} ≈ ${food.unit.grams} g` : ""}
        </p>
      </div>
      <Input
        value={grams}
        inputMode="decimal"
        aria-label={`Quantidade em gramas de ${food.name}`}
        onChange={(e) => setGrams(e.target.value)}
        className="h-9 w-20 text-right text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={value <= 0}
        onClick={() => onAdd(food, value)}
      >
        <Plus className="size-4" /> Adicionar
      </Button>
    </li>
  );
}
