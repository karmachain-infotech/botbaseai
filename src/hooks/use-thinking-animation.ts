import { useState, useEffect } from "react";

export function useThinkingAnimation(active: boolean) {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setDotCount(0);
      return;
    }
    setDotCount(1);
    const interval = setInterval(() => {
      setDotCount((prev) => (prev < 3 ? prev + 1 : 1));
    }, 400);
    return () => clearInterval(interval);
  }, [active]);

  return ".".repeat(dotCount);
}
