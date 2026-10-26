'use client';

/**
 * Dead Drop — shared typewriter text (M3 W4 art pass).
 * Char-by-char reveal with the block caret; honors prefers-reduced-motion
 * by rendering instantly. Purely presentational. State transitions are
 * deferred through timeouts (never synchronous in the effect body).
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  /** ms per character */
  speed?: number;
  delay?: number;
  className?: string;
  onDone?: () => void;
}

export default function Typed({ text, speed = 18, delay = 0, className, onDone }: Props) {
  const [n, setN] = useState(0);
  const [started, setStarted] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setStarted(true), reduced.current ? 0 : delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (n >= text.length) {
      onDone?.();
      return;
    }
    const step = reduced.current ? Math.max(text.length, 1) : 1;
    const t = setTimeout(
      () => setN((v) => Math.min(text.length, v + step)),
      reduced.current ? 0 : speed,
    );
    return () => clearTimeout(t);
  }, [started, n, text, speed, onDone]);

  const done = n >= text.length;
  return (
    <span className={`${className ?? ''} ${done ? '' : 'caret'}`}>
      {text.slice(0, n)}
    </span>
  );
}
