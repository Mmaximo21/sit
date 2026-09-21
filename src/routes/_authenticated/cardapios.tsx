import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canAccessMenus, useAuth } from "@/hooks/useAuth";
import { CalorieCalculatorField } from "@/components/CalorieCalculatorField";
import { EnergyNeedsField } from "@/components/EnergyNeedsField";
import { asCalorieValue, sumEntries, type CalorieEntry } from "@/lib/nutrition/calc";
import {
  DEFAULT_ENERGY,
  ageFromBirthDate,
  asEnergyInput,
  type EnergyInput,
} from "@/lib/nutrition/energy";
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
import { Utensils, Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cardapios")({
  head: () => ({
    meta: [
      { title: "Cardápios e cálculo calórico — AGA ILPI" },
      {
        name: "description",
        content:
          "Monte cardápios individuais dos residentes e visualize energia, macronutrientes e micronutrientes automaticamente.",
      },
      { property: "og:title", content: "Cardápios e cálculo calórico — AGA ILPI" },
      {
        property: "og:description",
        content: "Cálculo calórico por refeição com macros, micros e percentual dos valores diários.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardapiosPage,
});

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const today = () => new Date().toISOString().slice(0, 10);

function CardapiosPage() {
  const { data: session } = useAuth();
  const queryClient = useQueryClient();

  const [residentId, setResidentId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
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

  const { data: menus, isLoading } = useQuery({
    queryKey: ["menus", residentId],
    enabled: Boolean(residentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMenu = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão expirada.");
      const { data, error } = await supabase
        .from("menus")
        .insert({
          resident_id: residentId,
          title: `Cardápio de ${formatDate(today())}`,
          menu_date: today(),
          author_id: session.userId,
          data: { entries: [] },
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["menus", residentId] });
      setOpenId(id);
      toast.success("Cardápio criado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMenu = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menus").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["menus", residentId] });
      setPendingDelete(null);
      toast.success("Cardápio excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resident = useMemo(
    () => residents?.find((r) => r.id === residentId) ?? null,
    [residents, residentId],
  );

  const openMenu = useMemo(() => menus?.find((m) => m.id === openId) ?? null, [menus, openId]);

  if (session && !canAccessMenus(session)) {
    return (
      <div className="animate-rise mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Utensils className="size-5" />
        </span>
        <h1 className="font-display mt-4 text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A aba Cardápios é exclusiva da especialidade Nutrição, das contas Administrador e da coordenação
          técnica responsável pela Nutrição.
        </p>
      </div>
    );
  }

  if (openMenu && resident) {
    return (
      <MenuEditor
        menu={openMenu}
        resident={resident}
        residentName={resident.full_name}
        canEdit={openMenu.author_id === session?.userId || Boolean(session?.isMaster)}
        onBack={() => setOpenId(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["menus", residentId] })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Utensils className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Cardápios e cálculo calórico</h1>
            <p className="text-sm text-muted-foreground">
              Selecione o residente, monte o cardápio por refeição e acompanhe energia, macro e
              micronutrientes.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Residente</Label>
            <Select value={residentId} onValueChange={(v) => { setResidentId(v); setOpenId(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o residente" />
              </SelectTrigger>
              <SelectContent>
                {(residents ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!residentId || createMenu.isPending}
            onClick={() => createMenu.mutate()}
          >
            <Plus className="mr-1 size-4" /> Novo cardápio
          </Button>
        </div>
      </div>

      {!residentId ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Escolha um residente para ver e criar cardápios.
        </p>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (menus ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum cardápio registrado para {resident?.full_name}.
        </p>
      ) : (
        <ul className="space-y-3">
          {(menus ?? []).map((menu) => {
            const entries = asCalorieValue(menu.data).entries;
            const mine = menu.author_id === session?.userId || session?.isMaster;
            return (
              <li
                key={menu.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div>
                  <p className="font-display font-semibold">{menu.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(menu.menu_date)} · {entries.length} item(ns)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{entries.length ? "Em uso" : "Vazio"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(menu.id)}>
                    Abrir
                  </Button>
                  {mine ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir cardápio"
                      onClick={() => setPendingDelete({ id: menu.id, title: menu.title })}
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

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cardápio?</AlertDialogTitle>
            <AlertDialogDescription>
              O cardápio “{pendingDelete?.title}” será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && removeMenu.mutate(pendingDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type MenuRow = {
  id: string;
  title: string;
  menu_date: string | null;
  notes: string | null;
  data: unknown;
  author_id: string;
};

function MenuEditor({
  menu,
  resident,
  residentName,
  canEdit,
  onBack,
  onSaved,
}: {
  menu: MenuRow;
  resident: { birth_date: string | null; sex: string | null };
  residentName: string;
  canEdit: boolean;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(menu.title);
  const [menuDate, setMenuDate] = useState(menu.menu_date ?? "");
  const [notes, setNotes] = useState(menu.notes ?? "");
  const [entries, setEntries] = useState<CalorieEntry[]>(asCalorieValue(menu.data).entries);
  const [energy, setEnergy] = useState<EnergyInput>(() => {
    const stored = asEnergyInput((menu.data as { energy?: unknown } | null)?.energy);
    const age = ageFromBirthDate(resident.birth_date);
    const sex = resident.sex?.toUpperCase().startsWith("M") ? "M" : "F";
    return {
      ...stored,
      age: stored.age && stored.age !== DEFAULT_ENERGY.age ? stored.age : (age ?? stored.age),
      sex: (menu.data as { energy?: unknown } | null)?.energy ? stored.sex : sex,
    };
  });

  const offered = useMemo(() => sumEntries(entries), [entries]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("menus")
        .update({
          title: title.trim() || "Cardápio",
          menu_date: menuDate || null,
          notes,
          data: { entries, energy } as unknown as never,
        })
        .eq("id", menu.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Cardápio salvo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Voltar
        </Button>
        {canEdit ? (
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            <Save className="mr-1 size-4" /> Salvar cardápio
          </Button>
        ) : (
          <Badge variant="secondary">Somente leitura</Badge>
        )}
      </div>

      <header className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h1 className="font-display text-xl font-semibold">{residentName}</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Título do cardápio</Label>
            <Input value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={menuDate}
              disabled={!canEdit}
              onChange={(e) => setMenuDate(e.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
        <EnergyNeedsField
          value={energy}
          onChange={setEnergy}
          readOnly={!canEdit}
          offeredKcal={offered.kcal}
          offeredProtein={offered.protein}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
        <CalorieCalculatorField
          label="Cardápio e cálculo calórico"
          hint="Busque o alimento, ajuste a quantidade em gramas e adicione à refeição correspondente."
          readOnly={!canEdit}
          value={{ entries }}
          onChange={(next) => setEntries(next.entries)}
        />
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <Label>Observações sobre a adequação calórica e prescrição dietética</Label>
        <Textarea
          rows={4}
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>
    </div>
  );
}
