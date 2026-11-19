import { useEffect, useState } from 'react';
import type { Sale } from '../types/sale';
import { getEndingSoonInfo } from '../utils/format';

// Shared 30-second clock so multiple visible cards reuse a single interval timer.
type Listener = (now: Date) => void;
const listeners = new Set<Listener>();
let sharedTimer: ReturnType<typeof setInterval> | null = null;

function notifyClock(): void {
  const now = new Date();
  listeners.forEach((fn) => fn(now));
}

function onVisibilityChange(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    notifyClock();
  }
}

function subscribeClock(listener: Listener): () => void {
  listeners.add(listener);
  if (!sharedTimer) {
    sharedTimer = setInterval(notifyClock, 30_000);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && sharedTimer) {
      clearInterval(sharedTimer);
      sharedTimer = null;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    }
  };
}

function useLiveNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => subscribeClock(setNow), []);
  return now;
}

export function EndingSoonBadge({
  s,
}: {
  s: Pick<Sale, 'date' | 'start' | 'end'>;
}) {
  const now = useLiveNow();
  const info = getEndingSoonInfo(s, now);
  if (!info) return null;

  return (
    <span
      className={`ending-soon-badge${info.urgent ? ' is-urgent' : ''}`}
      title={info.label}
      aria-label={info.label}
    >
      <span className="ending-soon-badge-dot" aria-hidden="true" />
      <span className="ending-soon-badge-txt">{info.tag}</span>
    </span>
  );
}

export function EndingSoonBanner({
  s,
}: {
  s: Pick<Sale, 'date' | 'start' | 'end'>;
}) {
  const now = useLiveNow();
  const info = getEndingSoonInfo(s, now);
  if (!info) return null;

  return (
    <div
      className={`details-ending-soon${info.urgent ? ' is-urgent' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="details-ending-main">
        <span className="details-ending-dot" aria-hidden="true" />
        <svg
          width="14"
          height="14"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          className="details-ending-ic"
        >
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M9 5.2V9l2.6 1.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="details-ending-copy">
          <b>{info.label}</b>
        </span>
      </span>
      <span className="details-ending-badge">{info.tag}</span>
    </div>
  );
}
