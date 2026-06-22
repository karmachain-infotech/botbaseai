import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export function FloatingShapes() {
  const prefersReduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const shapes = Array.from({ length: 4 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 40 + Math.random() * 80,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      type: Math.random() > 0.5 ? "circle" : "hexagon",
    }));

    function drawShape(
      s: typeof shapes[0],
    ) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.strokeStyle = "oklch(0.62 0.2 285 / 0.12)";
      ctx.lineWidth = 1.5;

      if (s.type === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const sides = 6;
        const radius = s.size / 2;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const px = radius * Math.cos(angle);
          const py = radius * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of shapes) {
        s.x += s.speedX;
        s.y += s.speedY;
        s.rotation += s.rotationSpeed;

        if (s.x < -s.size) s.x = canvas.width + s.size;
        if (s.x > canvas.width + s.size) s.x = -s.size;
        if (s.y < -s.size) s.y = canvas.height + s.size;
        if (s.y > canvas.height + s.size) s.y = -s.size;

        drawShape(s);
      }

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
