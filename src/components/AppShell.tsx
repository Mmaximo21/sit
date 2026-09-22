import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { canAccessTab, type TabKey } from "@/lib/tabs";
import { NoticeBanner } from "@/components/NoticeBanner";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";
import {
  BookOpenCheck,
  LogOut,
  ClipboardList,
  NotebookPen,
  Users,
  CalendarClock,
  CalendarDays,
  ShieldCheck,
  Settings2,
  FlaskConical,
  Utensils,
  ClipboardCheck,
  Stethoscope,
  Activity,
  KeyRound,
  HeartPulse,
  Megaphone,
  Moon,
  Sun,
  Monitor,
  DoorOpen,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = { key: TabKey; to: string; label: string; icon: ReactNode };
type NavGroup = { label: string; icon: ReactNode; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Avaliações",
    icon: <ClipboardList className="size-4" />,
    items: [
      {
        key: "painel",
        to: "/painel",
        label: "Avaliações",
        icon: <ClipboardList className="size-4" />,
      },
      { key: "pia", to: "/pia", label: "PIA", icon: <NotebookPen className="size-4" /> },
      { key: "exames", to: "/exames", label: "Exames", icon: <FlaskConical className="size-4" /> },
      {
        key: "cardapios",
        to: "/cardapios",
        label: "Cardápios",
        icon: <Utensils className="size-4" />,
      },
    ],
  },
  {
    label: "Assistência",
    icon: <HeartPulse className="size-4" />,
    items: [
      {
        key: "censo",
        to: "/censo",
        label: "Censo de Enfermagem",
        icon: <Stethoscope className="size-4" />,
      },
      { key: "news", to: "/news", label: "Escala NEWS", icon: <Activity className="size-4" /> },
      {
        key: "plantao",
        to: "/plantao",
        label: "Relatório de Plantão",
        icon: <ClipboardCheck className="size-4" />,
      },
    ],
  },
  {
    label: "Saídas",
    icon: <DoorOpen className="size-4" />,
    items: [
      { key: "saidas", to: "/saidas", label: "Saídas", icon: <DoorOpen className="size-4" /> },
    ],
  },
  {
    label: "Escalas",
    icon: <CalendarDays className="size-4" />,
    items: [
      {
        key: "escala",
        to: "/escala",
        label: "Escala de Trabalho",
        icon: <CalendarDays className="size-4" />,
      },
      {
        key: "escala_enfermagem",
        to: "/escala-enfermagem",
        label: "Escala de Enfermagem",
        icon: <Stethoscope className="size-4" />,
      },
      {
        key: "escala_administrativa",
        to: "/escala-administrativa",
        label: "Escala Administrativa",
        icon: <ClipboardCheck className="size-4" />,
      },
      {
        key: "escala_tecnica",
        to: "/escala-tecnica",
        label: "Escala Técnica",
        icon: <Activity className="size-4" />,
      },
    ],
  },
  {
    label: "Protocolos",
    icon: <BookOpenCheck className="size-4" />,
    items: [
      {
        key: "chat",
        to: "/chat",
        label: "Central de Protocolos",
        icon: <BookOpenCheck className="size-4" />,
      },
    ],
  },
  {
    label: "Administração",
    icon: <Settings2 className="size-4" />,
    items: [
      { key: "usuarios", to: "/usuarios", label: "Usuários", icon: <Users className="size-4" /> },
      {
        key: "periodos",
        to: "/periodos",
        label: "Prazos",
        icon: <CalendarClock className="size-4" />,
      },
      {
        key: "permissoes",
        to: "/permissoes",
        label: "Permissões",
        icon: <KeyRound className="size-4" />,
      },
      { key: "avisos", to: "/avisos", label: "Avisos", icon: <Megaphone className="size-4" /> },
      {
        key: "admin",
        to: "/admin",
        label: "Administração",
        icon: <Settings2 className="size-4" />,
      },
    ],
  },
];

const SPRING = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.6 };

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // Desktop sidebar collapse state with persistence
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app_sidebar_collapsed") === "true";
    }
    return false;
  });

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("app_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const offline = useOfflineStatus();
  const can = (key: TabKey) => canAccessTab(session, key);
  const homeLink = can("painel") ? "/painel" : can("plantao") ? "/plantao" : "/exames";

  const roleLabel = session?.isMaster
    ? "Master"
    : session?.isCoordenacao || session?.isCoordinator
      ? "Coordenação"
      : session?.specialty;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative flex min-h-screen bg-background">
        {/* Fundo dinâmico com iluminação sutil */}
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(85%_55%_at_8%_-10%,color-mix(in_oklab,var(--primary)_11%,transparent),transparent_60%),radial-gradient(65%_45%_at_100%_0%,color-mix(in_oklab,var(--accent)_9%,transparent),transparent_60%)]"
          aria-hidden="true"
        />
        <div
          className="bg-grid-soft pointer-events-none fixed inset-x-0 top-0 h-96 opacity-20"
          aria-hidden="true"
        />

        {/* ======================================================== */}
        {/* BARRA LATERAL DESKTOP (STICKY & RESPONSIVA)              */}
        {/* ======================================================== */}
        <aside
          className={`relative z-30 hidden border-r border-border/50 bg-card/75 backdrop-blur-xl transition-[width] duration-300 ease-in-out lg:flex lg:flex-col ${
            collapsed ? "w-20" : "w-64"
          }`}
          style={{ height: "100vh", position: "sticky", top: 0 }}
          aria-label="Menu Lateral Principal"
        >
          {/* Faixa superior sutil da marca */}
          <span
            className="absolute inset-x-0 top-0 h-px bg-gradient-brand opacity-80"
            aria-hidden="true"
          />

          {/* Cabeçalho da Barra Lateral */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-4">
            <BrandMark to={homeLink} collapsed={collapsed} />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          </div>

          {/* Lista de Navegação por Grupos */}
          <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
            <nav className="space-y-6" aria-label="Grupos de navegação">
              {NAV_GROUPS.map((group) => {
                const items = group.items.filter((item) => can(item.key));
                if (items.length === 0) return null;

                return (
                  <div key={group.label} className="space-y-1">
                    {!collapsed ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        <span>{group.label}</span>
                      </div>
                    ) : (
                      <div className="mx-auto my-2 h-px w-6 bg-border/60" />
                    )}

                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const active = pathname.startsWith(item.to);
                        return (
                          <SidebarLink
                            key={item.to}
                            item={item}
                            active={active}
                            collapsed={collapsed}
                            reduceMotion={!!reduceMotion}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Barra Lateral: Usuário & Controles */}
          <div className="shrink-0 border-t border-border/40 bg-background/40 p-3">
            {!collapsed ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/60 p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-brand font-display text-xs font-bold text-primary-foreground ring-1 ring-primary/25">
                      {(session?.fullName || session?.username || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold leading-tight text-foreground">
                        {session?.fullName || session?.username}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] leading-tight text-muted-foreground">
                        {session?.isMaster || session?.isCoordenacao || session?.isCoordinator ? (
                          <ShieldCheck className="size-3 text-primary" />
                        ) : null}
                        <span className="truncate">{roleLabel}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 px-1">
                  <ThemeMenu theme={theme} setTheme={setTheme} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Encerrar sessão"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sair</span>
                  </Button>
                </div>

                <p className="px-1 text-center text-[10px] tracking-wide text-muted-foreground/60">
                  ILPI Santa Ana
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="grid size-9 place-items-center rounded-full bg-gradient-brand font-display text-xs font-bold text-primary-foreground ring-1 ring-primary/25">
                      {(session?.fullName || session?.username || "?").charAt(0).toUpperCase()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-semibold">{session?.fullName || session?.username}</p>
                    <p className="text-muted-foreground">{roleLabel}</p>
                  </TooltipContent>
                </Tooltip>

                <ThemeMenu theme={theme} setTheme={setTheme} />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={signOut}
                      className="size-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Sair"
                    >
                      <LogOut className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair do sistema</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* GAVETA LATERAL MOBILE (SLIDE-OVER DRAWER)                */}
        {/* ======================================================== */}
        <AnimatePresence>
          {mobileOpen ? (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                aria-hidden="true"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menu de Navegação Mobile"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <BrandMark to={homeLink} collapsed={false} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-lg text-muted-foreground"
                    aria-label="Fechar menu"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                  <nav className="space-y-6">
                    {NAV_GROUPS.map((group) => {
                      const items = group.items.filter((item) => can(item.key));
                      if (items.length === 0) return null;

                      return (
                        <div key={group.label} className="space-y-1">
                          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            {group.label}
                          </div>
                          <div className="space-y-0.5">
                            {items.map((item) => {
                              const active = pathname.startsWith(item.to);
                              return (
                                <SidebarLink
                                  key={item.to}
                                  item={item}
                                  active={active}
                                  collapsed={false}
                                  reduceMotion={!!reduceMotion}
                                  onClick={() => setMobileOpen(false)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-border/40 pt-4">
                  <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/40 p-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                      {(session?.fullName || session?.username || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {session?.fullName || session?.username}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <ThemeMenu theme={theme} setTheme={setTheme} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={signOut}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <LogOut className="size-3.5" /> Sair
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* ÁREA DE CONTEÚDO PRINCIPAL                               */}
        {/* ======================================================== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra Superior Mobile */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/40 bg-card/80 px-4 backdrop-blur-md lg:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="size-5" />
              </Button>
              <BrandMark to={homeLink} collapsed={false} />
            </div>

            <div className="flex items-center gap-2">
              <ThemeMenu theme={theme} setTheme={setTheme} />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="size-8 rounded-full text-muted-foreground hover:text-destructive"
                aria-label="Sair"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>

          {/* Banner de status offline */}
          {offline ? (
            <div
              role="status"
              className="relative z-20 flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-center text-xs font-medium text-destructive"
            >
              <WifiOff className="size-4" /> Sem conexão com a internet — os envios e downloads
              ficam indisponíveis até a rede voltar.
            </div>
          ) : null}

          {/* Avisos globais do sistema */}
          <div className="relative pt-4">
            <NoticeBanner />
          </div>

          {/* Conteúdo da página atual */}
          <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Assinatura institucional do rodapé */}
          <footer className="relative mx-auto mt-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <p className="text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Criado e estruturado por Matheus Máximo • ILPI Santa Ana
              </p>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
            </div>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}

/** Item individual da barra lateral com suporte a estado contraído e tooltips */
function SidebarLink({
  item,
  active,
  collapsed,
  reduceMotion,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  reduceMotion: boolean;
  onClick?: () => void;
}) {
  const content = (
    <Link
      to={item.to}
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200 ${
        active
          ? "bg-primary/12 font-semibold text-primary shadow-xs ring-1 ring-primary/20"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <motion.span
        whileHover={reduceMotion ? {} : { scale: 1.08 }}
        whileTap={reduceMotion ? {} : { scale: 0.95 }}
        transition={SPRING}
        className={`grid size-7 shrink-0 place-items-center rounded-lg ring-1 transition-colors duration-200 ${
          active
            ? "bg-primary/20 text-primary ring-primary/30"
            : "bg-muted/50 text-foreground/70 ring-border/50 group-hover:bg-muted group-hover:text-primary"
        }`}
      >
        {item.icon}
      </motion.span>

      {!collapsed ? <span className="truncate">{item.label}</span> : null}

      {/* Indicador de item ativo na lateral esquerda */}
      {active && !collapsed ? (
        <span
          className="absolute right-2 size-1.5 rounded-full bg-primary ring-2 ring-primary/20"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

/** Aviso de rede: o aplicativo instalado exige conexão para gravar e baixar arquivos. */
function useOfflineStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return offline;
}

/** Marca do sistema com leve inclinação 3D acompanhando o cursor. */
function BrandMark({ to, collapsed }: { to: string; collapsed?: boolean }) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const transform = useMotionTemplate`perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5"
      onPointerMove={(event) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 16);
        rotateX.set(((event.clientY - rect.top) / rect.height - 0.5) * -14);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      <motion.span
        style={{ transform }}
        className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-soft ring-1 ring-primary/20"
      >
        <ClipboardList className="size-4" />
        <span
          className="absolute inset-0 rounded-lg bg-[linear-gradient(140deg,color-mix(in_oklab,white_38%,transparent),transparent_55%)] opacity-70"
          aria-hidden="true"
        />
      </motion.span>
      {!collapsed ? (
        <span className="font-display text-sm font-semibold leading-tight tracking-tight">
          Sistema <span className="text-muted-foreground">Interno</span>
        </span>
      ) : null}
    </Link>
  );
}

function ThemeMenu({
  theme,
  setTheme,
}: {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}) {
  const options: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
    { value: "light", label: "Tema claro", icon: <Sun className="size-4" /> },
    { value: "dark", label: "Tema escuro", icon: <Moon className="size-4" /> },
    { value: "system", label: "Tema automático", icon: <Monitor className="size-4" /> },
  ];
  const current = options.find((option) => option.value === theme) ?? {
    value: "system" as const,
    label: "Tema automático",
    icon: <Monitor className="size-4" />,
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          aria-label={current.label}
          title={current.label}
        >
          {current.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className="gap-2 text-xs"
          >
            {option.icon} {option.label}
            {theme === option.value ? (
              <span className="ml-auto size-1.5 rounded-full bg-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
