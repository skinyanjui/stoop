import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

export function FilterBar({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [can, setCan] = useState({ l: false, r: false });

  const scroller = () => wrap.current?.querySelector('.filters') as HTMLElement | null;

  const measure = useCallback(() => {
    const e = scroller();
    if (!e) return;
    const l = e.scrollLeft > 4;
    const r = e.scrollLeft + e.clientWidth < e.scrollWidth - 4;
    setCan((p) => (p.l === l && p.r === r ? p : { l, r }));
  }, []);

  useEffect(() => {
    measure();
  }, [children, measure]);

  useEffect(() => {
    const el = scroller();
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [measure]);

  const go = (d: number) => {
    const e = scroller();
    if (e) {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      e.scrollBy({
        left: d * Math.max(200, e.clientWidth * 0.7),
        behavior: reduced ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <div
      className="fbar"
      role="region"
      aria-label="Filter sales"
      ref={wrap}
      onScrollCapture={measure}
    >
      {children}
      {can.l && (
        <div className="fbar-edge left">
          <button
            type="button"
            className="fbar-btn prev"
            aria-label="Scroll filters left"
            onClick={() => go(-1)}
          >
            <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
      {can.r && (
        <div className="fbar-edge right">
          <button
            type="button"
            className="fbar-btn"
            aria-label="Scroll filters right"
            onClick={() => go(1)}
          >
            <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
