import { useEffect, useRef, useState } from 'react';
import type { Sale } from '../types/sale';
import { downloadIcs, googleCalUrl, outlookCalUrl } from '../utils/calendar';
import { fmtDate, timeRange } from '../utils/format';
import { Icon } from './Icons';

function CalendarProviderIcon({
  provider,
}: {
  provider: 'google' | 'apple' | 'outlook';
}) {
  if (provider === 'google') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        className="cal-prov-ic"
      >
        <rect x="2" y="3" width="14" height="13" rx="2.5" stroke="#4285F4" strokeWidth="1.6" />
        <path d="M2 7h14" stroke="#EA4335" strokeWidth="1.6" />
        <path d="M6 1.8v2.4M12 1.8v2.4" stroke="#34A853" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="6.2" y="9.6" width="5.6" height="3.2" rx="0.8" fill="#FBBC05" />
      </svg>
    );
  }
  if (provider === 'apple') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        className="cal-prov-ic"
      >
        <rect x="2" y="3" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.8 6.8h12.4" stroke="#ef4444" strokeWidth="2.4" />
        <path d="M6 1.8v2.2M12 1.8v2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="11.4" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="cal-prov-ic"
    >
      <rect x="2" y="3" width="14" height="13" rx="2.5" stroke="#0078D4" strokeWidth="1.5" />
      <path d="M2 7h14" stroke="#0078D4" strokeWidth="1.5" />
      <path d="M6 1.8v2.2M12 1.8v2.2" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 10.5h5M6.5 13h3.2" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AddToCalendarMenu({
  s,
  onAdded,
}: {
  s: Sale;
  onAdded?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        setOpen(false);
        return;
      }
      if (!menuRef.current) return;
      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      );
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = idx < 0 ? 0 : (idx + 1) % items.length;
        items[nextIdx]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
        items[nextIdx]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const scheduleSummary = `${fmtDate(s.date)} · ${timeRange(s)}`;

  return (
    <div className="cal" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-primary btn-sm cal-trigger"
        aria-label="Add to Calendar"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="cal" size={14} />
        <span>
          <span className="cal-trigger-prefix">Add to </span>Calendar
        </span>
        <span className={`cal-caret${open ? ' is-open' : ''}`} aria-hidden="true">
          <Icon name="chevron" size={12} />
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="cal-list cal-menu"
          role="menu"
          aria-label={`Add ${s.title} to calendar`}
        >
          <div className="cal-menu-head" aria-hidden="true">
            <span>{scheduleSummary}</span>
          </div>

          <a
            role="menuitem"
            className="cal-opt"
            href={googleCalUrl(s)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setOpen(false);
              onAdded?.('Opening Google Calendar…');
            }}
          >
            <CalendarProviderIcon provider="google" />
            <span className="cal-opt-copy">
              <b>Google Calendar</b>
              <span>Opens event in browser</span>
            </span>
          </a>

          <button
            role="menuitem"
            type="button"
            className="cal-opt"
            onClick={() => {
              downloadIcs(s);
              setOpen(false);
              onAdded?.('Apple Calendar event (.ics) downloaded');
            }}
          >
            <CalendarProviderIcon provider="apple" />
            <span className="cal-opt-copy">
              <b>Apple Calendar</b>
              <span>Downloads .ics with map &amp; alert</span>
            </span>
          </button>

          <a
            role="menuitem"
            className="cal-opt"
            href={outlookCalUrl(s)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setOpen(false);
              onAdded?.('Opening Outlook Calendar…');
            }}
          >
            <CalendarProviderIcon provider="outlook" />
            <span className="cal-opt-copy">
              <b>Outlook Calendar</b>
              <span>Opens event in browser</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
