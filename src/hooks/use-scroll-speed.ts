import { useRef, useEffect, useState } from "react";

export function useScrollSpeed(): number {
  const [speed, setSpeed] = useState(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const now = performance.now();
      const dt = now - lastTime.current;
      if (dt < 50) return;
      const dy = window.scrollY - lastY.current;
      const s = Math.abs(dy / dt);
      lastY.current = window.scrollY;
      lastTime.current = now;
      setSpeed(s);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return speed;
}
