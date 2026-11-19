import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import {
  BASE_CITIES,
  BASE_EXTRA,
  BASE_WORLD,
  BASEMAP,
  decodeLines,
} from '../data/basemap';
import type {
  CenterReq,
  MapViewState,
  Sale,
  UserLocation,
  ViewReq,
} from '../types/sale';
import { fmtDate, shortDay } from '../utils/format';
import { GARAGE_SVG, Icon, refreshIconsHtml, refreshLabel } from './Icons';

const EVV: [number, number] = [37.9716, -87.5711];
export const DEFAULT_MAP_VIEW = { lat: EVV[0], lng: EVV[1], zoom: 10 } as const;

const escapeHtml = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const pinIcon = (s: Sale, sel: boolean, hov: boolean) =>
  L.divIcon({
    className: 'gpin-wrap',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html:
      `<div class="gpin${sel ? ' is-selected' : ''}${hov ? ' is-hover' : ''}" data-sid="${escapeHtml(s.id)}">` +
      `<span class="gpin-body">${GARAGE_SVG}<span>${escapeHtml(shortDay(s.date))}</span>` +
      (s.food || s.drinks
        ? `<span class="pin-lemon" title="${escapeHtml(refreshLabel(s))}">${refreshIconsHtml(s)}</span>`
        : '') +
      '</span><span class="gpin-tip"></span></div>',
  });

const draftIcon = L.divIcon({
  className: 'gpin-wrap',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<div class="gdraft"></div>',
});

const userLocIcon = L.divIcon({
  className: 'user-loc-wrap',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: '<span class="user-loc-halo"></span><span class="user-loc-dot"></span>',
});

function addOfflineBase(map: L.Map) {
  map.createPane('base');
  const pane = map.getPane('base');
  if (pane) pane.style.zIndex = '150';
  const r = L.svg({ pane: 'base', padding: 0.4 });
  L.polygon(
    BASE_WORLD.l.map((poly) => decodeLines(poly)),
    { renderer: r, interactive: false, className: 'bm-land', stroke: false },
  ).addTo(map);
  L.polyline(decodeLines(BASE_WORLD.b), {
    renderer: r,
    interactive: false,
    className: 'bm-state',
    fill: false,
    smoothFactor: 1,
  }).addTo(map);
  const land = BASEMAP.l.map((poly) => decodeLines(poly));
  L.polygon(land, {
    renderer: r,
    interactive: false,
    className: 'bm-land',
    stroke: false,
    noClip: false,
    smoothFactor: 1,
  }).addTo(map);
  const cty = L.polyline(decodeLines(BASEMAP.c), {
    renderer: r,
    interactive: false,
    className: 'bm-county',
    fill: false,
    smoothFactor: 1,
  });
  L.polyline(decodeLines(BASEMAP.s), {
    renderer: r,
    interactive: false,
    className: 'bm-state',
    fill: false,
    smoothFactor: 1,
  }).addTo(map);
  const riv = L.polyline(decodeLines(BASE_EXTRA.r), {
    renderer: r,
    interactive: false,
    className: 'bm-river',
    fill: false,
    smoothFactor: 1,
  });
  const hwy = L.polyline(decodeLines(BASE_EXTRA.h), {
    renderer: r,
    interactive: false,
    className: 'bm-hwy',
    fill: false,
    smoothFactor: 1,
  });
  const labels = L.layerGroup(
    BASE_CITIES.map((c, cityIdx) => {
      const m = L.marker([c[1], c[2]], {
        pane: 'base',
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'bm-city',
          html: `<i></i><span>${c[0]}</span>`,
          iconSize: [0, 0],
        }),
      }) as L.Marker & { _cityIdx?: number };
      m._cityIdx = cityIdx;
      return m;
    }),
  );

  const sync = () => {
    const z = map.getZoom();
    if (z >= 7) {
      if (!map.hasLayer(cty)) cty.addTo(map);
    } else if (map.hasLayer(cty)) {
      map.removeLayer(cty);
    }
    if (z >= 5) {
      if (!map.hasLayer(riv)) riv.addTo(map);
    } else if (map.hasLayer(riv)) {
      map.removeLayer(riv);
    }
    if (z >= 6) {
      if (!map.hasLayer(hwy)) hwy.addTo(map);
    } else if (map.hasLayer(hwy)) {
      map.removeLayer(hwy);
    }
    const big = z >= 6 ? BASE_CITIES.length : 40;
    if (!map.hasLayer(labels)) labels.addTo(map);
    labels.eachLayer((layer) => {
      const m = layer as L.Marker & { _cityIdx?: number };
      const el = m.getElement();
      if (el) {
        const idx = m._cityIdx ?? -1;
        el.style.display = z >= 4 && idx >= 0 && idx < big ? '' : 'none';
      }
    });
  };
  map.on('zoomend', sync);
  sync();
}

interface SaleMarker extends L.Marker {
  _sid?: string;
  _key?: string;
  _lat?: number;
  _lng?: number;
  _title?: string;
  _sel?: boolean;
  _hov?: boolean;
}

export function SaleMap({
  sales,
  selectedId,
  hoverId,
  onSelect,
  onPinHold,
  onMapHold,
  pick,
  pin,
  onPick,
  centerReq,
  viewReq,
  onView,
  start,
  note,
  userLoc,
}: {
  sales: Sale[];
  selectedId?: string | null;
  hoverId?: string | null;
  onSelect?: (id: string | null) => void;
  onPinHold?: (id: string) => void;
  onMapHold?: (ll: { lat: number; lng: number }) => void;
  pick?: boolean;
  pin?: { lat: number; lng: number } | null;
  onPick?: (ll: { lat: number; lng: number }) => void;
  centerReq?: CenterReq | null;
  viewReq?: ViewReq | null;
  onView?: (v: MapViewState, meta?: { fromResize?: boolean }) => void;
  start?: { lat: number; lng: number; zoom: number } | null;
  note?: string;
  userLoc?: UserLocation | null;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, SaleMarker>>({});
  const draft = useRef<L.Marker | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const cb = useRef<{
    onSelect?: (id: string | null) => void;
    onPinHold?: (id: string) => void;
    onMapHold?: (ll: { lat: number; lng: number }) => void;
    onPick?: (ll: { lat: number; lng: number }) => void;
    pick?: boolean;
    onView?: (v: MapViewState, meta?: { fromResize?: boolean }) => void;
  }>({});
  cb.current = { onSelect, onPinHold, onMapHold, onPick, pick, onView };

  const [blocked, setBlocked] = useState(false);
  const [noteOff, setNoteOff] = useState(false);
  const lastCenterN = useRef<number | null>(null);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const st = start || DEFAULT_MAP_VIEW;
    const map = L.map(el, {
      center: [st.lat, st.lng],
      zoom: st.zoom,
      zoomControl: false,
      zoomSnap: 1,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    addOfflineBase(map);

    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    let ok = 0;
    let bad = 0;
    layer.on('tileload', () => {
      ok++;
      setBlocked((prev) => (prev ? false : prev));
    });
    layer.on('tileerror', () => {
      bad++;
      if (ok === 0 && bad >= 3) setBlocked(true);
    });

    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let holdOrigin: { x: number; y: number } | null = null;

    const clearHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdOrigin = null;
    };

    map.on('movestart dragstart zoomstart', clearHold);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (Date.now() < suppressUntilRef.current) return;
      if (cb.current.pick) {
        cb.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        cb.current.onSelect?.(null);
      }
    });

    const onPtrDown = (e: PointerEvent) => {
      if (cb.current.pick) return;
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) {
        clearHold();
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('.leaflet-control-container, .gcluster-wrap, .map-note')) {
        return;
      }
      const pinEl = target.closest('.gpin[data-sid]') as HTMLElement | null;
      const sid = pinEl?.getAttribute('data-sid') || null;
      if (sid && !cb.current.onPinHold) return;
      if (!sid && !cb.current.onMapHold) return;

      clearHold();
      holdOrigin = { x: e.clientX, y: e.clientY };
      const rect = el.getBoundingClientRect();
      const pt = L.point(e.clientX - rect.left, e.clientY - rect.top);
      holdTimer = setTimeout(() => {
        holdTimer = null;
        holdOrigin = null;
        suppressUntilRef.current = Date.now() + 450;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(14);
        }
        if (sid) {
          cb.current.onPinHold?.(sid);
        } else {
          const ll = map.containerPointToLatLng(pt);
          cb.current.onMapHold?.({ lat: ll.lat, lng: ll.lng });
        }
      }, 500);
    };

    const onPtrMove = (e: PointerEvent) => {
      if (!holdOrigin) return;
      if (Math.hypot(e.clientX - holdOrigin.x, e.clientY - holdOrigin.y) > 10) {
        clearHold();
      }
    };

    const onCtx = (e: MouseEvent) => {
      if (holdTimer || Date.now() < suppressUntilRef.current) e.preventDefault();
    };

    el.addEventListener('pointerdown', onPtrDown);
    el.addEventListener('pointermove', onPtrMove);
    el.addEventListener('pointerup', clearHold);
    el.addEventListener('pointercancel', clearHold);
    el.addEventListener('contextmenu', onCtx);

    let resizing = false;
    const emit = (fromResize = false) => {
      if (!cb.current.onView || el.clientWidth === 0 || el.clientHeight === 0) return;
      const b = map.getBounds();
      const c = map.getCenter();
      cb.current.onView(
        {
          s: b.getSouth(),
          w: b.getWest(),
          n: b.getNorth(),
          e: b.getEast(),
          lat: c.lat,
          lng: c.lng,
          zoom: map.getZoom(),
        },
        { fromResize },
      );
    };
    map.on('moveend', () => emit(resizing));

    const handleResize = () => {
      resizing = true;
      map.invalidateSize({ animate: false });
      emit(true);
      resizing = false;
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(handleResize);
      ro.observe(el);
    }

    let orientTimer: ReturnType<typeof setTimeout> | null = null;
    const onOrientationChange = () => {
      if (orientTimer) clearTimeout(orientTimer);
      orientTimer = setTimeout(() => {
        orientTimer = null;
        handleResize();
      }, 160);
    };
    window.addEventListener('orientationchange', onOrientationChange);

    if (typeof L.markerClusterGroup === 'function') {
      cluster.current = L.markerClusterGroup({
        maxClusterRadius: 44,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        animate: false,
        animateAddingMarkers: false,
        chunkedLoading: true,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          return L.divIcon({
            className: 'gcluster-wrap',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            html: `<div class="gcluster" role="img" aria-label="${n} sales here. Zoom in to see them."><span>${n}</span></div>`,
          });
        },
      });
      map.addLayer(cluster.current);
    }

    mapRef.current = map;
    const t = setTimeout(() => {
      handleResize();
    }, 0);

    return () => {
      clearTimeout(t);
      if (orientTimer) clearTimeout(orientTimer);
      clearHold();
      window.removeEventListener('orientationchange', onOrientationChange);
      el.removeEventListener('pointerdown', onPtrDown);
      el.removeEventListener('pointermove', onPtrMove);
      el.removeEventListener('pointerup', clearHold);
      el.removeEventListener('pointercancel', clearHold);
      el.removeEventListener('contextmenu', onCtx);
      if (ro) ro.disconnect();
      map.remove();
      mapRef.current = null;
      cluster.current = null;
      markers.current = {};
      draft.current = null;
      userMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ms = markers.current;
    const ids = new Set(sales.map((s) => s.id));
    const gone = Object.keys(ms)
      .filter((id) => !ids.has(id))
      .map((id) => ms[id]);
    gone.forEach((m) => {
      if (m._sid) delete ms[m._sid];
    });
    if (gone.length) {
      if (cluster.current) cluster.current.removeLayers(gone);
      else gone.forEach((m) => m.remove());
    }

    const fresh: SaleMarker[] = [];
    sales.forEach((s) => {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return;
      const sel = s.id === selectedId;
      const hov = s.id === hoverId;
      const key = [s.id, s.date, !!s.food, !!s.drinks].join('|');
      let m = ms[s.id];
      if (!m) {
        m = L.marker([s.lat, s.lng], {
          icon: pinIcon(s, sel, hov),
          title: s.title,
          alt: `${s.title}, ${fmtDate(s.date)}`,
          keyboard: true,
        }) as SaleMarker;
        m.on('click', () => {
          if (Date.now() < suppressUntilRef.current) return;
          cb.current.onSelect?.(s.id);
        });
        m.on('add', () => {
          const addedEl = m.getElement();
          if (addedEl && m._title) {
            addedEl.setAttribute('aria-label', `${m._title}, ${fmtDate(s.date)}`);
          }
        });
        m._sid = s.id;
        m._key = key;
        m._lat = s.lat;
        m._lng = s.lng;
        m._title = s.title;
        m._sel = sel;
        m._hov = hov;
        fresh.push(m);
      } else {
        if (m._lat !== s.lat || m._lng !== s.lng) {
          if (cluster.current && cluster.current.hasLayer(m)) {
            cluster.current.removeLayer(m);
            m.setLatLng([s.lat, s.lng]);
            cluster.current.addLayer(m);
          } else {
            m.setLatLng([s.lat, s.lng]);
          }
          m._lat = s.lat;
          m._lng = s.lng;
        }
        if (m._key !== key) {
          m.setIcon(pinIcon(s, sel, hov));
          m._key = key;
          m._sel = sel;
          m._hov = hov;
        } else if (m._sel !== sel || m._hov !== hov) {
          const pinEl = m.getElement()?.querySelector('.gpin');
          if (pinEl) {
            pinEl.classList.toggle('is-selected', sel);
            pinEl.classList.toggle('is-hover', hov);
          } else {
            m.setIcon(pinIcon(s, sel, hov));
          }
          m._sel = sel;
          m._hov = hov;
        }
        if (m._title !== s.title) {
          m._title = s.title;
          const markerEl = m.getElement();
          if (markerEl) markerEl.title = s.title;
        }
      }
      ms[s.id] = m;
      m.setZIndexOffset(sel ? 1000 : hov ? 500 : 0);
      const el = m.getElement();
      if (el) el.setAttribute('aria-label', `${s.title}, ${fmtDate(s.date)}`);
    });

    if (fresh.length) {
      if (cluster.current) cluster.current.addLayers(fresh);
      else fresh.forEach((m) => m.addTo(map));
    }
  }, [sales, selectedId, hoverId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerReq || lastCenterN.current === centerReq.n) return;
    const s = sales.find((x) => x.id === centerReq.id);
    if (s) {
      lastCenterN.current = centerReq.n;
      map.setView([s.lat, s.lng], Math.max(map.getZoom(), 13), {
        animate: false,
      });
    }
  }, [centerReq, sales]);

  useEffect(() => {
    const sm = selectedId ? markers.current[selectedId] : undefined;
    if (
      sm &&
      cluster.current &&
      cluster.current.hasLayer(sm) &&
      cluster.current.getVisibleParent(sm) !== sm
    ) {
      cluster.current.zoomToShowLayer(sm);
    }
  }, [selectedId, sales]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (draft.current) {
      draft.current.remove();
      draft.current = null;
    }
    if (pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)) {
      const m = L.marker([pin.lat, pin.lng], {
        icon: draftIcon,
        draggable: !!pick,
        interactive: !!pick,
        keyboard: !!pick,
      }).addTo(map);
      if (pick) {
        m.on('dragend', () => {
          const ll = m.getLatLng();
          cb.current.onPick?.({ lat: ll.lat, lng: ll.lng });
        });
      }
      draft.current = m;
      if (!map.getBounds().contains([pin.lat, pin.lng])) {
        map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 15), {
          animate: false,
        });
      }
    }
  }, [pin, pick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !viewReq) return;
    map.invalidateSize(false);
    const b = viewReq.bbox;
    if (
      b &&
      b.length === 4 &&
      b.every((n) => Number.isFinite(n)) &&
      b[0] < b[1] &&
      b[2] < b[3]
    ) {
      map.fitBounds(
        [
          [b[0], b[2]],
          [b[1], b[3]],
        ],
        { animate: false, maxZoom: 13 },
      );
    } else if (Number.isFinite(viewReq.lat) && Number.isFinite(viewReq.lng)) {
      map.setView([viewReq.lat, viewReq.lng], viewReq.zoom || 12, {
        animate: false,
      });
    }
  }, [viewReq]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (
      userLoc &&
      userLoc.precise !== false &&
      Number.isFinite(userLoc.lat) &&
      Number.isFinite(userLoc.lng)
    ) {
      if (userMarker.current) {
        userMarker.current.setLatLng([userLoc.lat, userLoc.lng]);
      } else {
        userMarker.current = L.marker([userLoc.lat, userLoc.lng], {
          icon: userLocIcon,
          interactive: false,
          keyboard: false,
          zIndexOffset: 250,
        }).addTo(map);
      }
    } else if (userMarker.current) {
      userMarker.current.remove();
      userMarker.current = null;
    }
  }, [userLoc]);

  return (
    <div className="map-wrap absolute inset-0">
      <div
        ref={elRef}
        className={`map${pick ? ' is-pick' : ''}`}
        role="application"
        aria-label={
          pick ? 'Map. Tap to place the sale location.' : 'Map of sales'
        }
      />
      {blocked
        ? !noteOff && (
            <div className="map-note" role="status">
              Offline vector map active — zoom or pan to explore.{' '}
              <button
                type="button"
                className="note-x"
                aria-label="Dismiss"
                onClick={() => setNoteOff(true)}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          )
        : note && <div className="map-note">{note}</div>}
    </div>
  );
}
