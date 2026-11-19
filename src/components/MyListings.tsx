import type { PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Sale } from '../types/sale';
import { dayLabel, timeRange } from '../utils/format';
import { Icon } from './Icons';

export function MyListings({
  mine,
  onEdit,
  onDelete,
  onReorder,
  onView,
  onAdd,
}: {
  mine: Sale[];
  onEdit: (s: Sale) => void;
  onDelete: (s: Sale) => void;
  onReorder: (orderedIds: string[]) => void;
  onView: (id: string) => void;
  onAdd: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const handleRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragSessionRef = useRef<{
    pointerId: number;
    startIdx: number;
    overIdx: number;
    startY: number;
    startScrollTop: number;
    scrollEl: Element | null;
    rects: DOMRect[];
    step: number;
    minDy: number;
    maxDy: number;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    startIdx: number;
    overIdx: number;
    dy: number;
    step: number;
  } | null>(null);
  const [liveMsg, setLiveMsg] = useState('');

  useEffect(() => {
    dragSessionRef.current = null;
    setDragState(null);
  }, [mine.length]);

  useEffect(
    () => () => {
      dragSessionRef.current = null;
    },
    [],
  );

  const commitReorder = (fromIdx: number, toIdx: number, keepFocusOnId?: string) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= mine.length ||
      toIdx >= mine.length
    ) {
      return;
    }
    const next = [...mine];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorder(next.map((item) => item.id));
    setLiveMsg(`Moved ${moved.title} to position ${toIdx + 1} of ${mine.length}.`);
    if (keepFocusOnId) {
      requestAnimationFrame(() => {
        handleRefs.current[keepFocusOnId]?.focus();
      });
    }
  };

  const onHandlePointerDown = (
    e: PointerEvent<HTMLButtonElement>,
    idx: number,
    id: string,
  ) => {
    if (mine.length < 2 || e.button > 0) return;
    const ul = listRef.current;
    if (!ul) return;
    const rows = Array.from(ul.children).filter(
      (el): el is HTMLLIElement => el.tagName === 'LI',
    );
    if (rows.length !== mine.length) return;
    e.preventDefault();
    e.stopPropagation();

    const rects = rows.map((el) => el.getBoundingClientRect());
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 8;
    const step = rects[idx].height + gap;
    const minDy = rects[0].top - rects[idx].top - 12;
    const maxDy = rects[rects.length - 1].bottom - rects[idx].bottom + 12;
    const scrollEl = ul.closest('.dialog-body');

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture is unsupported
    }

    dragSessionRef.current = {
      pointerId: e.pointerId,
      startIdx: idx,
      overIdx: idx,
      startY: e.clientY,
      startScrollTop: scrollEl?.scrollTop || 0,
      scrollEl,
      rects,
      step,
      minDy,
      maxDy,
    };
    setDragState({ id, startIdx: idx, overIdx: idx, dy: 0, step });
  };

  const onHandlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const sess = dragSessionRef.current;
    if (!sess || e.pointerId !== sess.pointerId) return;
    const curScroll = sess.scrollEl?.scrollTop || 0;
    const rawDy = e.clientY - sess.startY + (curScroll - sess.startScrollTop);
    const dy = Math.max(sess.minDy, Math.min(sess.maxDy, rawDy));
    const draggedCenter =
      sess.rects[sess.startIdx].top + sess.rects[sess.startIdx].height / 2 + dy;

    let overIdx = sess.startIdx;
    if (dy > 0) {
      for (let i = sess.startIdx + 1; i < sess.rects.length; i++) {
        if (draggedCenter > sess.rects[i].top + sess.rects[i].height / 2) overIdx = i;
      }
    } else if (dy < 0) {
      for (let i = sess.startIdx - 1; i >= 0; i--) {
        if (draggedCenter < sess.rects[i].top + sess.rects[i].height / 2) overIdx = i;
      }
    }
    sess.overIdx = overIdx;
    setDragState((prev) => (prev ? { ...prev, overIdx, dy } : prev));
  };

  const finishPointerDrag = (
    e: PointerEvent<HTMLButtonElement>,
    cancelled: boolean,
  ) => {
    const sess = dragSessionRef.current;
    if (!sess || e.pointerId !== sess.pointerId) return;
    dragSessionRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    if (!cancelled && sess.overIdx !== sess.startIdx) {
      commitReorder(sess.startIdx, sess.overIdx);
    }
    setDragState(null);
  };

  return (
    <div className="field">
      <div className="mine-head">
        <span className="label">
          My listings{mine.length ? ` (${mine.length})` : ''}
        </span>
        {mine.length > 1 && <span className="mine-hint">Drag to reorder</span>}
      </div>
      <span className="sr-only" aria-live="polite">
        {liveMsg}
      </span>
      {mine.length === 0 ? (
        <div className="empty-inline">
          <p>No sales yet. Post one and it’ll show up here.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Icon name="plus" />
            Add a sale
          </button>
        </div>
      ) : (
        <ul
          ref={listRef}
          className={`mine${dragState ? ' is-dragging-list' : ''}`}
        >
          {mine.map((s, idx) => {
            const isDragging = dragState?.id === s.id;
            let shiftY = 0;
            if (dragState && !isDragging) {
              if (
                dragState.startIdx < dragState.overIdx &&
                idx > dragState.startIdx &&
                idx <= dragState.overIdx
              ) {
                shiftY = -dragState.step;
              } else if (
                dragState.startIdx > dragState.overIdx &&
                idx >= dragState.overIdx &&
                idx < dragState.startIdx
              ) {
                shiftY = dragState.step;
              }
            }
            const rowTransform = isDragging
              ? `translate3d(0, ${dragState.dy}px, 0)`
              : shiftY !== 0
                ? `translate3d(0, ${shiftY}px, 0)`
                : undefined;

            return (
              <li
                key={s.id}
                className={`mine-row${isDragging ? ' is-dragging' : ''}`}
                style={rowTransform ? { transform: rowTransform } : undefined}
              >
                {mine.length > 1 && (
                  <button
                    ref={(el) => {
                      handleRefs.current[s.id] = el;
                    }}
                    type="button"
                    className="mine-handle"
                    aria-label={`Reorder ${s.title}. Use Up or Down arrow keys to move.`}
                    title="Drag to reorder"
                    onPointerDown={(e) => onHandlePointerDown(e, idx, s.id)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={(e) => finishPointerDrag(e, false)}
                    onPointerCancel={(e) => finishPointerDrag(e, true)}
                    onLostPointerCapture={(e) => finishPointerDrag(e, true)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' && idx > 0) {
                        e.preventDefault();
                        commitReorder(idx, idx - 1, s.id);
                      } else if (e.key === 'ArrowDown' && idx < mine.length - 1) {
                        e.preventDefault();
                        commitReorder(idx, idx + 1, s.id);
                      }
                    }}
                  >
                    <Icon name="grip" size={16} strokeWidth={2.2} />
                  </button>
                )}
                <button
                  type="button"
                  className="mine-main"
                  onClick={() => onView(s.id)}
                  aria-label={`Show ${s.title} on the map`}
                >
                  <span className="mine-title">{s.title}</span>
                  <span className="srow-meta">
                    <b>{`${dayLabel(s.date)} ${timeRange(s)}`}</b>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit ${s.title}`}
                  onClick={() => onEdit(s)}
                >
                  <Icon name="edit" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete ${s.title}`}
                  onClick={() => onDelete(s)}
                >
                  <Icon name="trash" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
