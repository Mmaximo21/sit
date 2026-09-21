import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { createMasterAccount, masterExists } from "@/lib/admin.functions";
import { usernameToEmail } from "@/lib/specialties";
import { User, Lock, Eye, EyeOff, Loader2, ShieldCheck, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hyper4DCanvas } from "@/components/login/Hyper4DCanvas";
import ilpiSymbol from "@/assets/ilpi-symbol.png";
import prefeituraLogo from "@/assets/prefeitura-angra.png";
import igedesLogo from "@/assets/igedes.png";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const raw = s["next"];
    // Validação estrita contra Open Redirect: deve ser relativo, sem barras duplas ou invertidas
    const isSafePath =
      typeof raw === "string" &&
      raw.startsWith("/") &&
      !raw.startsWith("//") &&
      !raw.includes("\\") &&
      /^\/[a-zA-Z0-9_\-/?#=&%.:]*$/.test(raw);
    return isSafePath ? { next: raw } : {};
  },

  head: () => ({
    meta: [
      { title: "Sistema Interno — I.L.P.I Luiza Olindina da Silva Alves" },
      {
        name: "description",
        content:
          "Sistema Interno da I.L.P.I Luiza Olindina da Silva Alves: acesso restrito aos profissionais para avaliações, exames, cardápios e relatórios de plantão.",
      },
      { property: "og:title", content: "Sistema Interno — I.L.P.I Luiza Olindina da Silva Alves" },
      {
        property: "og:description",
        content:
          "Acesso individual por especialidade, com prazos, conferência e documentos padronizados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const queryClient = useQueryClient();
  const checkMaster = useServerFn(masterExists);
  const createMaster = useServerFn(createMasterAccount);

  const { data: masterState, isLoading } = useQuery({
    queryKey: ["master-exists"],
    queryFn: () => checkMaster(),
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [shockwaveCount, setShockwaveCount] = useState(0);
  const [rawPointer, setRawPointer] = useState({ x: 0, y: 0 });

  const setupMode = masterState?.exists === false;

  // Temporizador de bloqueio por força bruta
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (lockoutSeconds > 0) {
      toast.error(`Acesso bloqueado por segurança. Aguarde ${lockoutSeconds}s.`);
      return;
    }

    setShockwaveCount((c) => c + 1);
    setBusy(true);

    const safeUsername = username.trim();
    const safeFullName = fullName.trim();

    try {
      if (setupMode) {
        await createMaster({ data: { username: safeUsername, password, fullName: safeFullName } });
        toast.success("Administrador criado. Entrando…");
        await queryClient.invalidateQueries({ queryKey: ["master-exists"] });
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(safeUsername),
        password,
      });
      if (error) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          throw new Error(
            "Múltiplas tentativas inválidas. Acesso temporariamente suspenso por 30 segundos.",
          );
        }
        throw new Error("Usuário ou senha incorretos.");
      }
      setFailedAttempts(0);
      await queryClient.invalidateQueries();
      if (next) {
        window.location.href = next;
        return;
      }
      navigate({ to: "/painel" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  const fieldShell =
    "flex h-12 items-stretch overflow-hidden rounded-md border border-white/10 bg-login-field-deep/90 shadow-inner transition-all focus-within:border-login-teal/60 focus-within:ring-2 focus-within:ring-login-teal/25";
  const fieldIcon =
    "grid w-12 shrink-0 place-items-center bg-login-field text-login-mist/90 border-r border-white/10";
  const fieldInput =
    "h-full w-full bg-transparent px-3.5 text-sm text-login-ink placeholder:text-login-mist/45 focus:outline-none";

  /* Profundidade 3D acompanhando o cursor */
  const reduce = useReducedMotion();
  const spring = { stiffness: 120, damping: 19, mass: 0.5 };
  const pointerX = useSpring(useMotionValue(0), spring);
  const pointerY = useSpring(useMotionValue(0), spring);
  const rotateY = useTransform(pointerX, (v) => v * 18);
  const rotateX = useTransform(pointerY, (v) => v * -14);
  const cardTransform = useMotionTemplate`perspective(1400px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  const glareX = useTransform(pointerX, (v) => `${50 + v * 60}%`);
  const glareY = useTransform(pointerY, (v) => `${50 + v * 60}%`);
  const glare = useMotionTemplate`radial-gradient(60% 60% at ${glareX} ${glareY}, rgba(255,255,255,0.18), transparent 70%)`;

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-login-bg select-none"
      onPointerMove={(event) => {
        if (reduce) return;
        const normX = event.clientX / window.innerWidth - 0.5;
        const normY = event.clientY / window.innerHeight - 0.5;
        pointerX.set(normX);
        pointerY.set(normY);
        setRawPointer({ x: normX, y: normY });
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
        setRawPointer({ x: 0, y: 0 });
      }}
    >
      {/* Motor 4D & 3D Interativo: Hipercubo, partículas espaçotemporais e ondas de choque */}
      <Hyper4DCanvas
        pointerX={rawPointer.x}
        pointerY={rawPointer.y}
        reducedMotion={Boolean(reduce)}
        triggerShockwave={shockwaveCount}
      />

      {/* Brilhos volumétricos de profundidade */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(47,216,182,0.14),transparent_65%),radial-gradient(60%_50%_at_100%_100%,rgba(18,143,122,0.18),transparent_65%),radial-gradient(50%_40%_at_0%_100%,rgba(53,224,192,0.12),transparent_60%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-login-abyss/80"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 [perspective:1400px]">
        {/* Card de acesso em 3D realista */}
        <motion.form
          onSubmit={handleSubmit}
          initial={reduce ? false : { opacity: 0, y: 34, rotateX: -14, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          style={reduce ? {} : { transform: cardTransform, transformStyle: "preserve-3d" }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-login-card/60 via-login-teal-deep/40 to-login-field/50 p-8 shadow-[0_50px_120px_-25px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-10"
        >
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-login-teal/90 to-transparent"
            aria-hidden="true"
          />
          {/* Reflexo especular que acompanha o cursor */}
          <motion.span
            style={reduce ? {} : { background: glare }}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          />

          {/* Cabeçalho projetado em Z */}
          <div
            className="mb-8 flex flex-col items-center text-center transition-transform"
            style={{ transform: reduce ? undefined : "translateZ(36px)" }}
          >
            <div className="relative mb-5">
              <span
                className="absolute -inset-1 rounded-2xl bg-login-teal/30 blur-md"
                aria-hidden="true"
              />
              <img
                src={ilpiSymbol}
                alt="Símbolo da ILPI Luiza Olindina da Silva Alves"
                className="relative size-16 rounded-2xl bg-white/95 p-1.5 shadow-xl ring-1 ring-white/40"
              />
            </div>
            <h1 className="font-display text-xl font-semibold uppercase tracking-[0.32em] text-login-ink sm:text-2xl">
              Sistema Interno
            </h1>
            <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-login-ink/75">
              I.L.P.I — Luiza Olindina da Silva Alves
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-login-ink">
              <ShieldCheck className="size-3 text-login-teal" /> Instituição Acreditada ONA
            </p>
          </div>

          {/* Aviso de bloqueio por tentativas excessivas */}
          {lockoutSeconds > 0 ? (
            <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/20 p-3 text-center text-xs text-login-ink">
              Tentativas excessivas. Acesso bloqueado por segurança. Tente novamente em{" "}
              <span className="font-bold text-login-teal">{lockoutSeconds}s</span>.
            </div>
          ) : null}

          {/* Campos em plano Z intermediário */}
          <div
            className="space-y-4 transition-transform"
            style={{ transform: reduce ? undefined : "translateZ(20px)" }}
          >
            {setupMode ? (
              <div className={fieldShell}>
                <span className={fieldIcon}>
                  <ShieldCheck className="size-4 text-login-teal" />
                </span>
                <input
                  aria-label="Nome completo"
                  className={fieldInput}
                  placeholder="Nome completo do Administrador"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={lockoutSeconds > 0}
                  required
                />
              </div>
            ) : null}

            <div className={fieldShell}>
              <span className={fieldIcon}>
                <User className="size-4" />
              </span>
              <input
                aria-label="Usuário"
                autoComplete="username"
                className={fieldInput}
                placeholder="Usuário institucional"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={lockoutSeconds > 0}
                required
              />
            </div>

            <div className={fieldShell}>
              <span className={fieldIcon}>
                <Lock className="size-4" />
              </span>
              <input
                aria-label="Senha"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={fieldInput}
                placeholder="Senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={lockoutSeconds > 0}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="h-full w-11 shrink-0 rounded-none border-l border-white/10 text-login-mist/70 hover:bg-white/5 hover:text-login-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>

            {/* Botão de envio em plano Z destacado com elevação tátil */}
            <div style={{ transform: reduce ? undefined : "translateZ(32px)" }}>
              <Button
                type="submit"
                disabled={busy || isLoading || lockoutSeconds > 0}
                className="group relative h-12 w-full overflow-hidden rounded-xl bg-login-ink text-sm font-bold uppercase tracking-[0.28em] text-login-field-deep shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-2xl hover:shadow-login-teal/30 active:translate-y-0"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Entrando…
                  </>
                ) : setupMode ? (
                  <>
                    <ShieldCheck className="size-4" /> Cadastrar e entrar
                  </>
                ) : (
                  <>
                    Entrar{" "}
                    <LogIn className="size-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>

            <p className="pt-1 text-center text-xs text-login-ink/75">
              Esqueceu a senha?{" "}
              <span className="font-semibold text-login-ink underline decoration-login-teal/60 underline-offset-2">
                Solicite ao Administrador
              </span>
            </p>

            {setupMode ? null : (
              <>
                <div className="flex items-center gap-3 pt-2" aria-hidden="true">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/25" />
                  <span className="size-1.5 rotate-45 bg-login-teal" />
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/25" />
                </div>
                <p className="pb-1 text-center text-[10px] uppercase tracking-[0.26em] text-login-ink/60">
                  Acesso restrito a profissionais autorizados
                </p>
              </>
            )}
          </div>
        </motion.form>

        {/* Rodapé institucional */}
        <div className="mt-8 flex animate-rise animate-delay-200 flex-wrap items-center justify-center gap-3">
          <img
            src={prefeituraLogo}
            alt="Prefeitura Municipal de Angra dos Reis"
            className="h-8 rounded-md bg-white/95 px-2.5 py-1 opacity-90 shadow-md transition-opacity hover:opacity-100"
          />
          <img
            src={igedesLogo}
            alt="IGEDES — Instituto de Gestão e Desenvolvimento"
            className="h-8 rounded-md bg-white/95 px-2.5 py-1 opacity-90 shadow-md transition-opacity hover:opacity-100"
          />
        </div>
        <p className="mt-4 animate-rise animate-delay-200 text-center text-[10px] uppercase tracking-[0.26em] text-login-ink/60">
          Criado e estruturado por Matheus Máximo
        </p>
      </div>
    </div>
  );
}
