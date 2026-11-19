import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { CC_CUR, curOf, SALE_TYPES, saleTypeOf } from '../data/seedSales';
import type { MasterTaxonomy, Sale, SaleDraft, SaleType, ViewReq } from '../types/sale';
import { composeFullAddress, parseFullAddress } from '../utils/address';
import {
  addDays,
  cap,
  countMeta,
  dayDiff,
  iso,
  itemsFor,
  MAX_PHOTOS,
  mkey,
  norm,
  primaryCat,
  ranked,
  searchMaster,
  shrinkPhoto,
  todayStart,
} from '../utils/format';
import { geocode, reverseGeocode } from '../utils/geocode';
import { Combobox, type ComboOption } from './Combobox';
import { Chip, FoodIcon, Icon, LemonIcon, PayPicker } from './Icons';
import type { LegalPageId } from './LegalDialog';
import { ModalDialog } from './ModalDialog';
import { TermsConsentField } from './SaleActions';
import { SaleMap } from './SaleMap';

type Step = 1 | 2 | 3;

interface FormState {
  title: string;
  street: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  date: string;
  start: string;
  end: string;
  saleType: SaleType;
  cats: string[];
  items: string[];
  prices: Record<string, number>;
  level: number;
  cur: string;
  food: boolean;
  drinks: boolean;
  photos: string[];
  pay: string[];
  desc: string;
  pin: { lat: number; lng: number } | null;
}

const STEPS: ReadonlyArray<{ id: Step; label: string }> = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Address' },
  { id: 3, label: 'Photos & items' },
];

export function AddSaleDialog({
  onClose,
  onSubmit,
  start,
  master,
  initial,
  initialPin,
  defaultPay,
  signedIn,
  onSignIn,
  termsAccepted,
  onAcceptTerms,
  onOpenLegal,
}: {
  onClose: () => void;
  onSubmit: (data: SaleDraft) => void;
  start: { lat: number; lng: number; zoom: number } | null;
  master: MasterTaxonomy;
  initial?: Sale | null;
  initialPin?: { lat: number; lng: number } | null;
  defaultPay?: string[];
  signedIn: boolean;
  onSignIn: () => void;
  termsAccepted: boolean;
  onAcceptTerms: () => void;
  onOpenLegal: (page: LegalPageId) => void;
}) {
  const sat = (() => {
    const t = todayStart();
    return addDays(t, (6 - t.getDay() + 7) % 7);
  })();
  const [step, setStep] = useState<Step>(1);
  const [f, setF] = useState<FormState>(() => {
    if (initial) {
      const addr = parseFullAddress(initial.address);
      return {
        title: initial.title,
        ...addr,
        date: initial.date,
        start: initial.start,
        end: initial.end,
        saleType: saleTypeOf(initial.saleType),
        cats: initial.cats.slice(),
        items: (initial.items || []).slice(),
        prices: { ...(initial.prices || {}) },
        level: initial.level || 0,
        cur: curOf(initial),
        food: !!initial.food,
        drinks: !!initial.drinks,
        photos: (initial.photos || []).filter((x) => typeof x === 'string'),
        pay: (initial.pay || []).slice(),
        desc: initial.desc || '',
        pin: { lat: initial.lat, lng: initial.lng },
      };
    }
    return {
      title: '',
      street: '',
      city: '',
      state: '',
      postal: '',
      country: '',
      date: iso(sat),
      start: '08:00',
      end: '14:00',
      saleType: 'Garage Sale',
      cats: [],
      items: [],
      prices: {},
      level: 0,
      cur: 'USD',
      food: false,
      drinks: false,
      photos: [],
      pay: defaultPay && defaultPay.length ? defaultPay.slice() : ['cash'],
      desc: '',
      pin: initialPin || null,
    };
  });

  const [itemQ, setItemQ] = useState('');
  const [catQ, setCatQ] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busyPhotos, setBusyPhotos] = useState(0);
  const [finding, setFinding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(!!initial || termsAccepted);
  const [curTouched] = useState(!!initial);
  const [pickView, setPickView] = useState<ViewReq | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  const geoSeq = useRef(0);
  const geoCtrlRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const pickViewSeq = useRef(0);
  const pinModeRef = useRef<'address' | 'manual' | null>(
    initialPin ? 'manual' : initial ? 'address' : null,
  );
  const pinMatchedAddrRef = useRef<string | null>(
    initial ? composeFullAddress(parseFullAddress(initial.address)) : null,
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      geoCtrlRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (termsAccepted) setAcceptedTerms(true);
  }, [termsAccepted]);

  useEffect(() => {
    if (initialPin && !initial) {
      void fillFromPin(initialPin.lat, initialPin.lng, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const fullAddress = composeFullAddress(f);

  const focusFirstInvalid = () => {
    setTimeout(() => {
      const bad = bodyRef.current?.querySelector(
        '[aria-invalid="true"], [data-invalid="true"]',
      );
      if (bad) {
        const t = bad.matches('input,textarea')
          ? (bad as HTMLElement)
          : (bad.querySelector('[tabindex="0"], button') as HTMLElement | null);
        t?.focus();
      }
    }, 0);
  };

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step]);

  const topCats = ranked(master, 'category')
    .slice(0, 8)
    .map((e) => e.name);
  const catChips = [...topCats, ...f.cats.filter((c) => !topCats.includes(c))];

  const toggleCat = (c: string) =>
    setF((p) => {
      if (p.cats.includes(c)) {
        return { ...p, cats: p.cats.filter((x) => x !== c) };
      }
      if (p.cats.length >= 40) return p;
      return { ...p, cats: [...p.cats, c] };
    });

  const addCat = (name: string) => {
    const n = cap(norm(name));
    if (!n) return;
    const e = master[mkey('category', n)];
    const nm = e ? e.name : n;
    setF((p) =>
      p.cats.length >= 40 ||
      p.cats.some((c) => mkey('category', c) === mkey('category', nm))
        ? p
        : { ...p, cats: [...p.cats, nm] },
    );
  };

  const catOptions: ComboOption[] = (() => {
    const t = catQ.trim();
    if (!t) return [];
    const found: ComboOption[] = searchMaster(master, 'category', t, f.cats, 5).map(
      (e) => ({
        id: `cat:${e.name}`,
        label: e.name,
        meta: countMeta(e),
        value: e.name,
      }),
    );
    const exact =
      !!master[mkey('category', t)] ||
      f.cats.some((c) => mkey('category', c) === mkey('category', t));
    return exact
      ? found
      : [
          ...found,
          {
            id: 'newcat',
            label: `Add “${cap(norm(t))}”`,
            meta: 'New',
            value: t,
          },
        ];
  })();

  const popular = itemsFor(master, f.cats, 12).map((e) => e.name);
  const itemChips = [
    ...popular,
    ...f.items.filter((i) => !popular.includes(i)),
  ];

  const addItem = (name: string) => {
    const n = cap(norm(name));
    if (!n) return;
    const e = master[mkey('item', n)];
    const pc = e && Object.keys(e.cats).length ? primaryCat(e) : null;
    setF((p) =>
      p.items.some((x) => mkey('item', x) === mkey('item', n)) ||
      p.items.length >= 30
        ? p
        : {
            ...p,
            items: [...p.items, e ? e.name : n],
            cats: pc && !p.cats.includes(pc) ? [...p.cats, pc] : p.cats,
          },
    );
  };

  const toggleItem = (i: string) =>
    f.items.includes(i)
      ? set(
          'items',
          f.items.filter((x) => x !== i),
        )
      : addItem(i);

  const itemOptions: ComboOption[] = (() => {
    const t = itemQ.trim();
    if (!t) return [];
    const found: ComboOption[] = searchMaster(master, 'item', t, f.items, 6).map(
      (e) => ({
        id: `c:${e.name}`,
        label: e.name,
        meta: countMeta(e),
        value: e.name,
      }),
    );
    const exact =
      !!master[mkey('item', t)] ||
      f.items.some((i) => mkey('item', i) === mkey('item', t));
    return exact
      ? found
      : [
          ...found,
          {
            id: 'new',
            label: `Add “${cap(norm(t))}”`,
            meta: 'New',
            value: t,
          },
        ];
  })();

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const room = MAX_PHOTOS - f.photos.length - busyPhotos;
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, room));
    e.target.value = '';
    if (!files.length) return;
    setErrors((er) => ({ ...er, photos: undefined }));
    setBusyPhotos((b) => b + files.length);
    let failed = 0;
    for (const file of files) {
      try {
        const out = await shrinkPhoto(file);
        if (!mountedRef.current) return;
        if (out) {
          setF((p) =>
            p.photos.length >= MAX_PHOTOS
              ? p
              : { ...p, photos: [...p.photos, out] },
          );
        }
      } catch {
        if (!mountedRef.current) return;
        failed++;
      }
      if (!mountedRef.current) return;
      setBusyPhotos((b) => Math.max(0, b - 1));
    }
    if (mountedRef.current && failed > 0) {
      setErrors((er) => ({
        ...er,
        photos:
          failed === 1
            ? "One file couldn't be read as an image."
            : `${failed} files couldn't be read as images.`,
      }));
    }
  };

  const startGeoController = () => {
    geoCtrlRef.current?.abort();
    const ctrl = new AbortController();
    geoCtrlRef.current = ctrl;
    return ctrl;
  };

  const fillFromPin = async (
    lat: number,
    lng: number,
    overwriteAddress: boolean,
  ) => {
    const seq = ++geoSeq.current;
    const ctrl = startGeoController();
    try {
      const rev = await reverseGeocode(lat, lng, { signal: ctrl.signal });
      if (!mountedRef.current || ctrl.signal.aborted || seq !== geoSeq.current || !rev) return;
      setF((p) => {
        const emptyAddr = !p.street.trim() && !p.city.trim();
        const shouldFill = overwriteAddress || emptyAddr;
        return {
          ...p,
          street: shouldFill && rev.street ? rev.street : p.street,
          city: shouldFill && rev.city ? rev.city : p.city,
          state: shouldFill && rev.state ? rev.state : p.state,
          postal: shouldFill && rev.postal ? rev.postal : p.postal,
          country: shouldFill && rev.country ? rev.country : p.country,
          cur: !curTouched && rev.cc && CC_CUR[rev.cc] ? CC_CUR[rev.cc] : p.cur,
        };
      });
      if (overwriteAddress) {
        setErrors((er) => ({ ...er, street: undefined, city: undefined, geo: undefined }));
      }
    } catch {
      // keep silent when aborted, offline, or reverse lookup unavailable
    }
  };

  const findAddr = async (): Promise<boolean> => {
    const queryText = fullAddress.trim();
    if (finding || !queryText) return false;
    const seq = ++geoSeq.current;
    const ctrl = startGeoController();
    setFinding(true);
    setErrors((e) => ({ ...e, geo: undefined }));
    let found = false;
    try {
      const g = await geocode(queryText, { signal: ctrl.signal });
      if (!mountedRef.current || ctrl.signal.aborted) return false;
      if (seq === geoSeq.current && g) {
        pinModeRef.current = 'address';
        pinMatchedAddrRef.current = queryText;
        setF((p) => ({
          ...p,
          pin: { lat: g.lat, lng: g.lng },
          cur: !curTouched && g.cc && CC_CUR[g.cc] ? CC_CUR[g.cc] : p.cur,
        }));
        setPickView({ lat: g.lat, lng: g.lng, zoom: 16, n: ++pickViewSeq.current });
        setErrors((e) => ({ ...e, pin: undefined, geo: undefined }));
        found = true;
      } else if (seq === geoSeq.current) {
        setErrors((e) => ({
          ...e,
          geo: "Couldn't find that address. Tap the map below to drop your pin.",
        }));
      }
    } catch {
      if (mountedRef.current && !ctrl.signal.aborted && seq === geoSeq.current) {
        setErrors((e) => ({
          ...e,
          geo: "Address search isn't available here. Tap the map below to drop your pin.",
        }));
      }
    } finally {
      if (mountedRef.current) setFinding(false);
    }
    return found;
  };

  const locatePin = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      setErrors((e) => ({
        ...e,
        geo: 'Location access is unavailable. Enter your address or tap the map.',
      }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mountedRef.current) return;
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        pinModeRef.current = 'manual';
        pinMatchedAddrRef.current = null;
        setF((p) => ({ ...p, pin: ll }));
        setPickView({ lat: ll.lat, lng: ll.lng, zoom: 16, n: ++pickViewSeq.current });
        setErrors((e) => ({ ...e, pin: undefined, geo: undefined }));
        await fillFromPin(ll.lat, ll.lng, true);
        if (mountedRef.current) setLocating(false);
      },
      () => {
        if (!mountedRef.current) return;
        setLocating(false);
        setErrors((e) => ({
          ...e,
          geo: "Couldn't read your current location. Enter your address or tap the map.",
        }));
      },
      { timeout: 8000 },
    );
  };

  const validateStep1 = (): Record<string, string | undefined> => {
    const er: Record<string, string | undefined> = {};
    if (!f.title.trim()) er.title = 'Give your sale a name.';
    if (!f.date || (dayDiff(f.date) < 0 && f.date !== initial?.date))
      er.date = 'Pick today or a day coming up.';
    if (!f.start || !f.end || f.end <= f.start)
      er.end = 'Closing time should come after opening.';
    return er;
  };

  const validateStep2 = (hasPin: boolean): Record<string, string | undefined> => {
    const er: Record<string, string | undefined> = {};
    if (!f.street.trim()) er.street = 'Add your street address.';
    if (!f.street.includes(',') && !f.city.trim()) {
      er.city = 'Add your city or town.';
    }
    if (!hasPin) er.pin = 'Tap the map to drop your pin.';
    return er;
  };

  const goNext = async () => {
    if (step === 1) {
      const er = validateStep1();
      setErrors(er);
      if (Object.values(er).some(Boolean)) {
        focusFirstInvalid();
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const preEr = validateStep2(true);
      if (Object.values(preEr).some(Boolean)) {
        setErrors(preEr);
        focusFirstInvalid();
        return;
      }
      const needsAddrLookup =
        !f.pin ||
        (pinModeRef.current === 'address' &&
          pinMatchedAddrRef.current !== fullAddress.trim());
      if (needsAddrLookup) {
        const ok = await findAddr();
        if (!ok && !f.pin) {
          setErrors((er) => ({
            ...er,
            pin: 'Tap the map to place your sale pin.',
          }));
          focusFirstInvalid();
          return;
        }
      }
      setErrors({});
      setStep(3);
    }
  };

  const jumpToStep = (target: Step) => {
    if (target === step) return;
    if (target < step || initial) {
      setErrors({});
      setStep(target);
      return;
    }
    if (step === 1 && target > 1) {
      const er = validateStep1();
      setErrors(er);
      if (Object.values(er).some(Boolean)) {
        focusFirstInvalid();
        return;
      }
      if (target === 2) {
        setStep(2);
        return;
      }
      // Target 3 from Step 1 only allowed if Step 2 is already valid with a pin
      const er2 = validateStep2(!!f.pin);
      if (Object.values(er2).some(Boolean)) {
        setStep(2);
        return;
      }
      setStep(3);
      return;
    }
    if (step === 2 && target === 3) {
      void goNext();
    }
  };


  const finishSubmit = async () => {
    if (sent.current || busyPhotos > 0) return;
    const er1 = validateStep1();
    if (Object.values(er1).some(Boolean)) {
      setStep(1);
      setErrors(er1);
      focusFirstInvalid();
      return;
    }
    let hasPin = !!f.pin;
    let nextLat = f.pin?.lat;
    let nextLng = f.pin?.lng;
    if (
      pinModeRef.current === 'address' &&
      pinMatchedAddrRef.current !== fullAddress.trim() &&
      fullAddress.trim()
    ) {
      const seq = ++geoSeq.current;
      const ctrl = startGeoController();
      setFinding(true);
      try {
        const g = await geocode(fullAddress.trim(), { signal: ctrl.signal });
        if (!mountedRef.current || ctrl.signal.aborted) return;
        if (seq === geoSeq.current && g) {
          pinMatchedAddrRef.current = fullAddress.trim();
          hasPin = true;
          nextLat = g.lat;
          nextLng = g.lng;
          setF((p) => ({
            ...p,
            pin: { lat: g.lat, lng: g.lng },
            cur: !curTouched && g.cc && CC_CUR[g.cc] ? CC_CUR[g.cc] : p.cur,
          }));
        }
      } catch {
        // keep existing pin if offline
      } finally {
        if (mountedRef.current) setFinding(false);
      }
    }
    const er2 = validateStep2(hasPin);
    if (Object.values(er2).some(Boolean)) {
      setStep(2);
      setErrors(er2);
      focusFirstInvalid();
      return;
    }
    if (!initial && !acceptedTerms) {
      setStep(3);
      setErrors((er) => ({
        ...er,
        terms: 'Please accept the Terms & Conditions to post your sale.',
      }));
      focusFirstInvalid();
      return;
    }
    if (!termsAccepted) onAcceptTerms();
    sent.current = true;
    onSubmit({
      title: f.title.trim(),
      address: fullAddress || f.street.trim(),
      date: f.date,
      start: f.start,
      end: f.end,
      saleType: f.saleType,
      cats: f.cats.length ? f.cats : ['Household'],
      items: f.items,
      prices: Object.fromEntries(
        f.items.filter((i) => f.prices[i] > 0).map((i) => [i, f.prices[i]]),
      ),
      level: f.level,
      cur: f.cur,
      food: !!f.food,
      drinks: !!f.drinks,
      photos: f.photos,
      pay: f.pay,
      desc: f.desc.trim(),
      lat: nextLat ?? f.pin!.lat,
      lng: nextLng ?? f.pin!.lng,
    });
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      void goNext();
      return;
    }
    void finishSubmit();
  };

  return (
    <ModalDialog
      asForm
      labelledBy="add-title"
      onClose={onClose}
      onSubmit={handleFormSubmit}
      noValidate
      suppressEscapeSelector=".legal-scrim"
      autoFocusSelector='input:not([type="file"]), textarea'
      autoFocusKey={step}
    >
        <div className="dialog-head">
          <div>
            <h2 id="add-title">{initial ? 'Edit your sale' : 'Add a sale'}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>

        <nav className="stepper" aria-label="Listing steps">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`step-tab${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                aria-current={active ? 'step' : undefined}
                onClick={() => jumpToStep(s.id)}
              >
                <span className="step-num">{done ? '✓' : s.id}</span>
                <span className="step-lbl">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="dialog-body" ref={bodyRef}>
          {step === 1 && (
            <>
              {!signedIn && !initial && (
                <div className="demo-note flex items-center justify-between gap-3">
                  <span>
                    Sign in with Google to publish your sale to everyone on Stoop.
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm shrink-0"
                    onClick={onSignIn}
                  >
                    Sign in
                  </button>
                </div>
              )}

              <div className="field">
                <label htmlFor="f-title">Sale name</label>
                <input
                  id="f-title"
                  className="input"
                  aria-invalid={errors.title ? 'true' : undefined}
                  aria-describedby={errors.title ? 'f-title-err' : undefined}
                  value={f.title}
                  placeholder="Saturday garage sale, tools & furniture"
                  maxLength={120}
                  onChange={(e) => {
                    set('title', e.target.value);
                    if (errors.title) setErrors((er) => ({ ...er, title: undefined }));
                  }}
                  autoComplete="off"
                />
                {errors.title && (
                  <div className="error" id="f-title-err">
                    {errors.title}
                  </div>
                )}
              </div>

              <div className="field">
                <span className="label" id="sale-type-label">
                  Sale type
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="sale-type-label"
                  className="flex flex-wrap gap-2"
                  onKeyDown={(e) => {
                    if (
                      e.key !== 'ArrowRight' &&
                      e.key !== 'ArrowDown' &&
                      e.key !== 'ArrowLeft' &&
                      e.key !== 'ArrowUp'
                    ) {
                      return;
                    }
                    e.preventDefault();
                    const curIdx = SALE_TYPES.indexOf(f.saleType);
                    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
                    const nextIdx = (curIdx + delta + SALE_TYPES.length) % SALE_TYPES.length;
                    set('saleType', SALE_TYPES[nextIdx]);
                    const radios = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
                    radios[nextIdx]?.focus();
                  }}
                >
                  {SALE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={f.saleType === t}
                      tabIndex={f.saleType === t ? 0 : -1}
                      className="chip"
                      onClick={() => set('saleType', t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row">
                <div className="field wide">
                  <label htmlFor="f-date">Date</label>
                  <input
                    id="f-date"
                    className="input"
                    type="date"
                    value={f.date}
                    min={iso(todayStart())}
                    aria-invalid={errors.date ? 'true' : undefined}
                    aria-describedby={errors.date ? 'f-date-err' : undefined}
                    onChange={(e) => {
                      set('date', e.target.value);
                      if (errors.date) setErrors((er) => ({ ...er, date: undefined }));
                    }}
                  />
                  {errors.date && (
                    <div className="error" id="f-date-err">
                      {errors.date}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="f-start">Opens</label>
                  <input
                    id="f-start"
                    className="input"
                    type="time"
                    value={f.start}
                    onChange={(e) => {
                      set('start', e.target.value);
                      if (errors.end) setErrors((er) => ({ ...er, end: undefined }));
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-end">Closes</label>
                  <input
                    id="f-end"
                    className="input"
                    type="time"
                    value={f.end}
                    aria-invalid={errors.end ? 'true' : undefined}
                    aria-describedby={errors.end ? 'f-end-err' : undefined}
                    onChange={(e) => {
                      set('end', e.target.value);
                      if (errors.end) setErrors((er) => ({ ...er, end: undefined }));
                    }}
                  />
                  {errors.end && (
                    <div className="error" id="f-end-err">
                      {errors.end}
                    </div>
                  )}
                </div>
              </div>

              <div className="field">
                <label htmlFor="f-desc">Highlights & notes (optional)</label>
                <textarea
                  id="f-desc"
                  className="input"
                  value={f.desc}
                  maxLength={2000}
                  placeholder="Early birds, big-ticket items, driveway parking notes…"
                  onChange={(e) => set('desc', e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="field">
                <label htmlFor="f-street">Street address</label>
                <input
                  id="f-street"
                  className="input"
                  aria-invalid={errors.street ? 'true' : undefined}
                  aria-describedby={errors.street ? 'f-street-err' : undefined}
                  value={f.street}
                  placeholder="123 Main St, Apt 2B"
                  maxLength={120}
                  onChange={(e) => {
                    set('street', e.target.value);
                    if (errors.street) setErrors((er) => ({ ...er, street: undefined }));
                  }}
                  autoComplete="street-address"
                />
                {errors.street && (
                  <div className="error" id="f-street-err">
                    {errors.street}
                  </div>
                )}
              </div>

              <div className="addr-grid">
                <div className="field">
                  <label htmlFor="f-city">City / Town</label>
                  <input
                    id="f-city"
                    className="input"
                    aria-invalid={errors.city ? 'true' : undefined}
                    aria-describedby={errors.city ? 'f-city-err' : undefined}
                    value={f.city}
                    placeholder="Evansville"
                    maxLength={80}
                    onChange={(e) => {
                      set('city', e.target.value);
                      if (errors.city) setErrors((er) => ({ ...er, city: undefined }));
                    }}
                    autoComplete="address-level2"
                  />
                  {errors.city && (
                    <div className="error" id="f-city-err">
                      {errors.city}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="f-state">State / Region</label>
                  <input
                    id="f-state"
                    className="input"
                    value={f.state}
                    placeholder="IN"
                    maxLength={40}
                    onChange={(e) => set('state', e.target.value)}
                    autoComplete="address-level1"
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-postal">ZIP / Postal code</label>
                  <input
                    id="f-postal"
                    className="input"
                    value={f.postal}
                    placeholder="47714"
                    maxLength={20}
                    onChange={(e) => set('postal', e.target.value)}
                    autoComplete="postal-code"
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-country">Country (optional)</label>
                  <input
                    id="f-country"
                    className="input"
                    value={f.country}
                    placeholder="United States"
                    maxLength={60}
                    onChange={(e) => set('country', e.target.value)}
                    autoComplete="country-name"
                  />
                </div>
              </div>

              {fullAddress && (
                <div className="addr-preview">
                  <span>Full address shown to shoppers:</span>
                  <b>{fullAddress}</b>
                </div>
              )}

              <div className="field">
                <div className="addr-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={finding || !fullAddress}
                    onClick={() => void findAddr()}
                  >
                    <Icon name="search" size={14} />
                    {finding ? 'Finding…' : 'Find on map'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={locating}
                    onClick={locatePin}
                  >
                    <Icon name="locate" size={14} />
                    {locating ? 'Locating…' : 'Use my location'}
                  </button>
                </div>

                <div
                  className="pick-map"
                  data-invalid={errors.pin ? 'true' : 'false'}
                >
                  <SaleMap
                    sales={[]}
                    pick
                    start={
                      f.pin
                        ? { lat: f.pin.lat, lng: f.pin.lng, zoom: 16 }
                        : start
                    }
                    pin={f.pin}
                    viewReq={pickView}
                    onPick={(ll) => {
                      pinModeRef.current = 'manual';
                      pinMatchedAddrRef.current = null;
                      set('pin', ll);
                      setErrors((e) => ({ ...e, pin: undefined, geo: undefined }));
                      void fillFromPin(ll.lat, ll.lng, false);
                    }}
                    note={
                      f.pin
                        ? 'Pin placed. Tap or drag the pin to adjust it.'
                        : 'Tap the map or click Find on map'
                    }
                  />
                </div>
                {errors.pin ? (
                  <div className="error">{errors.pin}</div>
                ) : errors.geo ? (
                  <div className="error">{errors.geo}</div>
                ) : (
                  <div className="hint">
                    {f.pin
                      ? 'Shoppers will use your exact pin and address for directions.'
                      : 'Tapping the map on a blank address also fills your street, city, and ZIP.'}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="field">
                <span className="label" id="photo-label">
                  Photos (optional)
                </span>
                <div className="photo-grid" role="group" aria-labelledby="photo-label">
                  {f.photos.map((src, k) => (
                    <div key={k} className="photo-thumb">
                      <img
                        src={src}
                        alt={`Photo ${k + 1}`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        aria-label={`Remove photo ${k + 1}`}
                        onClick={() =>
                          set(
                            'photos',
                            f.photos.filter((_, j) => j !== k),
                          )
                        }
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ))}
                  {f.photos.length + busyPhotos < MAX_PHOTOS && (
                    <label className="photo-add">
                      <Icon name="image" size={18} />
                      <span>Add photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        aria-label="Add photos"
                        onChange={onFiles}
                      />
                    </label>
                  )}
                </div>
                <div className="hint" role="status" aria-live="polite">
                  {busyPhotos > 0
                    ? `Adding ${busyPhotos} photo${busyPhotos === 1 ? '' : 's'}…`
                    : `${f.photos.length} of ${MAX_PHOTOS} photos. Listings with photos get more visits.`}
                </div>
                {errors.photos && <div className="error">{errors.photos}</div>}
              </div>

              <div className="field">
                <span className="label" id="cats-label">
                  Categories
                </span>
                <div
                  role="group"
                  aria-labelledby="cats-label"
                  className="flex flex-wrap gap-2"
                >
                  {catChips.map((c) => (
                    <Chip
                      key={c}
                      active={f.cats.includes(c)}
                      onClick={() => toggleCat(c)}
                    >
                      {c}
                    </Chip>
                  ))}
                </div>
                <Combobox
                  id="cat-add"
                  label="Search or add a category"
                  value={catQ}
                  onChange={setCatQ}
                  options={catOptions}
                  inline
                  blockEnter
                  placeholder="Search or add a category"
                  leading={<Icon name="search" />}
                  onPick={(o) => {
                    addCat(o.value);
                    setCatQ('');
                  }}
                />
              </div>

              <div className="field">
                <span className="label" id="items-label">
                  Featured items (optional)
                </span>
                <div
                  role="group"
                  aria-labelledby="items-label"
                  className="flex flex-wrap gap-2"
                >
                  {itemChips.map((i) => (
                    <Chip
                      key={i}
                      active={f.items.includes(i)}
                      onClick={() => toggleItem(i)}
                    >
                      {i}
                    </Chip>
                  ))}
                </div>
                <Combobox
                  id="item-add"
                  label="Search or add an item"
                  value={itemQ}
                  onChange={setItemQ}
                  options={itemOptions}
                  inline
                  blockEnter
                  placeholder="Search or add an item"
                  leading={<Icon name="search" />}
                  onPick={(o) => {
                    addItem(o.value);
                    setItemQ('');
                  }}
                />
              </div>

              <div className="field">
                <span className="label" id="refresh-label">
                  Food or drinks (optional)
                </span>
                <div
                  role="group"
                  aria-labelledby="refresh-label"
                  className="flex flex-wrap gap-2"
                >
                  <Chip active={!!f.food} onClick={() => set('food', !f.food)}>
                    <FoodIcon />
                    Food
                  </Chip>
                  <Chip
                    active={!!f.drinks}
                    onClick={() => set('drinks', !f.drinks)}
                  >
                    <LemonIcon />
                    Drinks or lemonade
                  </Chip>
                </div>
              </div>

              <div className="field">
                <span className="label" id="pay-label">
                  Payments you accept
                </span>
                <PayPicker
                  value={f.pay}
                  onChange={(v) => set('pay', v)}
                  labelId="pay-label"
                />
              </div>

              {!initial && (
                <TermsConsentField
                  id="f-terms"
                  verb="agree to"
                  checked={acceptedTerms}
                  onChange={(checked) => {
                    setAcceptedTerms(checked);
                    if (checked && errors.terms) {
                      setErrors((er) => ({ ...er, terms: undefined }));
                    }
                  }}
                  error={errors.terms}
                  errorId="f-terms-err"
                  onOpenLegal={onOpenLegal}
                />
              )}
            </>
          )}
        </div>

        <div className="dialog-foot">
          {step > 1 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setErrors({});
                setStep((s) => (s === 3 ? 2 : 1));
              }}
            >
              Back
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}

          {initial && step < 3 && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busyPhotos > 0}
              onClick={() => void finishSubmit()}
            >
              Save changes
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busyPhotos > 0 || finding}
          >
            {busyPhotos > 0
              ? 'Processing photos…'
              : step === 1
                ? 'Next: Address'
                : step === 2
                  ? finding
                    ? 'Finding address…'
                    : 'Next: Photos & items'
                  : initial
                    ? 'Save changes'
                    : 'Post sale'}
          </button>
        </div>
    </ModalDialog>
  );
}
