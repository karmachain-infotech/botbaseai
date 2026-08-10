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

    const c = canvas;
    const context = ctx;

    let animationId: number;

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const shapes = Array.from({ length: 4 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      size: 40 + Math.random() * 80,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      type: Math.random() > 0.5 ? "circle" : "hexagon",
    }));

    function drawShape(s: (typeof shapes)[0]) {
      context.save();
      context.translate(s.x, s.y);
      context.rotate((s.rotation * Math.PI) / 180);
      context.strokeStyle = "oklch(0.62 0.2 285 / 0.12)";
      context.lineWidth = 1.5;

      if (s.type === "circle") {
        context.beginPath();
        context.arc(0, 0, s.size / 2, 0, Math.PI * 2);
        context.stroke();
      } else {
        const sides = 6;
        const radius = s.size / 2;
        context.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const px = radius * Math.cos(angle);
          const py = radius * Math.sin(angle);
          if (i === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.stroke();
      }

      context.restore();
    }

    function animate() {
      context.clearRect(0, 0, c.width, c.height);

      for (const s of shapes) {
        s.x += s.speedX;
        s.y += s.speedY;
        s.rotation += s.rotationSpeed;

        if (s.x < -s.size) s.x = c.width + s.size;
        if (s.x > c.width + s.size) s.x = -s.size;
        if (s.y < -s.size) s.y = c.height + s.size;
        if (s.y > c.height + s.size) s.y = -s.size;

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
