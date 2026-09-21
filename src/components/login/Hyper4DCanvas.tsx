import { useEffect, useRef } from "react";

type Vertex4D = [number, number, number, number];

// 16 vértices do hipercubo 4D (Tesseract)
const TESSERACT_VERTICES: Vertex4D[] = [];
for (let x = -1; x <= 1; x += 2) {
  for (let y = -1; y <= 1; y += 2) {
    for (let z = -1; z <= 1; z += 2) {
      for (let w = -1; w <= 1; w += 2) {
        TESSERACT_VERTICES.push([x, y, z, w]);
      }
    }
  }
}

// 32 arestas conectando vértices que diferem em exatamente 1 coordenada
const TESSERACT_EDGES: [number, number][] = [];
for (let i = 0; i < 16; i++) {
  for (let j = i + 1; j < 16; j++) {
    const v1 = TESSERACT_VERTICES[i]!;
    const v2 = TESSERACT_VERTICES[j]!;
    let diffs = 0;
    for (let k = 0; k < 4; k++) {
      if (v1[k] !== v2[k]) diffs++;
    }
    if (diffs === 1) {
      TESSERACT_EDGES.push([i, j]);
    }
  }
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  baseAlpha: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function Hyper4DCanvas({
  pointerX,
  pointerY,
  reducedMotion = false,
  triggerShockwave = 0,
}: {
  pointerX: number;
  pointerY: number;
  reducedMotion?: boolean;
  triggerShockwave?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lastTriggerRef = useRef(triggerShockwave);

  // Gatilho de onda de choque quando acionado externamente (ex: submit)
  useEffect(() => {
    if (triggerShockwave > lastTriggerRef.current) {
      lastTriggerRef.current = triggerShockwave;
      const canvas = canvasRef.current;
      if (canvas) {
        shockwavesRef.current.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          radius: 10,
          maxRadius: Math.max(canvas.width, canvas.height) * 0.7,
          alpha: 0.9,
        });
      }
    }
  }, [triggerShockwave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Inicializar partículas 3D no volume
    const PARTICLE_COUNT = 90;
    const particles: Particle3D[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 1400,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 800 + 100,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 2.2 + 0.8,
        baseAlpha: Math.random() * 0.5 + 0.25,
      });
    }

    let angleXZ = 0;
    let angleYW = 0;
    let angleXW = 0;

    let targetAngleXZ = 0;
    let targetAngleYW = 0;

    const render = () => {
      // Se aba oculta, pausar computação pesada
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Atualizar rotações quadridimensionais
      if (!reducedMotion) {
        targetAngleXZ += 0.0035 + pointerX * 0.02;
        targetAngleYW += 0.0028 + pointerY * 0.02;
        angleXZ += (targetAngleXZ - angleXZ) * 0.1;
        angleYW += (targetAngleYW - angleYW) * 0.1;
        angleXW += 0.002;
      }

      const cosXZ = Math.cos(angleXZ);
      const sinXZ = Math.sin(angleXZ);
      const cosYW = Math.cos(angleYW);
      const sinYW = Math.sin(angleYW);
      const cosXW = Math.cos(angleXW);
      const sinXW = Math.sin(angleXW);

      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const tesseractScale = Math.min(width, height) * 0.65;

      // 1. Renderizar partículas 3D de fundo (Constelação Espaçotemporal)
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;

        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;

          // Gravidade do ponteiro
          const dx = pointerX * width * 0.4 - p.x;
          const dy = pointerY * height * 0.4 - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && dist < 450) {
            p.x += (dx / dist) * 0.45;
            p.y += (dy / dist) * 0.45;
          }

          if (p.x < -width) p.x = width;
          if (p.x > width) p.x = -width;
          if (p.y < -height) p.y = height;
          if (p.y > height) p.y = -height;
          if (p.z < 100) p.z = 900;
          if (p.z > 900) p.z = 100;
        }

        const fov = 450;
        const scale = fov / (fov + p.z);
        const px = p.x * scale + centerX;
        const py = p.y * scale + centerY;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const alpha = p.baseAlpha * scale * 0.85;
          ctx.fillStyle = `rgba(53, 224, 192, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
          ctx.fill();

          // Filamentos entre partículas próximas
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j]!;
            const d = Math.hypot(p.x - p2.x, p.y - p2.y, p.z - p2.z);
            if (d < 110) {
              const lineAlpha = (1 - d / 110) * 0.18 * scale;
              ctx.strokeStyle = `rgba(47, 216, 182, ${lineAlpha})`;
              const scale2 = fov / (fov + p2.z);
              const p2x = p2.x * scale2 + centerX;
              const p2y = p2.y * scale2 + centerY;
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(p2x, p2y);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Projeção e renderização do Hipercubo 4D (Tesseract)
      const projected2D: { x: number; y: number; z: number; w: number; depth: number }[] = [];

      for (let i = 0; i < TESSERACT_VERTICES.length; i++) {
        const [vx, vy, vz, vw] = TESSERACT_VERTICES[i]!;

        // Rotação no plano XZ
        let x1 = vx * cosXZ - vz * sinXZ;
        const z1 = vx * sinXZ + vz * cosXZ;

        // Rotação no plano YW
        const y2 = vy * cosYW - vw * sinYW;
        let w2 = vy * sinYW + vw * cosYW;

        // Rotação no plano XW (interdimensional)
        const x3 = x1 * cosXW - w2 * sinXW;
        w2 = x1 * sinXW + w2 * cosXW;
        x1 = x3;

        // Projeção 4D -> 3D
        const distance4D = 2.4;
        const wFactor = 1 / (distance4D - w2);
        const x3D = x1 * wFactor;
        const y3D = y2 * wFactor;
        const z3D = z1 * wFactor;

        // Projeção 3D -> 2D
        const distance3D = 3.2;
        const zFactor = 1 / (distance3D - z3D);
        const screenX = x3D * zFactor * tesseractScale + centerX;
        const screenY = y3D * zFactor * tesseractScale + centerY;

        projected2D.push({
          x: screenX,
          y: screenY,
          z: z3D,
          w: w2,
          depth: zFactor * wFactor,
        });
      }

      // Renderizar arestas do tesseract
      for (let i = 0; i < TESSERACT_EDGES.length; i++) {
        const [fromIdx, toIdx] = TESSERACT_EDGES[i]!;
        const p1 = projected2D[fromIdx]!;
        const p2 = projected2D[toIdx]!;

        const avgW = (p1.w + p2.w) * 0.5;
        const avgDepth = (p1.depth + p2.depth) * 0.5;

        // Efeito cromático da 4ª dimensão:
        // W positivo brilha em ciano-esmeralda vivo; W negativo em azul-turquesa profundo
        const brightness = (avgW + 1.2) * 0.45;
        const alpha = Math.min(0.65, Math.max(0.12, brightness * avgDepth * 2.8));

        ctx.strokeStyle = `rgba(53, 224, 192, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, avgDepth * 4.2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Renderizar vértices luminosos do tesseract
      for (let i = 0; i < projected2D.length; i++) {
        const p = projected2D[i]!;
        const nodeAlpha = Math.min(0.95, Math.max(0.2, (p.w + 1.3) * 0.5 * p.depth * 3.2));
        const nodeRadius = Math.max(1.8, p.depth * 7.5);

        // Brilho difuso em volta do nó
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, nodeRadius * 2.5);
        grad.addColorStop(0, `rgba(79, 240, 207, ${nodeAlpha})`);
        grad.addColorStop(0.5, `rgba(47, 216, 182, ${nodeAlpha * 0.4})`);
        grad.addColorStop(1, "rgba(47, 216, 182, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Ponto central
        ctx.fillStyle = `rgba(255, 255, 255, ${nodeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.2, nodeRadius * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Renderizar Ondas de Choque Interdimensionais
      if (shockwavesRef.current.length > 0) {
        for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
          const sw = shockwavesRef.current[i]!;
          sw.radius += (sw.maxRadius - sw.radius) * 0.08 + 1.5;
          sw.alpha *= 0.94;

          ctx.save();
          ctx.strokeStyle = `rgba(79, 240, 207, ${sw.alpha})`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "rgba(79, 240, 207, 0.8)";
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          if (sw.alpha < 0.01 || sw.radius >= sw.maxRadius * 0.98) {
            shockwavesRef.current.splice(i, 1);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [pointerX, pointerY, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full"
      style={{ filter: "drop-shadow(0 0 16px rgba(47, 216, 182, 0.12))" }}
      aria-hidden="true"
    />
  );
}
