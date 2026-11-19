import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AddSaleDialog } from './components/AddSaleDialog';
import { AdDialog } from './components/AdDialog';
import { BottomBar } from './components/BottomBar';
import { type ComboOption } from './components/Combobox';
import { FilterBar } from './components/FilterBar';
import { FilterChips } from './components/FilterChips';
import { Header } from './components/Header';
import { LegalDialog, type LegalPageId } from './components/LegalDialog';
import { ListFooter } from './components/ListFooter';
import { PaySheet } from './components/PaySheet';
import { ProfileDialog } from './components/ProfileDialog';
import {
  QuickActionsSheet,
  type HoldActionTarget,
} from './components/QuickActionsSheet';
import { SaleDetails } from './components/SaleDetails';
import { SaleList } from './components/SaleList';
import { DEFAULT_MAP_VIEW, SaleMap } from './components/SaleMap';
import { SeoHead } from './components/SeoHead';
import { TermsBanner } from './components/TermsBanner';
import { Toast } from './components/Toast';
import { CATALOG, CATS, SEED } from './data/seedSales';
import {
  auth,
  createSaleInCloud,
  deleteSaleInCloud,
  loadOrCreateUserProfile,
  signInWithGoogle,
  signOutUser,
  subscribePublicSales,
  updateSaleInCloud,
  updateUserProfileFields,
} from './firebase';
import type {
  CenterReq,
  MapViewState,
  Sale,
  SaleDraft,
  SaleType,
  SortMode,
  SponsorAd,
  ToastState,
  UserLocation,
  UserProfile,
  ViewReq,
} from './types/sale';
import { applySaleOwnership } from './utils/cloudPayloads';
import {
  buildMaster,
  countMeta,
  dayDiff,
  isWeekend,
  ranked,
  searchMaster,
  sortSalesByMode,
} from './utils/format';
import {
  detectLocationByIp,
  geocode,
  reverseGeocode,
  suggestPlaces,
  type PlaceSuggestion,
} from './utils/geocode';
import {
  LISTING_ORDER_KEY,
  LOCAL_SAVED_KEY,
  RECENT_SEARCHES_KEY,
  TERMS_KEY,
  type RecentSearch,
  readLocalFlag,
  readLocalStringList,
  readRecentSearches,
  upsertRecentSearch,
  writeLocalFlag,
  writeLocalJson,
} from './utils/storage';

export default function App() {
  const [cloudSales, setCloudSales] = useState<Sale[]>([]);
  const [localDrafts, setLocalDrafts] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      const k = decodeURIComponent(location.hash.slice(1));
      return k && SEED.some((x) => x.id === k) ? k : null;
    } catch {
      return null;
    }
  });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const reqSeq = useRef(1);
  const [centerReq, setCenterReq] = useState<CenterReq | null>(() => {
    try {
      const k = decodeURIComponent(location.hash.slice(1));
      return k && SEED.some((x) => x.id === k) ? { id: k, n: 1 } : null;
    } catch {
      return null;
    }
  });
  const [mapView, setMapView] = useState<MapViewState | null>(null);
  const [viewReq, setViewReq] = useState<ViewReq | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(readRecentSearches);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const progAt = useRef(0);

  const [when, setWhen] = useState<'today' | 'weekend' | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('soonest');
  const [saleType, setSaleType] = useState<SaleType | null>(null);
  const [payF, setPayF] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>(() =>
    readLocalStringList(LOCAL_SAVED_KEY, 200),
  );
  const [listingOrder, setListingOrder] = useState<string[]>(() =>
    readLocalStringList(LISTING_ORDER_KEY, 200),
  );
  const [onlySaved, setOnlySaved] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [activeAd, setActiveAd] = useState<SponsorAd | null>(null);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(null);
  const [holdTarget, setHoldTarget] = useState<HoldActionTarget | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPageId | null>(null);
  const [contactSeed, setContactSeed] = useState<{
    topic?: string;
    message?: string;
  } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() =>
    readLocalFlag(TERMS_KEY),
  );
  const [topHidden, setTopHidden] = useState(false);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);

  const opener = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const hashDone = useRef(false);
  const lastAdd = useRef(0);
  const authSeqRef = useRef(0);
  const searchCtrlRef = useRef<AbortController | null>(null);
  const locateCtrlRef = useRef<AbortController | null>(null);
  const navSeqRef = useRef(0);
  const userMovedMapRef = useRef(selectedId !== null);
  const hasInitialViewRef = useRef(false);
  const hasGpsRef = useRef(false);
  const userAreaNameRef = useRef<string | null>(null);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const listingOrderRef = useRef(listingOrder);
  listingOrderRef.current = listingOrder;

  const dismissToast = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  };

  const showToast = (t: ToastState) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      searchCtrlRef.current?.abort();
      locateCtrlRef.current?.abort();
    };
  }, []);

  // Persist local saved favorites when signed out
  useEffect(() => {
    writeLocalJson(LOCAL_SAVED_KEY, saved);
  }, [saved]);

  // Persist local listing order
  useEffect(() => {
    writeLocalJson(LISTING_ORDER_KEY, listingOrder);
  }, [listingOrder]);

  // Persist recent search queries
  useEffect(() => {
    writeLocalJson(RECENT_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  // Listen to Firebase Auth state & sync user profile (guarded against stale async races)
  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      const seq = ++authSeqRef.current;
      if (!fbUser) {
        setUser(null);
        return;
      }
      try {
        const profile = await loadOrCreateUserProfile(fbUser);
        if (!active || authSeqRef.current !== seq) return;
        setUser(profile);
        const merged = Array.from(
          new Set([...profile.savedIds, ...savedRef.current]),
        ).slice(0, 200);
        setSaved(merged);
        const cloudOrder = profile.listingOrder || [];
        const mergedOrder = Array.from(
          new Set([...cloudOrder, ...listingOrderRef.current]),
        ).slice(0, 200);
        listingOrderRef.current = mergedOrder;
        setListingOrder(mergedOrder);
        const savedChanged =
          merged.length !== profile.savedIds.length ||
          merged.some((id, idx) => profile.savedIds[idx] !== id);
        const orderChanged =
          mergedOrder.length !== cloudOrder.length ||
          mergedOrder.some((id, idx) => cloudOrder[idx] !== id);
        if (savedChanged || orderChanged) {
          void updateUserProfileFields(fbUser.uid, {
            ...(savedChanged ? { savedIds: merged } : {}),
            ...(orderChanged ? { listingOrder: mergedOrder } : {}),
          }).catch(() => {});
        }
      } catch {
        if (!active || authSeqRef.current !== seq) return;
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Seller',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || undefined,
          payments: ['cash'],
          savedIds: savedRef.current,
          listingOrder: listingOrderRef.current,
        });
      }
    });
    return () => {
      active = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to public Firestore sales
  useEffect(() => {
    const fallbackTimer = setTimeout(() => setLoading(false), 600);
    const unsub = subscribePublicSales(
      (rows) => {
        clearTimeout(fallbackTimer);
        setCloudSales(rows);
        setLoading(false);
        if (!hashDone.current) {
          hashDone.current = true;
          try {
            const k = decodeURIComponent(location.hash.slice(1));
            const hit = k && rows.find((x) => x.id === k);
            if (hit) {
              userMovedMapRef.current = true;
              setSelectedId(hit.id);
              setCenterReq({ id: hit.id, n: ++reqSeq.current });
            }
          } catch {
            // ignore hash errors
          }
        }
      },
      () => {
        clearTimeout(fallbackTimer);
        setLoading(false);
        showToast({ msg: 'Live updates paused. Showing saved listings.' });
      },
    );
    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  // Automatically prune local drafts once Firestore snapshot confirms them
  useEffect(() => {
    if (!localDrafts.length || !cloudSales.length) return;
    const cloudIds = new Set(cloudSales.map((s) => s.id));
    if (localDrafts.some((d) => cloudIds.has(d.id))) {
      setLocalDrafts((p) => p.filter((d) => !cloudIds.has(d.id)));
    }
  }, [cloudSales, localDrafts]);

  // Combined sales list (cloud listings + local drafts + sample listings)
  const sales = useMemo(() => {
    const cloudIds = new Set(cloudSales.map((s) => s.id));
    const uid = user?.uid || null;
    const ownedCloud = applySaleOwnership(cloudSales, uid);
    const pendingLocals = localDrafts.filter((s) => !cloudIds.has(s.id));
    return [...SEED, ...ownedCloud, ...pendingLocals];
  }, [cloudSales, localDrafts, user?.uid]);

  const master = useMemo(() => buildMaster(sales, CATS, CATALOG), [sales]);

  useEffect(() => {
    const onHash = () => {
      try {
        const k = decodeURIComponent(location.hash.slice(1));
        if (!k) return;
        const hit = sales.find((x) => x.id === k);
        if (hit) {
          userMovedMapRef.current = true;
          clearAll();
          setSelectedId(hit.id);
          setCenterReq({ id: hit.id, n: ++reqSeq.current });
        }
      } catch {
        // ignore hash errors
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [sales]);

  const toggleSave = (id: string) => {
    const prev = savedRef.current;
    const next = prev.includes(id)
      ? prev.filter((x) => x !== id)
      : [...prev, id];
    savedRef.current = next;
    setSaved(next);
    if (user) {
      void updateUserProfileFields(user.uid, { savedIds: next }).catch(() => {
        showToast({ msg: "Couldn't sync favorites right now." });
      });
    }
  };

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const fbUser = await signInWithGoogle();
      showToast({ msg: `Signed in as ${fbUser.displayName || 'Seller'}` });
      // Sync any local drafts posted before signing in concurrently
      if (localDrafts.length > 0) {
        const draftsToSync = [...localDrafts];
        const results = await Promise.allSettled(
          draftsToSync.map((d) =>
            createSaleInCloud({ ...d, owner: fbUser.uid, ownerId: 'me' }),
          ),
        );
        const failedCount = results.filter((r) => r.status === 'rejected').length;
        if (failedCount > 0) {
          showToast({
            msg: `${failedCount} local draft${failedCount === 1 ? '' : 's'} could not sync yet.`,
          });
        }
      }
    } catch {
      showToast({ msg: 'Sign-in was cancelled or unavailable.' });
    }
    setSigningIn(false);
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      showToast({ msg: 'Signed out' });
    } catch {
      showToast({ msg: "Couldn't sign out right now." });
    }
  };

  const handleUpdateName = async (name: string) => {
    if (!user) return;
    setUser((u) => (u ? { ...u, name } : u));
    try {
      await updateUserProfileFields(user.uid, { name });
      showToast({ msg: 'Profile updated' });
    } catch {
      showToast({ msg: "Couldn't save your display name." });
    }
  };

  const handleUpdatePayments = async (payments: string[]) => {
    if (!user) return;
    setUser((u) => (u ? { ...u, payments } : u));
    try {
      await updateUserProfileFields(user.uid, { payments });
    } catch {
      showToast({ msg: "Couldn't save payment preferences." });
    }
  };

  const matches = useMemo(() => {
    const filtered = sales
      .filter((s) => dayDiff(s.date) >= 0)
      .filter(
        (s) =>
          !when ||
          (when === 'today' ? dayDiff(s.date) === 0 : isWeekend(s)),
      )
      .filter((s) => payF.every((id) => (s.pay || []).includes(id)))
      .filter((s) => !saleType || (s.saleType || 'Garage Sale') === saleType)
      .filter((s) => !onlySaved || saved.includes(s.id))
      .filter((s) => !cats.length || cats.some((c) => s.cats.includes(c)))
      .filter(
        (s) =>
          !items.length ||
          items.some((t) => {
            const lo = t.toLowerCase();
            return (
              (s.items || []).some((i) => i.toLowerCase().includes(lo)) ||
              s.title.toLowerCase().includes(lo)
            );
          }),
      );
    return sortSalesByMode(filtered, sortBy, userLoc);
  }, [sales, when, saleType, payF, onlySaved, saved, cats, items, sortBy, userLoc]);

  const visible = useMemo(
    () =>
      !mapView
        ? matches
        : matches.filter(
            (s) =>
              s.lat >= mapView.s &&
              s.lat <= mapView.n &&
              s.lng >= mapView.w &&
              s.lng <= mapView.e,
          ),
    [matches, mapView],
  );

  const hasFilters = !!(
    when ||
    sortBy === 'nearest' ||
    saleType ||
    payF.length ||
    onlySaved ||
    cats.length ||
    items.length
  );

  const clearAll = () => {
    setWhen(null);
    setSortBy('soonest');
    setSaleType(null);
    setPayF([]);
    setOnlySaved(false);
    setCats([]);
    setItems([]);
  };

  const filterCats = useMemo(() => {
    const top = ranked(master, 'category')
      .slice(0, 40)
      .map((e) => e.name);
    return [...top, ...cats.filter((c) => !top.includes(c))];
  }, [master, cats]);

  const toggleCat = (c: string) =>
    setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const toggleCard = (id: string) => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      setSelectedId(id);
      return;
    }
    setSelectedId((p) => (p === id ? null : id));
    setTimeout(() => {
      const el = document.getElementById(`sale-${id}`);
      if (!el) return;
      const btn = el.querySelector('.srow-main') as HTMLElement | null;
      if (btn && document.activeElement !== btn) btn.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest' });
    }, 0);
  };

  const goTo = (req: Omit<ViewReq, 'n'>) => {
    progAt.current = Date.now();
    setViewReq({ ...req, n: ++reqSeq.current });
  };

  const goHome = () => {
    userMovedMapRef.current = true;
    navSeqRef.current++;
    searchCtrlRef.current?.abort();
    locateCtrlRef.current?.abort();
    setSearching(false);
    setLocating(false);
    clearAll();
    setPlace('');
    setPlaceSuggestions([]);
    setSelectedId(null);
    setHoverId(null);
    setView('list');
    setTopHidden(false);
    setAdding(false);
    setEditing(null);
    setDraftPin(null);
    setProfileOpen(false);
    setPaySheet(false);
    setActiveAd(null);
    setHoldTarget(null);
    setLegalPage(null);
    setContactSeed(null);
    if (userLoc) {
      setAreaName(userAreaNameRef.current || 'Near you');
      goTo({ lat: userLoc.lat, lng: userLoc.lng, zoom: userLoc.precise ? 12 : 11 });
    } else {
      setAreaName(null);
      goTo(DEFAULT_MAP_VIEW);
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
    }
  };

  const browseSampleSales = () => {
    userMovedMapRef.current = true;
    navSeqRef.current++;
    clearAll();
    setSelectedId(null);
    setAreaName('Evansville, IN');
    goTo(DEFAULT_MAP_VIEW);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onView = (v: MapViewState, meta?: { fromResize?: boolean }) => {
    setMapView(v);
    if (!hasInitialViewRef.current) {
      hasInitialViewRef.current = true;
      return;
    }
    if (meta?.fromResize) return;
    if (Date.now() - progAt.current > 1000) {
      userMovedMapRef.current = true;
      navSeqRef.current++;
      setAreaName(null);
    }
  };

  const recordRecent = (entry: Omit<RecentSearch, 'id'>) => {
    setRecentSearches((prev) => upsertRecentSearch(prev, entry));
  };

  const removeRecent = (id: string) => {
    setRecentSearches((prev) => prev.filter((r) => r.id !== id));
  };

  // Live debounced city / place suggestions as the user types in the search bar
  useEffect(() => {
    const q = place.trim();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      suggestPlaces(q, { signal: ctrl.signal, limit: 4 })
        .then((hits) => {
          if (!ctrl.signal.aborted) setPlaceSuggestions(hits);
        })
        .catch(() => {
          // Keep fallback "Go to" option available if autocomplete fails
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [place]);

  const navigateToPlace = (
    target: {
      lat: number;
      lng: number;
      zoom?: number;
      bbox?: number[] | null;
      name: string;
    },
    rawValue: string,
  ) => {
    userMovedMapRef.current = true;
    navSeqRef.current++;
    setSelectedId(null);
    setTopHidden(false);
    setAreaName(target.name);
    goTo({
      lat: target.lat,
      lng: target.lng,
      zoom: target.zoom,
      bbox: target.bbox ?? null,
    });
    setPlace('');
    setPlaceSuggestions([]);
    scrollRef.current?.scrollTo({ top: 0 });
    recordRecent({
      kind: 'place',
      label: target.name,
      value: rawValue,
      coords: {
        lat: target.lat,
        lng: target.lng,
        zoom: target.zoom,
        bbox: target.bbox ?? null,
      },
    });
  };

  const searchPlace = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    searchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    searchCtrlRef.current = ctrl;
    setSearching(true);
    try {
      const g = await geocode(trimmed, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      if (g) {
        navigateToPlace(g, trimmed);
      } else {
        showToast({ msg: "Couldn't find that place. Try a city or ZIP code." });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showToast({ msg: "Search isn't available right now." });
    } finally {
      if (searchCtrlRef.current === ctrl) {
        setSearching(false);
      }
    }
  };

  const headerOptions: ComboOption[] = useMemo(() => {
    const t = place.trim();
    const lo = t.toLowerCase();
    const recentMeta = (kind: RecentSearch['kind']) =>
      kind === 'place' ? 'Place' : kind === 'category' ? 'Category' : 'Item';
    const toRecentOpt = (r: RecentSearch): ComboOption => ({
      id: `recent:${r.id}`,
      label: r.label,
      meta: recentMeta(r.kind),
      group: 'Recent Searches',
      kind: r.kind,
      value: r.value,
      recent: true,
      coords: r.coords,
      onRemove: () => removeRecent(r.id),
    });

    const opt = (
      e: { name: string; count: number; cats: Record<string, number>; type: 'item' | 'category' },
      group: string,
      kind: 'item' | 'category',
    ): ComboOption => ({
      id: `${kind}:${e.name}`,
      label: e.name,
      meta: countMeta(e),
      group,
      kind,
      value: e.name,
    });

    if (!t) {
      const recents = recentSearches.map(toRecentOpt);
      const recentItemKeys = new Set(
        recentSearches
          .filter((r) => r.kind === 'item')
          .map((r) => r.value.toLowerCase()),
      );
      const popular = ranked(master, 'item')
        .filter(
          (e) =>
            !items.includes(e.name) &&
            !recentItemKeys.has(e.name.toLowerCase()),
        )
        .slice(0, 6)
        .map((e) => opt(e, 'Popular items', 'item'));
      return [...recents, ...popular];
    }

    const matchingRecents = recentSearches
      .filter(
        (r) =>
          r.label.toLowerCase().includes(lo) ||
          r.value.toLowerCase().includes(lo),
      )
      .slice(0, 3)
      .map(toRecentOpt);
    const foundItems = searchMaster(master, 'item', t, items, 4).map((e) =>
      opt(e, 'Items', 'item'),
    );
    const foundCats = searchMaster(master, 'category', t, cats, 2).map((e) =>
      opt(e, 'Categories', 'category'),
    );
    const livePlaces: ComboOption[] = placeSuggestions.map((s) => ({
      id: s.id,
      label: s.name,
      meta: s.subtitle,
      group: 'Places',
      kind: 'place',
      value: s.name,
      coords: { lat: s.lat, lng: s.lng, bbox: s.bbox },
    }));
    const text: ComboOption = {
      id: 'text',
      label: `Items matching “${t}”`,
      group: 'Search',
      kind: 'item',
      value: t,
    };
    const where: ComboOption = {
      id: 'place',
      label: `Go to “${t}”`,
      group: 'Places',
      kind: 'place',
      value: t,
    };
    const placeOpts = livePlaces.length
      ? [...livePlaces, where]
      : [where];
    return foundItems.length || foundCats.length
      ? [...matchingRecents, ...foundItems, ...foundCats, ...placeOpts, text]
      : [...matchingRecents, ...placeOpts, text];
  }, [place, placeSuggestions, master, items, cats, recentSearches]);

  const pickHeader = (o: ComboOption) => {
    if (o.kind === 'item') {
      setItems((p) => (p.includes(o.value) ? p : [...p, o.value]));
      setPlace('');
      setPlaceSuggestions([]);
      recordRecent({
        kind: 'item',
        label: o.recent ? o.label : o.value,
        value: o.value,
      });
    } else if (o.kind === 'category') {
      setCats((p) => (p.includes(o.value) ? p : [...p, o.value]));
      setPlace('');
      setPlaceSuggestions([]);
      recordRecent({
        kind: 'category',
        label: o.recent ? o.label : o.value,
        value: o.value,
      });
    } else if (o.coords) {
      navigateToPlace({ ...o.coords, name: o.label }, o.value);
    } else {
      void searchPlace(o.value);
    }
  };

  const submitHeaderSearch = () => {
    const trimmed = place.trim();
    if (!trimmed) return;
    const lo = trimmed.toLowerCase();
    const exactMatch = Object.values(master).find((e) => e.name.toLowerCase() === lo);
    if (exactMatch && !/\d/.test(trimmed)) {
      if (exactMatch.type === 'category') {
        setCats((p) => (p.includes(exactMatch.name) ? p : [...p, exactMatch.name]));
        setPlace('');
        setPlaceSuggestions([]);
        recordRecent({ kind: 'category', label: exactMatch.name, value: exactMatch.name });
        return;
      }
      setItems((p) => (p.includes(exactMatch.name) ? p : [...p, exactMatch.name]));
      setPlace('');
      setPlaceSuggestions([]);
      recordRecent({ kind: 'item', label: exactMatch.name, value: exactMatch.name });
      return;
    }
    if (placeSuggestions.length > 0) {
      navigateToPlace(placeSuggestions[0], trimmed);
      return;
    }
    void searchPlace(trimmed);
  };

  const resolveAreaLabel = async (
    lat: number,
    lng: number,
    fallback: string,
    signal?: AbortSignal,
  ): Promise<string> => {
    try {
      const addr = await reverseGeocode(lat, lng, { signal });
      if (!addr) return fallback;
      const parts = [addr.city, addr.state].filter(Boolean);
      if (parts.length) return parts.join(', ');
      return addr.country || fallback;
    } catch {
      return fallback;
    }
  };

  // Automatically center the map on the user's GPS location (with IP city fallback) on first load
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    let permStatus: PermissionStatus | null = null;

    const applyLocation = (
      lat: number,
      lng: number,
      zoom: number,
      initialLabel: string,
      isGps: boolean,
    ) => {
      if (cancelled) return;
      if (isGps) {
        hasGpsRef.current = true;
        setUserLoc({ lat, lng, precise: true });
      } else if (!hasGpsRef.current) {
        setUserLoc({ lat, lng, precise: false });
      }

      if (!userMovedMapRef.current) {
        userAreaNameRef.current = initialLabel;
        setAreaName(initialLabel);
        goTo({ lat, lng, zoom });
      }

      if (isGps) {
        void resolveAreaLabel(lat, lng, initialLabel, ctrl.signal).then((label) => {
          if (cancelled) return;
          userAreaNameRef.current = label;
          if (!userMovedMapRef.current) {
            setAreaName(label);
          }
        });
      }
    };

    const runIpFallback = () => {
      void detectLocationByIp({ signal: ctrl.signal })
        .then((ip) => {
          if (cancelled || !ip || hasGpsRef.current) return;
          applyLocation(ip.lat, ip.lng, ip.zoom, ip.label, false);
        })
        .catch(() => {
          // Keep default map view if both GPS and IP lookup are unavailable
        });
    };

    const readGpsPosition = () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        runIpFallback();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            12,
            'Near you',
            true,
          );
        },
        () => {
          runIpFallback();
        },
        { enableHighAccuracy: false, maximumAge: 300_000, timeout: 6000 },
      );
    };

    const onPermChange = () => {
      if (permStatus?.state === 'granted' && !hasGpsRef.current) {
        readGpsPosition();
      }
    };

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (cancelled) return;
          permStatus = status;
          status.addEventListener?.('change', onPermChange);
          if (status.state === 'denied') {
            runIpFallback();
          } else {
            readGpsPosition();
          }
        })
        .catch(() => {
          readGpsPosition();
        });
    } else {
      readGpsPosition();
    }

    return () => {
      cancelled = true;
      ctrl.abort();
      permStatus?.removeEventListener?.('change', onPermChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = () => {
    if (locating) return;
    userMovedMapRef.current = true;
    const seq = ++navSeqRef.current;
    locateCtrlRef.current?.abort();
    const ctrl = new AbortController();
    locateCtrlRef.current = ctrl;
    setLocating(true);

    const finishWithIpFallback = () => {
      void detectLocationByIp({ signal: ctrl.signal })
        .then((ip) => {
          if (ctrl.signal.aborted) return;
          if (ip) {
            if (!hasGpsRef.current) {
              setUserLoc({ lat: ip.lat, lng: ip.lng, precise: false });
            }
            userAreaNameRef.current = ip.label;
            if (navSeqRef.current === seq) {
              setSelectedId(null);
              setTopHidden(false);
              setAreaName(ip.label);
              setPlace('');
              setPlaceSuggestions([]);
              goTo({ lat: ip.lat, lng: ip.lng, zoom: ip.zoom });
              scrollRef.current?.scrollTo({ top: 0 });
              showToast({
                msg: 'Showing your approximate location. Allow GPS for exact position.',
              });
            }
          } else if (navSeqRef.current === seq) {
            showToast({ msg: "Can't see your location. Try a city or ZIP code." });
          }
        })
        .catch(() => {
          if (!ctrl.signal.aborted && navSeqRef.current === seq) {
            showToast({ msg: "Can't see your location. Try a city or ZIP code." });
          }
        })
        .finally(() => {
          if (locateCtrlRef.current === ctrl) setLocating(false);
        });
    };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      finishWithIpFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (ctrl.signal.aborted) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        hasGpsRef.current = true;
        setUserLoc({ lat, lng, precise: true });
        if (navSeqRef.current === seq) {
          setSelectedId(null);
          setTopHidden(false);
          setAreaName('Near you');
          setPlace('');
          setPlaceSuggestions([]);
          goTo({ lat, lng, zoom: 13 });
          scrollRef.current?.scrollTo({ top: 0 });
        }
        if (locateCtrlRef.current === ctrl) setLocating(false);
        void resolveAreaLabel(lat, lng, 'Near you', ctrl.signal).then((label) => {
          if (ctrl.signal.aborted) return;
          userAreaNameRef.current = label;
          if (navSeqRef.current === seq) {
            setAreaName(label);
          }
        });
      },
      () => {
        if (ctrl.signal.aborted) return;
        finishWithIpFallback();
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8000 },
    );
  };

  // Mobile header/filter collapse measurement & orientation recovery
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const hd = app.querySelector('.header') as HTMLElement | null;
    const fl = app.querySelector('.panel > .filters') as HTMLElement | null;
    const ct = app.querySelector('.panel > .panel-count') as HTMLElement | null;
    const setVars = () => {
      if (hd) app.style.setProperty('--hh', `${hd.offsetHeight}px`);
      if (fl) app.style.setProperty('--fh', `${fl.offsetHeight}px`);
      if (ct) app.style.setProperty('--ch', `${ct.offsetHeight}px`);
    };
    setVars();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setVars) : null;
    if (ro) [hd, fl, ct].forEach((x) => x && ro.observe(x));

    const mq = window.matchMedia('(max-width: 767px)');
    let orientTimer: ReturnType<typeof setTimeout> | null = null;
    const onViewportShift = () => {
      setTopHidden(false);
      setVars();
      if (orientTimer) clearTimeout(orientTimer);
      orientTimer = setTimeout(() => {
        orientTimer = null;
        setVars();
      }, 160);
    };
    mq.addEventListener?.('change', onViewportShift);
    window.addEventListener('orientationchange', onViewportShift);
    return () => {
      if (orientTimer) clearTimeout(orientTimer);
      ro?.disconnect();
      mq.removeEventListener?.('change', onViewportShift);
      window.removeEventListener('orientationchange', onViewportShift);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || view !== 'list') {
      setTopHidden(false);
      return;
    }
    let last = el.scrollTop;
    let lock = 0;
    const onScroll = () => {
      if (!window.matchMedia('(max-width: 767px)').matches) {
        setTopHidden(false);
        return;
      }
      const now = Date.now();
      if (now < lock) {
        last = el.scrollTop;
        return;
      }
      const top = el.scrollTop;
      const d = top - last;
      if (top <= 8) {
        setTopHidden(false);
        last = top;
        return;
      }
      if (d > 10 && top > 120) {
        setTopHidden(true);
        lock = now + 350;
        last = top;
      } else if (d < -10) {
        setTopHidden(false);
        lock = now + 350;
        last = top;
      } else if (Math.abs(d) > 10) {
        last = top;
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [view]);

  const pinSelect = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setTimeout(() => {
        document
          .getElementById(`sale-${id}`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }
  };

  const closeDetails = () => {
    setSelectedId(null);
  };

  const openAdd = (pin?: { lat: number; lng: number } | null) => {
    opener.current = document.activeElement as HTMLElement | null;
    setDraftPin(pin || null);
    setAdding(true);
  };

  const closeAdd = () => {
    setAdding(false);
    setDraftPin(null);
    const o = opener.current;
    if (o && o.focus) setTimeout(() => o.focus(), 0);
  };

  const openProfile = () => {
    opener.current = document.activeElement as HTMLElement | null;
    setProfileOpen(true);
  };

  const closeProfile = () => {
    setProfileOpen(false);
    const o = opener.current;
    if (o && o.focus) setTimeout(() => o.focus(), 0);
  };

  const openAd = (ad: SponsorAd) => {
    opener.current = document.activeElement as HTMLElement | null;
    setActiveAd(ad);
  };

  const closeAd = () => {
    setActiveAd(null);
    const o = opener.current;
    if (o && o.focus) setTimeout(() => o.focus(), 0);
  };

  const acceptTerms = () => {
    setTermsAccepted(true);
    writeLocalFlag(TERMS_KEY, true);
  };

  const openLegal = (page: LegalPageId) => {
    setContactSeed(null);
    setLegalPage(page);
  };

  const reportSale = (s: Sale) => {
    setContactSeed({
      topic: 'Report an inaccurate or unsafe listing',
      message: `Listing: ${s.title}\nAddress: ${s.address}\n\nReason for report: `,
    });
    setLegalPage('contact');
  };

  const handleHoldSale = (id: string) => {
    const found = sales.find((x) => x.id === id);
    if (found) setHoldTarget({ kind: 'sale', sale: found });
  };

  const addSale = async (data: SaleDraft) => {
    if (Date.now() - lastAdd.current < 1500) return;
    lastAdd.current = Date.now();
    const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const sale: Sale = {
      ...data,
      id,
      ownerId: 'me',
      owner: user?.uid || undefined,
      local: !user,
    };

    setLocalDrafts((p) => [...p, sale]);
    const nextOrder = [sale.id, ...listingOrderRef.current.filter((x) => x !== sale.id)].slice(0, 200);
    listingOrderRef.current = nextOrder;
    setListingOrder(nextOrder);
    if (user) {
      void updateUserProfileFields(user.uid, { listingOrder: nextOrder }).catch(() => {});
    }
    setAdding(false);
    clearAll();
    setSelectedId(sale.id);
    setCenterReq({ id: sale.id, n: ++reqSeq.current });

    const o = opener.current;
    if (o && o.focus) setTimeout(() => o.focus(), 0);
    setTimeout(() => {
      document.getElementById(`sale-${sale.id}`)?.scrollIntoView({ block: 'nearest' });
    }, 50);

    const removeFromOrder = () => {
      const pruned = listingOrderRef.current.filter((x) => x !== sale.id);
      listingOrderRef.current = pruned;
      setListingOrder(pruned);
      if (user) {
        void updateUserProfileFields(user.uid, { listingOrder: pruned }).catch(() => {});
      }
    };

    if (user) {
      try {
        const res = await createSaleInCloud(sale);
        showToast({
          msg: res.droppedPhotos
            ? 'Your sale is up! Some extra photos were trimmed for size.'
            : 'Your sale is up!',
          undo: () => {
            setLocalDrafts((p) => p.filter((x) => x.id !== sale.id));
            setCloudSales((p) => p.filter((x) => x.id !== sale.id));
            removeFromOrder();
            void deleteSaleInCloud(sale.id).catch(() =>
              showToast({ msg: "Couldn't undo right now." }),
            );
            setSelectedId(null);
            dismissToast();
          },
        });
      } catch {
        setLocalDrafts((p) =>
          p.map((x) => (x.id === sale.id ? { ...x, local: true } : x)),
        );
        showToast({
          msg: 'Saved for this visit. Cloud sync failed.',
        });
      }
    } else {
      showToast({
        msg: 'Saved for this visit. Sign in with Google to share it with everyone.',
        undo: () => {
          setLocalDrafts((p) => p.filter((x) => x.id !== sale.id));
          removeFromOrder();
          setSelectedId(null);
          dismissToast();
        },
      });
    }
  };

  const updateSale = async (data: SaleDraft) => {
    if (!editing) return;
    const prevSnapshot = { ...editing };
    const updated: Sale = { ...editing, ...data };
    setEditing(null);
    setProfileOpen(true);

    if (updated.local || !user) {
      setLocalDrafts((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      showToast({ msg: 'Changes saved' });
      return;
    }

    setCloudSales((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    try {
      const res = await updateSaleInCloud(updated);
      showToast({
        msg: res.droppedPhotos
          ? 'Changes saved. Some extra photos were trimmed for size.'
          : 'Changes saved',
      });
    } catch {
      setCloudSales((p) => p.map((x) => (x.id === updated.id ? prevSnapshot : x)));
      showToast({ msg: "Couldn't save changes to the cloud." });
    }
  };

  const deleteSale = async (sl: Sale) => {
    if (selectedId === sl.id) setSelectedId(null);

    const wasSaved = savedRef.current.includes(sl.id);
    const prevOrder = listingOrderRef.current;
    const wasOrdered = prevOrder.includes(sl.id);

    const pruneRefs = () => {
      const nextSaved = wasSaved
        ? savedRef.current.filter((x) => x !== sl.id)
        : savedRef.current;
      const nextOrder = wasOrdered
        ? listingOrderRef.current.filter((x) => x !== sl.id)
        : listingOrderRef.current;
      if (wasSaved) {
        savedRef.current = nextSaved;
        setSaved(nextSaved);
      }
      if (wasOrdered) {
        listingOrderRef.current = nextOrder;
        setListingOrder(nextOrder);
      }
      if (user && (wasSaved || wasOrdered)) {
        void updateUserProfileFields(user.uid, {
          ...(wasSaved ? { savedIds: nextSaved } : {}),
          ...(wasOrdered ? { listingOrder: nextOrder } : {}),
        }).catch(() => {});
      }
    };

    const restoreRefs = () => {
      if (wasSaved && !savedRef.current.includes(sl.id)) {
        const restored = [...savedRef.current, sl.id].slice(0, 200);
        savedRef.current = restored;
        setSaved(restored);
        if (user) {
          void updateUserProfileFields(user.uid, { savedIds: restored }).catch(() => {});
        }
      }
      if (wasOrdered && !listingOrderRef.current.includes(sl.id)) {
        listingOrderRef.current = prevOrder;
        setListingOrder(prevOrder);
        if (user) {
          void updateUserProfileFields(user.uid, { listingOrder: prevOrder }).catch(() => {});
        }
      }
    };

    if (sl.local || !user) {
      setLocalDrafts((p) => p.filter((x) => x.id !== sl.id));
      pruneRefs();
      showToast({
        msg: 'Sale removed',
        undo: () => {
          setLocalDrafts((p) => [...p, sl]);
          restoreRefs();
          dismissToast();
        },
      });
      return;
    }

    const snapshot = { ...sl };
    setCloudSales((p) => p.filter((x) => x.id !== sl.id));
    pruneRefs();
    try {
      await deleteSaleInCloud(sl.id);
      showToast({
        msg: 'Sale removed',
        undo: () => {
          void createSaleInCloud(snapshot)
            .then(() => restoreRefs())
            .catch(() => showToast({ msg: "Couldn't restore that sale." }));
          dismissToast();
        },
      });
    } catch {
      setCloudSales((p) => (p.some((x) => x.id === sl.id) ? p : [...p, sl]));
      restoreRefs();
      showToast({ msg: "Couldn't remove that sale. It's back in your list." });
    }
  };

  const handleReorderMine = (orderedIds: string[]) => {
    const clean = Array.from(new Set(orderedIds)).slice(0, 200);
    listingOrderRef.current = clean;
    setListingOrder(clean);
    if (user) {
      setUser((u) => (u ? { ...u, listingOrder: clean } : u));
      void updateUserProfileFields(user.uid, { listingOrder: clean }).catch(() => {
        showToast({ msg: "Couldn't save your listing order right now." });
      });
    }
  };

  const selected = matches.find((s) => s.id === selectedId);
  const activeSavedCount = useMemo(() => {
    if (!saved.length) return 0;
    const savedSet = new Set(saved);
    let count = 0;
    for (const s of sales) {
      if (dayDiff(s.date) >= 0 && savedSet.has(s.id)) count++;
    }
    return count;
  }, [sales, saved]);
  const mine = useMemo(() => {
    const raw = sales.filter((x) => x.ownerId === 'me');
    if (raw.length <= 1 || listingOrder.length === 0) return raw;
    const rank = new Map<string, number>();
    listingOrder.forEach((id, idx) => rank.set(id, idx));
    return [...raw].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id)! : -1;
      const rb = rank.has(b.id) ? rank.get(b.id)! : -1;
      if (ra === -1 && rb === -1) return 0;
      if (ra === -1) return -1;
      if (rb === -1) return 1;
      return ra - rb;
    });
  }, [sales, listingOrder]);

  const filterProps = {
    savedCount: activeSavedCount,
    onlySaved,
    onToggleOnlySaved: () => setOnlySaved((v) => !v),
    payF,
    onRemovePay: (id: string) => setPayF((p) => p.filter((x) => x !== id)),
    items,
    onRemoveItem: (item: string) =>
      setItems((p) => p.filter((x) => x !== item)),
    when,
    onToggleWhen: (target: 'today' | 'weekend') =>
      setWhen((p) => (p === target ? null : target)),
    canSortNearest: !!userLoc,
    sortBy,
    onToggleNearest: () =>
      setSortBy((p) => (p === 'nearest' ? 'soonest' : 'nearest')),
    onOpenPaySheet: () => setPaySheet(true),
    saleType,
    onToggleSaleType: (t: SaleType) =>
      setSaleType((p) => (p === t ? null : t)),
    filterCats,
    activeCats: cats,
    onToggleCat: toggleCat,
    hasFilters,
    onClearAll: clearAll,
  };

  const locatedNearMe = Boolean(
    userLoc &&
      areaName &&
      (areaName === 'Near you' || areaName === userAreaNameRef.current),
  );

  return (
    <div
      className={`app${view === 'list' ? ' is-list' : ''}${topHidden && view === 'list' ? ' top-hidden' : ''}`}
      ref={appRef}
    >
      <SeoHead selected={selected} sales={visible} legalPage={legalPage} />
      <Header
        place={place}
        onPlaceChange={setPlace}
        options={headerOptions}
        onPickOption={pickHeader}
        onSubmitSearch={submitHeaderSearch}
        onClearRecent={() => setRecentSearches([])}
        onLocateMe={locateMe}
        searching={searching}
        locating={locating}
        located={locatedNearMe}
        user={user}
        onOpenAdd={() => openAdd()}
        onOpenProfile={openProfile}
        onGoHome={goHome}
      />

      <FilterBar>
        <FilterChips floating={false} bar {...filterProps} />
      </FilterBar>

      <main className="main" data-view={view}>
        <section className="panel" aria-label="Sale listings">
          <FilterChips floating={false} {...filterProps} />
          <div className="panel-count">
            <strong>
              {loading
                ? 'Finding sales…'
                : `${visible.length} ${visible.length === 1 ? 'sale' : 'sales'}`}
            </strong>
            <span>{areaName || 'Current map area'}</span>
          </div>
          <div className="panel-scroll" ref={scrollRef}>
            <SaleList
              loading={loading}
              visible={visible}
              matches={matches}
              hasFilters={hasFilters}
              selectedId={selectedId}
              saved={saved}
              userLoc={userLoc}
              onToggleCard={toggleCard}
              onHover={setHoverId}
              onHold={handleHoldSale}
              onSave={toggleSave}
              onOpenAd={openAd}
              onClearAll={clearAll}
              onShowMatchesOnMap={goTo}
              onOpenAdd={() => openAdd()}
              areaName={areaName}
              onResetArea={browseSampleSales}
            />
            {!loading && (
              <ListFooter signedIn={!!user} onOpenLegal={openLegal} />
            )}
          </div>
        </section>

        <section className="pane-map" aria-label="Map">
          <SaleMap
            sales={matches}
            selectedId={selectedId}
            hoverId={hoverId}
            onSelect={pinSelect}
            onPinHold={handleHoldSale}
            onMapHold={(ll) => setHoldTarget({ kind: 'spot', ...ll })}
            centerReq={centerReq}
            viewReq={viewReq}
            onView={onView}
            userLoc={userLoc}
          />
          <div className="map-filters">
            <FilterChips floating {...filterProps} />
          </div>
        </section>

        {selected && (
          <SaleDetails
            s={selected}
            saved={saved.includes(selected.id)}
            onSave={toggleSave}
            onClose={closeDetails}
            onReport={reportSale}
            onToast={(msg) => showToast({ msg })}
            userLoc={userLoc}
          />
        )}
      </main>

      <BottomBar
        view={view}
        onChangeView={setView}
        onOpenAdd={() => openAdd()}
        onOpenProfile={openProfile}
        user={user}
      />

      {profileOpen && (
        <ProfileDialog
          onClose={closeProfile}
          user={user}
          signingIn={signingIn}
          onSignIn={handleSignIn}
          onUpdateName={handleUpdateName}
          onPayments={handleUpdatePayments}
          onSignOut={handleSignOut}
          mine={mine}
          onEdit={(sl) => {
            setProfileOpen(false);
            setEditing(sl);
          }}
          onDelete={deleteSale}
          onReorder={handleReorderMine}
          onView={(id) => {
            setProfileOpen(false);
            if (!matches.some((x) => x.id === id)) clearAll();
            setSelectedId(id);
            setView('map');
            setCenterReq({ id, n: ++reqSeq.current });
          }}
          onAdd={() => {
            setProfileOpen(false);
            openAdd();
          }}
          termsAccepted={termsAccepted}
          onAcceptTerms={acceptTerms}
          onOpenLegal={openLegal}
        />
      )}

      {paySheet && (
        <PaySheet
          value={payF}
          onChange={setPayF}
          onClose={() => setPaySheet(false)}
          count={visible.length}
        />
      )}

      {editing && (
        <AddSaleDialog
          initial={editing}
          onClose={() => {
            setEditing(null);
            setProfileOpen(true);
          }}
          onSubmit={updateSale}
          master={master}
          defaultPay={user?.payments}
          start={null}
          signedIn={!!user}
          onSignIn={handleSignIn}
          termsAccepted={termsAccepted}
          onAcceptTerms={acceptTerms}
          onOpenLegal={openLegal}
        />
      )}

      {adding && (
        <AddSaleDialog
          onClose={closeAdd}
          onSubmit={addSale}
          master={master}
          initialPin={draftPin}
          defaultPay={user?.payments}
          start={
            draftPin
              ? { lat: draftPin.lat, lng: draftPin.lng, zoom: 15 }
              : mapView
                ? {
                    lat: mapView.lat,
                    lng: mapView.lng,
                    zoom: Math.max(mapView.zoom, 12),
                  }
                : null
          }
          signedIn={!!user}
          onSignIn={handleSignIn}
          termsAccepted={termsAccepted}
          onAcceptTerms={acceptTerms}
          onOpenLegal={openLegal}
        />
      )}

      {activeAd && (
        <AdDialog
          ad={activeAd}
          onClose={closeAd}
          onAddSale={() => {
            setActiveAd(null);
            openAdd();
          }}
          onAdvertise={() => {
            setActiveAd(null);
            setContactSeed({
              topic: 'Local sponsor advertising',
              message: 'Business name:\nNeighborhood / city:\nOffer details: ',
            });
            setLegalPage('contact');
          }}
        />
      )}

      {holdTarget && (
        <QuickActionsSheet
          target={holdTarget}
          saved={
            holdTarget.kind === 'sale'
              ? saved.includes(holdTarget.sale.id)
              : false
          }
          onClose={() => setHoldTarget(null)}
          onSave={toggleSave}
          onShowOnMap={(id) => {
            setSelectedId(id);
            setView('map');
            setCenterReq({ id, n: ++reqSeq.current });
          }}
          onViewDetails={(id) => setSelectedId(id)}
          onPostAtSpot={(ll) => openAdd(ll)}
          onReport={reportSale}
          onToast={(msg) => showToast({ msg })}
        />
      )}

      {legalPage && (
        <LegalDialog
          page={legalPage}
          onChangePage={setLegalPage}
          onClose={() => {
            setLegalPage(null);
            setContactSeed(null);
          }}
          termsAccepted={termsAccepted}
          onAcceptTerms={acceptTerms}
          contactSeed={contactSeed}
        />
      )}

      {!termsAccepted &&
        !legalPage &&
        !adding &&
        !editing &&
        !profileOpen &&
        !paySheet &&
        !activeAd &&
        !holdTarget && (
          <TermsBanner onOpenLegal={openLegal} onAccept={acceptTerms} />
        )}

      <Toast toast={toast} />
    </div>
  );
}
