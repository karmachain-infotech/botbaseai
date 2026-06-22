import { useState, useEffect, useRef } from "react";

export function useTypewriter(fullText: string, speed = 25) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!fullText) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    indexRef.current = 0;
    setDisplayedText("");
    setIsTyping(true);

    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current <= fullText.length) {
        setDisplayedText(fullText.slice(0, indexRef.current));
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [fullText, speed]);

  return { displayedText, isTyping };
}
