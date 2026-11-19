import type { FormEventHandler, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, summary, a[href], [tabindex="0"]';

export function ModalDialog({
  labelledBy,
  onClose,
  scrimClassName,
  dialogClassName = 'dialog',
  suppressEscapeSelector,
  autoFocusSelector,
  autoFocusKey,
  asForm,
  onSubmit,
  noValidate,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  scrimClassName?: string;
  dialogClassName?: string;
  suppressEscapeSelector?: string;
  autoFocusSelector?: string;
  autoFocusKey?: unknown;
  asForm?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  noValidate?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prevFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (
        prevFocus &&
        prevFocus.isConnected &&
        !document.querySelector('.scrim')
      ) {
        requestAnimationFrame(() => {
          if (prevFocus.isConnected && !document.querySelector('.scrim')) {
            prevFocus.focus();
          }
        });
      }
    };
  }, []);

  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;
    const target = (
      autoFocusSelector
        ? root.querySelector(autoFocusSelector)
        : root.querySelector('button, input, a[href]')
    ) as HTMLElement | null;
    target?.focus();
  }, [autoFocusSelector, autoFocusKey]);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (suppressEscapeSelector && document.querySelector(suppressEscapeSelector)) {
      return;
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const list = Array.from(
      dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR),
    ).filter(
      (el) =>
        !(el as HTMLButtonElement).disabled &&
        (el as HTMLElement).offsetParent !== null,
    ) as HTMLElement[];
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const scrimCls = scrimClassName ? `scrim ${scrimClassName}` : 'scrim';

  return (
    <div
      className={scrimCls}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {asForm ? (
        <form
          ref={(el) => {
            dialogRef.current = el;
          }}
          className={dialogClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onKeyDown={handleKeyDown}
          onSubmit={onSubmit}
          noValidate={noValidate}
        >
          {children}
        </form>
      ) : (
        <div
          ref={(el) => {
            dialogRef.current = el;
          }}
          className={dialogClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      )}
    </div>
  );
}
