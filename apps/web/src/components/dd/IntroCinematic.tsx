'use client';

/**
 * Dead Drop — cold-open intro (M3 W4 art pass).
 * Plays ONCE per device (localStorage flag), skippable with a click.
 * The rainy city, three typewriter lines, then the bureau door opens.
 * Purely presentational — the setup screen renders underneath.
 */
import { useCallback, useEffect, useState } from 'react';
import Typed from '@/components/dd/Typed';

const FLAG = 'dd.m3w4.intro.v1';

const LINES = [
  'The city never sleeps. It just changes couriers.',
  'Two dead drops went live this week. In eight days a gate opens — and everything in those folders leaves this city forever.',
  'The rules publish scraps: a district here, a transit class there. The rest is fog, rain, and nerve.',
  'Follow the paper. Trust nothing else.',
];

export default function IntroCinematic() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    // Deferred (not synchronous) — a timing flag, not render-critical state.
    const t = setTimeout(() => {
      setMounted(true);
      try {
        if (!window.localStorage.getItem(FLAG)) setOpen(true);
      } catch {
        /* private mode — skip the intro entirely */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  const next = useCallback(() => {
    if (line < LINES.length - 1) setLine((v) => v + 1);
    else close();
  }, [line, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, close]);

  if (!mounted || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] cursor-pointer overflow-hidden bg-ink"
      onClick={next}
      role="dialog"
      aria-modal
      aria-label="Story intro — click to continue"
    >
      {/* the city, breathing */}
      <div className="absolute inset-0" style={{ animation: 'fade-up 1.2s ease-out both' }}>
        <img
          src="/art/title-city.png"
          alt=""
          className="art h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
        <div className="rain absolute inset-0 opacity-70" />
      </div>

      {/* narrative */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-14 sm:pb-20">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="font-pixel text-[10px] leading-relaxed text-amber/90 [text-shadow:0_0_14px_rgba(232,163,61,.4)]">
            DEAD DROP
          </div>
          <div className="min-h-[7.5rem] sm:min-h-[6.5rem]">
            {LINES.slice(0, line + 1).map((l, i) => (
              <p
                key={i}
                className="mb-3 font-type text-[15px] leading-relaxed text-paper sm:text-lg"
                style={{ opacity: i === line ? 1 : 0.45 }}
              >
                {i === line ? (
                  <Typed text={l} speed={22} onDone={undefined} />
                ) : (
                  l
                )}
              </p>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-term text-base text-fog-2">
              {line < LINES.length - 1 ? '▼ click / space' : ''}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="stamp border-blood text-blood"
            >
              skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
