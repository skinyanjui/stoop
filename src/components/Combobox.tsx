import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

export interface ComboOption {
  id: string;
  label: string;
  meta?: string;
  group?: string;
  kind?: 'item' | 'category' | 'place';
  value: string;
  recent?: boolean;
  coords?: {
    lat: number;
    lng: number;
    zoom?: number;
    bbox?: number[] | null;
  };
  onRemove?: () => void;
}

export function Combobox({
  id,
  label,
  value,
  onChange,
  options,
  onPick,
  groupActions,
  placeholder,
  leading,
  trailing,
  clearable,
  inline,
  blockEnter,
  enterKeyHint,
  onSubmit,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: ComboOption[];
  onPick: (opt: ComboOption) => void;
  groupActions?: Record<string, { label: string; onClick: () => void }>;
  placeholder?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  clearable?: boolean;
  inline?: boolean;
  blockEnter?: boolean;
  enterKeyHint?: 'search' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'send';
  onSubmit?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const comboRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActive(0);
  }, [value, options.length]);

  const listId = `${id}-list`;
  const show = open && options.length > 0;

  useEffect(() => {
    if (!show) return;
    document
      .getElementById(`${id}-opt-${active}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [show, active, id]);

  const pick = (o: ComboOption) => {
    onPick(o);
    setActive(0);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (options.length ? Math.min(a + 1, options.length - 1) : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (show && options[active]) {
        e.preventDefault();
        pick(options[active]);
      } else if (onSubmit && value.trim()) {
        e.preventDefault();
        setOpen(false);
        onSubmit(value.trim());
      } else if (blockEnter) {
        e.preventDefault();
      }
    } else if (e.key === 'Escape' && show) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  let lastGroup: string | undefined;

  return (
    <div className="combo" ref={comboRef}>
      <div className="combo-field">
        {leading && <span className="combo-lead">{leading}</span>}
        <input
          ref={inputRef}
          id={id}
          className="combo-input"
          type="text"
          role="combobox"
          value={value}
          placeholder={placeholder}
          aria-label={label}
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show ? `${id}-opt-${active}` : undefined}
          enterKeyHint={enterKeyHint}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null;
            if (next && comboRef.current?.contains(next) && next.closest('.combo-list, .combo-clear')) {
              return;
            }
            setOpen(false);
          }}
          onKeyDown={onKey}
        />
        {clearable && value.length > 0 && (
          <button
            type="button"
            className="combo-clear"
            aria-label="Clear search"
            title="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
        {trailing && <span className="combo-trail">{trailing}</span>}
      </div>
      {show && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          className={`combo-list${inline ? ' is-inline' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest('button')) {
              e.preventDefault();
            }
          }}
        >
          {options.map((o, i) => {
            const showHeader = o.group && o.group !== lastGroup;
            lastGroup = o.group;
            const action = o.group ? groupActions?.[o.group] : undefined;
            return (
              <React.Fragment key={o.id}>
                {showHeader && (
                  <li role="presentation" className="combo-group">
                    <span>{o.group}</span>
                    {action && (
                      <button
                        type="button"
                        tabIndex={-1}
                        className="combo-group-btn"
                        onClick={action.onClick}
                      >
                        {action.label}
                      </button>
                    )}
                  </li>
                )}
                <li
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`combo-opt${i === active ? ' is-active' : ''}`}
                  onClick={() => pick(o)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="combo-lbl">{o.label}</span>
                  <span className="combo-right">
                    {o.meta && <span className="combo-meta">{o.meta}</span>}
                    {o.onRemove && (
                      <button
                        type="button"
                        tabIndex={-1}
                        className="combo-rm"
                        aria-label={`Remove ${o.label} from recent searches`}
                        onClick={(e) => {
                          e.stopPropagation();
                          o.onRemove?.();
                        }}
                      >
                        ×
                      </button>
                    )}
                  </span>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
