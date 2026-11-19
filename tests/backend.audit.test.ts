import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { SEED, fromDoc } from '../src/data/seedSales.ts';
import { SPONSOR_ADS } from '../src/data/sponsorAds.ts';
import { composeFullAddress, parseFullAddress } from '../src/utils/address.ts';
import {
  applySaleOwnership,
  buildSalePayload,
  buildUserUpdatePatch,
  isValidDocId,
  normalizeUserProfile,
} from '../src/utils/cloudPayloads.ts';
import {
  buildIcsContent,
  foldIcsLine,
  googleCalUrl,
  icsEsc,
  icsFilename,
  outlookCalUrl,
  resolveEventTimes,
} from '../src/utils/calendar.ts';
import { buildSaleFeed, tailAdColumnSpan } from '../src/utils/feed.ts';
import {
  computeVisibleTagCount,
  dayDiff,
  distanceMiles,
  fitsTagsInRows,
  formatDistance,
  getDistanceDisplay,
  getEndingSoonInfo,
  isAppleMobileDevice,
  iso,
  shareSaleLink,
  smsShareBody,
  smsShareUrl,
  sortSalesByMode,
  todayStart,
} from '../src/utils/format.ts';
import {
  clearGeocodeCache,
  clearIpLocationCache,
  detectLocationByIp,
  directionsUrl,
  geocode,
  isStreetAddressQuery,
  reverseGeocode,
  stripAddressUnit,
  suggestPlaces,
} from '../src/utils/geocode.ts';
import {
  DEFAULT_SEO,
  buildSaleJsonLd,
  buildSeoMeta,
  buildStructuredData,
} from '../src/utils/seo.ts';
import {
  MAX_RECENT_SEARCHES,
  sanitizeRecentSearches,
  upsertRecentSearch,
} from '../src/utils/storage.ts';
import {
  assessGarageSaleWeather,
  clearWeatherCache,
  describeWmoCode,
  fetchSaleWeather,
} from '../src/utils/weather.ts';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearGeocodeCache();
  clearIpLocationCache();
  clearWeatherCache();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Backend Audit & Utility Suite', () => {
  it('fromDoc parses valid Firestore sale documents and rejects invalid coordinates/dates', () => {
    const valid = fromDoc(
      'sale_1',
      {
        title: 'Weekend Yard Sale',
        address: '123 Main St',
        lat: 37.97,
        lng: -87.57,
        date: '2026-11-20',
        start: '08:00',
        end: '14:00',
        saleType: 'Garage Sale',
        cats: ['Furniture'],
        items: ['Desk'],
        prices: { Desk: 50, Bad: -1 },
        level: 2,
        cur: 'USD',
        food: true,
        drinks: false,
        pay: ['cash'],
        desc: 'Lots of items',
        photos: ['https://example.com/a.jpg', 'javascript:alert(1)'],
        ownerUid: 'user_123',
      },
      'user_123',
    );
    assert.ok(valid);
    assert.equal(valid.ownerId, 'me');
    assert.deepEqual(valid.prices, { Desk: 50 });
    assert.deepEqual(valid.photos, ['https://example.com/a.jpg']);

    assert.equal(
      fromDoc('bad_lat', { title: 'x', lat: 95, lng: 0, date: '2026-11-20' }, null),
      null,
    );
    assert.equal(
      fromDoc('bad_date', { title: 'x', lat: 10, lng: 10, date: '2026/11/20' }, null),
      null,
    );
  });

  it('applySaleOwnership updates ownerId cleanly on sign-in and sign-out', () => {
    const raw = fromDoc(
      'sale_owned',
      {
        title: 'My Sale',
        lat: 37.97,
        lng: -87.57,
        date: '2026-11-20',
        ownerUid: 'user_abc',
      },
      'user_abc',
    );
    assert.ok(raw);
    assert.equal(raw.ownerId, 'me');

    const signedOut = applySaleOwnership([raw], null);
    assert.equal(signedOut[0].ownerId, 'user_abc');

    const otherUser = applySaleOwnership([raw], 'user_xyz');
    assert.equal(otherUser[0].ownerId, 'user_abc');

    const signedBackIn = applySaleOwnership(signedOut, 'user_abc');
    assert.equal(signedBackIn[0].ownerId, 'me');
  });

  it('cloudPayloads validates doc IDs, normalizes profiles, and skips empty updates', () => {
    assert.equal(isValidDocId('sale_123-ABC'), true);
    assert.equal(isValidDocId('bad/id'), false);
    assert.equal(isValidDocId(''), false);

    const profile = normalizeUserProfile(
      { uid: 'u1', displayName: '  ', email: 'test@example.com' },
      { payments: [], savedIds: ['ok_1', 'bad/id', 'ok_1'], listingOrder: ['s1', 's1'] },
    );
    assert.equal(profile.name, 'Seller');
    assert.deepEqual(profile.payments, ['cash']);
    assert.deepEqual(profile.savedIds, ['ok_1']);
    assert.deepEqual(profile.listingOrder, ['s1']);

    const noop = buildUserUpdatePatch({}, 'TS');
    assert.equal(noop.hasChanges, false);
    assert.deepEqual(noop.patch, {});

    const patch = buildUserUpdatePatch(
      { name: '  Alex ', payments: ['cash', 'venmo', 'cash'] },
      'TS',
    );
    assert.equal(patch.hasChanges, true);
    assert.equal(patch.patch.name, 'Alex');
    assert.deepEqual(patch.patch.payments, ['cash', 'venmo']);
    assert.equal(patch.patch.updatedAt, 'TS');
  });

  it('buildSalePayload enforces coordinates, photo budgets, HH:MM format, and immutable fields', () => {
    const baseSale = {
      id: 'sale_p1',
      title: '  Tools & Vinyl  ',
      address: '412 Parrett St, Evansville, IN',
      lat: 37.9593,
      lng: -87.5661,
      date: '2026-11-22',
      start: '8:30',
      end: '14:00:00',
      saleType: 'Garage Sale' as const,
      cats: ['Tools'],
      items: ['Wrench'],
      prices: { Wrench: 10, Invalid: -5 },
      cur: 'USD',
      level: 1.6,
      food: false,
      drinks: false,
      pay: ['cash'],
      desc: '  Cash only  ',
      photos: [
        'https://example.com/1.jpg',
        `data:image/jpeg;base64,${'a'.repeat(190_000)}`,
        'javascript:evil()',
      ],
    };

    const createRes = buildSalePayload(baseSale, 'uid_1', false, 'NOW');
    assert.equal(createRes.droppedPhotos, true);
    assert.equal(createRes.payload.start, '08:30');
    assert.equal(createRes.payload.end, '14:00');
    assert.equal(createRes.payload.level, 2);
    assert.equal(createRes.payload.status, 'active');
    assert.equal(createRes.payload.ownerUid, 'uid_1');
    assert.equal(createRes.payload.createdAt, 'NOW');
    assert.deepEqual(createRes.payload.prices, { Wrench: 10 });
    assert.deepEqual(createRes.payload.photos, ['https://example.com/1.jpg']);

    const updateRes = buildSalePayload(baseSale, 'uid_1', true, 'NOW');
    assert.equal('status' in updateRes.payload, false);
    assert.equal('ownerUid' in updateRes.payload, false);
    assert.equal('createdAt' in updateRes.payload, false);

    assert.throws(
      () => buildSalePayload({ ...baseSale, lat: 120 }, 'uid_1', false, 'NOW'),
      /Invalid sale coordinates/,
    );
  });

  it('geocode caches identical queries, ranks building/house hits, and strips unit suffixes', async () => {
    let calls = 0;
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input) => {
      calls++;
      const url = String(input);
      requestedUrls.push(url);
      await new Promise((r) => setTimeout(r, 10));
      if (url.includes('Apt')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(
        JSON.stringify([
          {
            lat: '37.9000',
            lon: '-87.5000',
            place_rank: 16,
            category: 'boundary',
            type: 'administrative',
            display_name: 'Evansville, Vanderburgh County, Indiana, United States',
            boundingbox: ['37.89', '38.05', '-87.66', '-87.44'],
            address: { country_code: 'us' },
          },
          {
            lat: '37.9593',
            lon: '-87.5661',
            place_rank: 30,
            category: 'building',
            type: 'house',
            display_name: '412, Parrett Street, Evansville, Indiana, United States',
            boundingbox: ['37.9592', '37.9594', '-87.5662', '-87.5660'],
            address: { country_code: 'us' },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const [a, b] = await Promise.all([
      geocode('412 Parrett St, Evansville, IN'),
      geocode('412  parrett st, evansville, in'),
    ]);
    const c = await geocode('412 Parrett St, Evansville, IN');
    assert.ok(a && b && c);
    assert.equal(a.lat, 37.9593);
    assert.equal(a.lng, -87.5661);
    assert.equal(calls, 1, `Expected 1 network call due to dedup+cache, got ${calls}`);

    assert.equal(
      stripAddressUnit('412 Parrett St, Apt 2B, Evansville, IN'),
      '412 Parrett St, Evansville, IN',
    );
    const strippedHit = await geocode('412 Parrett St, Apt 2B, Evansville, IN');
    assert.ok(strippedHit);
    assert.equal(strippedHit.lat, 37.9593);
    assert.equal(requestedUrls.length, 3);
  });

  it('geocode respects caller AbortSignal and reverseGeocode supports hamlet fallback', async () => {
    const ac = new AbortController();
    ac.abort(new DOMException('Aborted', 'AbortError'));
    await assert.rejects(() => geocode('Austin, TX', { signal: ac.signal }));

    let revCalls = 0;
    globalThis.fetch = (async () => {
      revCalls++;
      return new Response(
        JSON.stringify({
          address: {
            house_number: '10',
            road: 'Oak Lane',
            hamlet: 'Smallville',
            state: 'Indiana',
            postcode: '47714',
            country: 'United States',
            country_code: 'us',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const first = await reverseGeocode(37.97161, -87.57111);
    const second = await reverseGeocode(37.97162, -87.57112);
    assert.ok(first);
    assert.equal(first.city, 'Smallville');
    assert.deepEqual(second, first);
    assert.equal(revCalls, 1);
  });

  it('directionsUrl prefers exact pin coordinates and falls back cleanly', () => {
    assert.equal(
      directionsUrl({ address: '412 Parrett St, Evansville, IN', lat: 37.9593, lng: -87.5661 }),
      'https://www.google.com/maps/dir/?api=1&destination=37.959300%2C-87.566100',
    );
    assert.equal(
      directionsUrl({ address: '412 Parrett St, Evansville, IN' }),
      'https://www.google.com/maps/dir/?api=1&destination=412%20Parrett%20St%2C%20Evansville%2C%20IN',
    );
  });

  it('format and storage utilities handle edge cases safely', () => {
    const anti = distanceMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    assert.ok(Number.isFinite(anti) && anti > 12000);

    assert.equal(icsEsc('a;b,c\r\nd\\e'), 'a\\;b\\,c\\nd\\\\e');
    assert.equal(dayDiff(iso(todayStart())), 0);

    const recent = upsertRecentSearch([], {
      kind: 'place',
      label: 'Evansville, IN',
      value: 'Evansville, IN',
    });
    const deduped = upsertRecentSearch(recent, {
      kind: 'place',
      label: 'Evansville, IN',
      value: '  Evansville, IN ',
    });
    assert.equal(deduped.length, 1);

    const many = Array.from({ length: 10 }, (_, idx) => ({
      id: `item:k${idx}`,
      kind: 'item' as const,
      label: `Item ${idx}`,
      value: `Item ${idx}`,
    }));
    assert.equal(sanitizeRecentSearches(many).length, MAX_RECENT_SEARCHES);
  });

  it('SEED coordinates are finite valid coordinates and match rules/components audit invariants', () => {
    for (const s of SEED) {
      assert.ok(Number.isFinite(s.lat) && Math.abs(s.lat) <= 90, `Invalid seed lat on ${s.id}`);
      assert.ok(Number.isFinite(s.lng) && Math.abs(s.lng) <= 180, `Invalid seed lng on ${s.id}`);
    }

    const blueprint = JSON.parse(
      fs.readFileSync(path.resolve('firebase-blueprint.json'), 'utf8'),
    ) as {
      entities: {
        User: { properties: Record<string, unknown>; required: string[] };
        Sale: { properties: Record<string, unknown>; required: string[] };
      };
    };
    const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

    for (const key of Object.keys(blueprint.entities.User.properties)) {
      assert.ok(rules.includes(`'${key}'`), `User field '${key}' missing from firestore.rules`);
    }
    for (const key of Object.keys(blueprint.entities.Sale.properties)) {
      assert.ok(rules.includes(`'${key}'`), `Sale field '${key}' missing from firestore.rules`);
    }
    assert.ok(!rules.includes('favCats'), 'favCats should be removed from firestore.rules');
    assert.ok(
      rules.includes("resource != null && existing().status == 'active'"),
      'Expected sales allow get rule to guard resource != null',
    );
    assert.equal(
      fs.existsSync(path.resolve('src/components/RecommendedSection.tsx')),
      false,
      'RecommendedSection.tsx must stay removed',
    );
    assert.equal(
      fs.existsSync(path.resolve('src/utils/recommendations.ts')),
      false,
      'recommendations.ts must stay removed',
    );
  });

  it('address utilities round-trip structured and multi-part addresses cleanly', () => {
    const p3 = parseFullAddress('412 Parrett St, Evansville, IN 47713');
    assert.deepEqual(p3, {
      street: '412 Parrett St',
      city: 'Evansville',
      state: 'IN',
      postal: '47713',
      country: '',
    });
    assert.equal(composeFullAddress(p3), '412 Parrett St, Evansville, IN 47713');

    const p4 = parseFullAddress('714 N Fulton Ave, Suite 2B, Evansville, IN 47710, United States');
    assert.deepEqual(p4, {
      street: '714 N Fulton Ave, Suite 2B',
      city: 'Evansville',
      state: 'IN',
      postal: '47710',
      country: 'United States',
    });

    assert.ok(SPONSOR_ADS.length >= 3);
    for (const ad of SPONSOR_ADS) {
      assert.ok(ad.id && ad.sponsor && ad.title && ad.code && ad.image);
    }
  });

  it('SEO helpers and static metadata meet length, OpenGraph, and Schema.org structured data requirements', () => {
    assert.ok(
      DEFAULT_SEO.title.length >= 30 && DEFAULT_SEO.title.length <= 60,
      `Expected title 30..60 chars, got ${DEFAULT_SEO.title.length}`,
    );
    assert.ok(
      DEFAULT_SEO.description.length >= 120 && DEFAULT_SEO.description.length <= 160,
      `Expected description 120..160 chars, got ${DEFAULT_SEO.description.length}`,
    );

    const origin = 'https://stoop.example';
    const defMeta = buildSeoMeta({ origin, pathname: '/' });
    assert.equal(defMeta.canonical, 'https://stoop.example/');
    assert.equal(defMeta.image, 'https://stoop.example/src/assets/images/garage_sale_driveway_1795014651799.jpg');

    const legalMeta = buildSeoMeta({ legalPage: 'privacy', origin, pathname: '/' });
    assert.ok(legalMeta.title.includes('Privacy Policy'));

    const sample = SEED[0];
    const saleMeta = buildSeoMeta({ selected: sample, origin, pathname: '/' });
    assert.ok(saleMeta.title.includes(sample.title.slice(0, 20)));
    assert.ok(saleMeta.description.length <= 160);

    const saleEvent = buildSaleJsonLd(sample, origin) as {
      '@type': string;
      location: { '@type': string; geo: { latitude: number; longitude: number } };
    };
    assert.equal(saleEvent['@type'], 'Event');
    assert.equal(saleEvent.location['@type'], 'Place');
    assert.equal(saleEvent.location.geo.latitude, sample.lat);
    assert.equal(saleEvent.location.geo.longitude, sample.lng);

    const graph = buildStructuredData({ sales: SEED, origin, pathname: '/' }) as {
      '@context': string;
      '@graph': Array<{ '@type': string; numberOfItems?: number }>;
    };
    assert.equal(graph['@context'], 'https://schema.org');
    assert.equal(graph['@graph'][0]['@type'], 'WebApplication');
    assert.equal(graph['@graph'][1]['@type'], 'ItemList');
    assert.equal(graph['@graph'][1].numberOfItems, 20);

    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert.ok(html.includes('property="og:image"'));
    assert.ok(html.includes('name="twitter:description"'));
    assert.ok(html.includes('application/ld+json'));
    assert.equal(fs.existsSync(path.resolve('public/robots.txt')), true);
  });

  it('weather forecast fetches Open-Meteo daily data, caches/dedups calls, guards forecast range, and scores garage sale suitability', async () => {
    const today = todayStart();
    const saleDate = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2));
    const pastDate = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
    const farFutureDate = iso(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 25),
    );

    let calls = 0;
    let lastUrl = '';
    globalThis.fetch = (async (input) => {
      calls++;
      lastUrl = String(input);
      await new Promise((r) => setTimeout(r, 10));
      return new Response(
        JSON.stringify({
          daily: {
            time: [saleDate],
            weather_code: [1],
            temperature_2m_max: [74.4],
            temperature_2m_min: [55.6],
            precipitation_probability_max: [10],
            wind_speed_10m_max: [8.2],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const [first, second] = await Promise.all([
      fetchSaleWeather(37.9593, -87.5661, saleDate, { imperial: true }),
      fetchSaleWeather(37.9593, -87.5661, saleDate, { imperial: true }),
    ]);
    const nearby = await fetchSaleWeather(37.9601, -87.5655, saleDate, { imperial: true });

    assert.equal(calls, 1, `Expected 1 Open-Meteo call due to dedup+cache, got ${calls}`);
    assert.ok(lastUrl.startsWith('https://api.open-meteo.com/v1/forecast?'));
    assert.equal(first.status, 'ok');
    assert.deepEqual(second, first);
    assert.deepEqual(nearby, first);
    if (first.status === 'ok') {
      assert.equal(first.forecast.condition, 'Mostly clear');
      assert.equal(first.forecast.icon, 'sun');
      assert.equal(first.forecast.tempHigh, 74);
      assert.equal(first.forecast.tempLow, 56);
      assert.equal(first.forecast.unit, '°F');
      assert.equal(first.forecast.precipChance, 10);
      assert.equal(first.forecast.windMax, 8);
      assert.equal(first.forecast.rating, 'great');
      assert.equal(first.forecast.verdict, 'Great sale day');
    }

    // Past & far-future dates should return out-of-range without hitting the network.
    const pastRes = await fetchSaleWeather(37.9593, -87.5661, pastDate, { imperial: true });
    const farRes = await fetchSaleWeather(37.9593, -87.5661, farFutureDate, { imperial: true });
    assert.deepEqual(pastRes, { status: 'out-of-range' });
    assert.deepEqual(farRes, { status: 'out-of-range' });
    assert.equal(calls, 1);

    // Invalid coordinates return unavailable without network call.
    const badRes = await fetchSaleWeather(999, 0, saleDate, { imperial: true });
    assert.deepEqual(badRes, { status: 'unavailable' });
    assert.equal(calls, 1);

    // Aborted signal rejects cleanly.
    const ac = new AbortController();
    ac.abort(new DOMException('Aborted', 'AbortError'));
    await assert.rejects(() =>
      fetchSaleWeather(40.7128, -74.006, saleDate, { imperial: true, signal: ac.signal }),
    );

    // Verify WMO descriptions & garage-sale suitability heuristics across conditions & units.
    assert.equal(describeWmoCode(95).icon, 'storm');
    assert.equal(describeWmoCode(73).icon, 'snow');
    assert.equal(
      assessGarageSaleWeather({ code: 95, precipChance: 80, tempHigh: 72, windMax: 12, imperial: true })
        .verdict,
      'Storms likely',
    );
    assert.equal(
      assessGarageSaleWeather({ code: 2, precipChance: 65, tempHigh: 70, windMax: 10, imperial: true })
        .verdict,
      'Rain likely',
    );
    assert.equal(
      assessGarageSaleWeather({ code: 0, precipChance: 5, tempHigh: 4, windMax: 10, imperial: false })
        .verdict,
      'Bundle up',
    );
    assert.equal(
      assessGarageSaleWeather({ code: 1, precipChance: 0, tempHigh: 72, windMax: 26, imperial: true })
        .verdict,
      'Windy outside',
    );
  });

  it('city search prioritizes major cities, falls back to Photon and Open-Meteo when Nominatim fails, and powers live suggestions', async () => {
    assert.equal(isStreetAddressQuery('Austin'), false);
    assert.equal(isStreetAddressQuery('Chicago, IL'), false);
    assert.equal(isStreetAddressQuery('412 Parrett St, Evansville, IN'), true);

    // 1. Nominatim returns Austin, TX (rank 16, high importance) and Austin, NV (rank 19, village).
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            lat: '39.4929',
            lon: '-117.0714',
            place_rank: 19,
            importance: 0.43,
            category: 'place',
            type: 'village',
            addresstype: 'village',
            name: 'Austin',
            display_name: 'Austin, Lander County, Nevada, United States',
            address: { village: 'Austin', state: 'Nevada', country_code: 'us' },
          },
          {
            lat: '30.2649',
            lon: '-97.7474',
            place_rank: 16,
            importance: 0.71,
            category: 'boundary',
            type: 'administrative',
            addresstype: 'city',
            name: 'Austin',
            display_name: 'Austin, Travis County, Texas, United States',
            boundingbox: ['30.0985', '30.5166', '-97.9368', '-97.5605'],
            address: { city: 'Austin', state: 'Texas', country_code: 'us' },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;

    const austin = await geocode('Austin');
    assert.ok(austin);
    assert.equal(austin.name, 'Austin, Texas');
    assert.equal(austin.lat, 30.2649);
    assert.deepEqual(austin.bbox, [30.0985, 30.5166, -97.9368, -97.5605]);

    // 2. When Nominatim returns 403, geocode falls back seamlessly to Photon and normalizes extent -> bbox.
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.includes('nominatim.openstreetmap.org')) {
        return new Response('Access denied', { status: 403 });
      }
      if (url.includes('photon.komoot.io')) {
        return new Response(
          JSON.stringify({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {
                  osm_type: 'R',
                  osm_id: 122604,
                  name: 'Chicago',
                  state: 'Illinois',
                  country: 'United States',
                  countrycode: 'US',
                  extent: [-87.9401, 42.0231, -87.5241, 41.6445],
                },
                geometry: { type: 'Point', coordinates: [-87.6244, 41.8756] },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    const chicago = await geocode('Chicago');
    assert.ok(chicago);
    assert.equal(chicago.name, 'Chicago, Illinois');
    assert.equal(chicago.lat, 41.8756);
    assert.deepEqual(chicago.bbox, [41.6445, 42.0231, -87.9401, -87.5241]);

    // 3. suggestPlaces returns live suggestions from Photon and falls back to Open-Meteo when Photon fails.
    const live = await suggestPlaces('Chic');
    assert.equal(live.length, 1);
    assert.equal(live[0].name, 'Chicago, Illinois');
    assert.equal(live[0].subtitle, 'USA');

    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.includes('geocoding-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 5391959,
                name: 'San Francisco',
                admin1: 'California',
                country: 'United States',
                country_code: 'US',
                latitude: 37.7749,
                longitude: -122.4194,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Blocked', { status: 403 });
    }) as typeof fetch;

    const sf = await geocode('San Francisco');
    assert.ok(sf);
    assert.equal(sf.name, 'San Francisco, California');
    assert.equal(sf.lat, 37.7749);

    const sfSuggest = await suggestPlaces('San Fran');
    assert.equal(sfSuggest.length, 1);
    assert.equal(sfSuggest[0].name, 'San Francisco, California');
  });

  it('detectLocationByIp and reverseGeocode fall back cleanly when primary endpoints fail', async () => {
    let calls = 0;
    globalThis.fetch = (async (input) => {
      calls++;
      const url = String(input);
      if (url.includes('get.geojs.io')) {
        return new Response('Rate limited', { status: 429 });
      }
      if (url.includes('ipwho.is')) {
        return new Response(
          JSON.stringify({
            success: true,
            city: 'Seattle',
            region: 'Washington',
            country: 'United States',
            country_code: 'US',
            latitude: 47.6062,
            longitude: -122.3321,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('nominatim.openstreetmap.org/reverse')) {
        return new Response('Blocked', { status: 403 });
      }
      if (url.includes('photon.komoot.io/reverse')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                properties: {
                  city: 'Seattle',
                  state: 'Washington',
                  country: 'United States',
                  countrycode: 'US',
                  postcode: '98101',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    const ipLoc = await detectLocationByIp();
    assert.ok(ipLoc);
    assert.equal(ipLoc.label, 'Seattle, Washington');
    assert.equal(ipLoc.lat, 47.6062);
    assert.equal(ipLoc.lng, -122.3321);

    // Cached on second call
    const cached = await detectLocationByIp();
    assert.deepEqual(cached, ipLoc);
    assert.equal(calls, 2);

    // Reverse geocode falls back to Photon when Nominatim returns 403
    const rev = await reverseGeocode(47.6062, -122.3321);
    assert.ok(rev);
    assert.equal(rev.city, 'Seattle');
    assert.equal(rev.state, 'Washington');
  });

  it('calendar exports generate valid Google, Outlook, and Apple-enhanced RFC 5545 .ics events', () => {
    const sample = {
      ...SEED[0],
      id: 'sale_cal_1',
      title: 'Vintage Vinyl & Tools Sale',
      address: '412 Parrett St, Evansville, IN 47713',
      lat: 37.9593,
      lng: -87.5661,
      date: '2026-11-21',
      start: '08:00',
      end: '14:30',
      pay: ['cash', 'venmo'],
      items: ['Vinyl records', 'Power drill', 'Mid-century lamp'],
      desc: 'Rain or shine, early birds welcome!',
    };

    const gUrl = new URL(googleCalUrl(sample, 'America/Chicago'));
    assert.equal(gUrl.hostname, 'calendar.google.com');
    assert.equal(gUrl.searchParams.get('action'), 'TEMPLATE');
    assert.equal(gUrl.searchParams.get('text'), 'Vintage Vinyl & Tools Sale');
    assert.equal(gUrl.searchParams.get('dates'), '20261121T080000/20261121T143000');
    assert.equal(gUrl.searchParams.get('location'), '412 Parrett St, Evansville, IN 47713');
    assert.equal(gUrl.searchParams.get('ctz'), 'America/Chicago');
    assert.ok(gUrl.searchParams.get('details')?.includes('Cash, Venmo'));

    const oUrl = new URL(outlookCalUrl(sample));
    assert.equal(oUrl.hostname, 'outlook.live.com');
    assert.equal(oUrl.searchParams.get('startdt'), '2026-11-21T08:00:00');
    assert.equal(oUrl.searchParams.get('enddt'), '2026-11-21T14:30:00');

    // Guard inverted or missing end times safely (+1 hour)
    const fixedTimes = resolveEventTimes({ date: '2026-11-21', start: '14:00', end: '13:00' });
    assert.equal(fixedTimes.startStamp, '20261121T140000');
    assert.equal(fixedTimes.endStamp, '20261121T150000');

    // RFC 5545 .ics output for Apple Calendar
    const ics = buildIcsContent(sample, new Date('2026-11-18T12:00:00Z'));
    const unfolded = ics.replace(/\r\n /g, '');
    assert.ok(unfolded.includes('BEGIN:VCALENDAR'));
    assert.ok(unfolded.includes('CALSCALE:GREGORIAN'));
    assert.ok(unfolded.includes('METHOD:PUBLISH'));
    assert.ok(unfolded.includes('DTSTART:20261121T080000'));
    assert.ok(unfolded.includes('DTEND:20261121T143000'));
    assert.ok(unfolded.includes('GEO:37.959300;-87.566100'));
    assert.ok(unfolded.includes('X-APPLE-STRUCTURED-LOCATION;'));
    assert.ok(unfolded.includes('TRIGGER:-PT1H'));
    assert.ok(unfolded.includes('END:VCALENDAR'));

    // Every physical ICS line must be <= 75 UTF-8 octets
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      assert.ok(
        encoder.encode(line).length <= 75,
        `ICS line exceeded 75 bytes (${encoder.encode(line).length}): ${line}`,
      );
    }

    assert.equal(icsFilename(sample), 'stoop-vintage-vinyl-tools-sale-2026-11-21.ics');
    assert.ok(foldIcsLine(`DESCRIPTION:${'A'.repeat(120)}`).includes('\r\n '));
  });

  it('getEndingSoonInfo flags sales ending within 2 hours with accurate countdown labels and urgency tiers', () => {
    const sale = { date: '2026-11-21', start: '08:00', end: '14:00' };

    // 45 minutes left -> Ending soon (non-urgent)
    const at45m = getEndingSoonInfo(sale, new Date(2026, 10, 21, 13, 15, 0));
    assert.deepEqual(at45m, {
      minutesLeft: 45,
      urgent: false,
      started: true,
      label: 'Ending in 45 min',
      tag: 'Ending soon',
    });

    // 18 minutes left -> Urgent Last chance
    const at18m = getEndingSoonInfo(sale, new Date(2026, 10, 21, 13, 42, 0));
    assert.deepEqual(at18m, {
      minutesLeft: 18,
      urgent: true,
      started: true,
      label: 'Ending in 18 min',
      tag: 'Last chance',
    });

    // Exact 1 hour, 1h 25m, and 2 hour boundary
    assert.equal(getEndingSoonInfo(sale, new Date(2026, 10, 21, 13, 0, 0))?.label, 'Ending in 1 hr');
    assert.equal(getEndingSoonInfo(sale, new Date(2026, 10, 21, 12, 35, 0))?.label, 'Ending in 1h 25m');
    assert.equal(getEndingSoonInfo(sale, new Date(2026, 10, 21, 12, 0, 0))?.label, 'Ending in 2 hrs');

    // Out of window: 2h 01m left, already ended, tomorrow, or inverted end time
    assert.equal(getEndingSoonInfo(sale, new Date(2026, 10, 21, 11, 59, 0)), null);
    assert.equal(getEndingSoonInfo(sale, new Date(2026, 10, 21, 14, 0, 0)), null);
    assert.equal(getEndingSoonInfo(sale, new Date(2026, 10, 20, 13, 30, 0)), null);
    assert.equal(
      getEndingSoonInfo({ date: '2026-11-21', start: '14:00', end: '13:00' }, new Date(2026, 10, 21, 12, 30, 0)),
      null,
    );
  });

  it('audit invariants: update payloads stay within firestore.rules affectedKeys, reverseGeocode honors abort, and userLoc precision works cleanly', async () => {
    const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
    const salesSection = rules.slice(rules.indexOf('match /sales/{saleId}'));
    const saleUpdateBlock = salesSection.match(/affectedKeys\(\)\.hasOnly\(\[\s*([\s\S]*?)\s*\]\);/);
    assert.ok(saleUpdateBlock, 'Expected sale update affectedKeys allowlist in firestore.rules');
    const allowedUpdateKeys = new Set(
      Array.from(saleUpdateBlock[1].matchAll(/'([a-zA-Z0-9_]+)'/g)).map((m) => m[1]),
    );

    const sampleUpdate = buildSalePayload(
      {
        ...SEED[0],
        cats: Array.from({ length: 50 }, (_, i) => `Category ${i + 1}`),
        items: Array.from({ length: 40 }, (_, i) => `Item ${i + 1}`),
      },
      'uid_audit_1',
      true,
      'SERVER_TS',
    );
    for (const key of Object.keys(sampleUpdate.payload)) {
      assert.ok(
        allowedUpdateKeys.has(key),
        `Update payload emitted key "${key}" not allowed by firestore.rules`,
      );
    }
    assert.equal((sampleUpdate.payload.cats as string[]).length, 40);
    assert.equal((sampleUpdate.payload.items as string[]).length, 30);

    // Pre-aborted signal on reverseGeocode rejects before issuing any network call
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const ac = new AbortController();
    ac.abort(new DOMException('Aborted', 'AbortError'));
    await assert.rejects(() => reverseGeocode(37.9716, -87.5711, { signal: ac.signal }));
    assert.equal(fetchCalls, 0);

    // Confirm AddSaleDialog radio buttons do not mix role="radio" with aria-pressed
    const addDialogSrc = fs.readFileSync(path.resolve('src/components/AddSaleDialog.tsx'), 'utf8');
    assert.equal(addDialogSrc.includes('aria-pressed={f.saleType === t}'), false);
  });

  it('getDistanceDisplay formats GPS vs approximate IP distances cleanly and sortSalesByMode orders nearest first', () => {
    const gpsOrigin = { lat: 37.9716, lng: -87.5711, precise: true };
    const ipOrigin = { lat: 37.9716, lng: -87.5711, precise: false };

    // Exact GPS distance
    const exact = getDistanceDisplay(gpsOrigin, { lat: 37.9993, lng: -87.5809 }, { imperial: true });
    assert.ok(exact);
    assert.equal(exact.approximate, false);
    assert.equal(exact.display, exact.text);
    assert.ok(exact.text.endsWith(' mi'));
    assert.equal(exact.ariaLabel, `${exact.text} away`);
    assert.equal(formatDistance(gpsOrigin, { lat: 37.9993, lng: -87.5809 }, { imperial: true }), exact.text);

    // Approximate IP distance adds ~ prefix and accessible cue
    const approx = getDistanceDisplay(ipOrigin, { lat: 37.9993, lng: -87.5809 }, { imperial: true });
    assert.ok(approx);
    assert.equal(approx.approximate, true);
    assert.equal(approx.display, `~${approx.text}`);
    assert.ok(approx.ariaLabel.includes('approximate location'));
    assert.ok(approx.title.includes('approximate location'));

    // Sub-0.1 threshold in both imperial and metric
    const veryCloseMi = getDistanceDisplay(gpsOrigin, { lat: 37.9717, lng: -87.5711 }, { imperial: true });
    assert.equal(veryCloseMi?.display, '< 0.1 mi');
    const veryCloseKm = getDistanceDisplay(gpsOrigin, { lat: 37.9717, lng: -87.5711 }, { imperial: false });
    assert.equal(veryCloseKm?.display, '< 0.1 km');

    // Missing or invalid userLoc returns null cleanly
    assert.equal(getDistanceDisplay(null, { lat: 37.99, lng: -87.58 }), null);
    assert.equal(getDistanceDisplay({ lat: NaN, lng: -87.57 }, { lat: 37.99, lng: -87.58 }), null);

    // Nearest sort prioritizes closer sales and breaks equal-distance ties chronologically
    const base = SEED[0];
    const farSoon = { ...base, id: 'far', lat: 39.0, lng: -87.5711, date: '2026-11-20', start: '07:00' };
    const nearLate = { ...base, id: 'near-late', lat: 37.975, lng: -87.5711, date: '2026-11-22', start: '10:00' };
    const nearEarly = { ...base, id: 'near-early', lat: 37.975, lng: -87.5711, date: '2026-11-21', start: '08:00' };

    const byNearest = sortSalesByMode([farSoon, nearLate, nearEarly], 'nearest', gpsOrigin);
    assert.deepEqual(byNearest.map((s) => s.id), ['near-early', 'near-late', 'far']);

    // Falls back to chronological order when sortBy is soonest or userLoc is unavailable
    const bySoonest = sortSalesByMode([nearLate, farSoon, nearEarly], 'soonest', gpsOrigin);
    assert.deepEqual(bySoonest.map((s) => s.id), ['far', 'near-early', 'near-late']);

    const noLocNearest = sortSalesByMode([nearLate, farSoon, nearEarly], 'nearest', null);
    assert.deepEqual(noLocNearest.map((s) => s.id), ['far', 'near-early', 'near-late']);
  });

  it('second-pass audit invariants: calendar empty times, spaced postcodes, transient error retry, CSS tokens, and badge a11y', async () => {
    // 1. Empty or malformed start/end times fall back to 08:00-09:00 instead of 00:00 midnight
    const emptyTimes = resolveEventTimes({ date: '2026-11-21', start: '', end: '' });
    assert.equal(emptyTimes.startStamp, '20261121T080000');
    assert.equal(emptyTimes.endStamp, '20261121T090000');
    const blankStart = resolveEventTimes({ date: '2026-11-21', start: '   ', end: '14:00' });
    assert.equal(blankStart.startStamp, '20261121T080000');
    assert.equal(blankStart.endStamp, '20261121T140000');

    // 2. Spaced international postcodes (Canada, UK) parse cleanly
    const ca = parseFullAddress('100 Queen St W, Toronto, ON M5V 2T6, Canada');
    assert.deepEqual(ca, {
      street: '100 Queen St W',
      city: 'Toronto',
      state: 'ON',
      postal: 'M5V 2T6',
      country: 'Canada',
    });
    const uk = parseFullAddress('10 Downing St, London, SW1A 1AA, UK');
    assert.deepEqual(uk, {
      street: '10 Downing St',
      city: 'London',
      state: '',
      postal: 'SW1A 1AA',
      country: 'UK',
    });

    // 3. Transient network failures are NOT cached in suggestPlaces / detectLocationByIp / reverseGeocode
    let attempt = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      attempt++;
      if (attempt <= 2) {
        throw new Error('Network offline');
      }
      if (url.includes('photon.komoot.io/api')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                properties: { osm_type: 'R', osm_id: 1, name: 'Denver', state: 'Colorado', country: 'United States', countrycode: 'US' },
                geometry: { type: 'Point', coordinates: [-104.9903, 39.7392] },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('get.geojs.io')) {
        return new Response(
          JSON.stringify({ latitude: '39.7392', longitude: '-104.9903', city: 'Denver', region: 'Colorado', country: 'United States', country_code: 'US' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    const failedSuggest = await suggestPlaces('Denver');
    assert.deepEqual(failedSuggest, []);
    const retrySuggest = await suggestPlaces('Denver');
    assert.equal(retrySuggest.length, 1);
    assert.equal(retrySuggest[0].name, 'Denver, Colorado');

    attempt = 0;
    const failedIp = await detectLocationByIp();
    assert.equal(failedIp, null);
    const retryIp = await detectLocationByIp();
    assert.ok(retryIp);
    assert.equal(retryIp.label, 'Denver, Colorado');

    // 4. Every var(--...) without fallback in index.css must be defined in index.css
    const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
    const definedVars = new Set(Array.from(css.matchAll(/(--[a-z0-9-]+)\s*:/gi)).map((m) => m[1]));
    const undefinedVars: string[] = [];
    for (const m of css.matchAll(/var\((--[a-z0-9-]+)(\s*,[^)]+)?\)/gi)) {
      if (!m[2] && !definedVars.has(m[1])) undefinedVars.push(m[1]);
    }
    assert.deepEqual(undefinedVars, []);

    // 5. EndingSoonBadge must not attach role="status" on every list card
    const badgeSrc = fs.readFileSync(path.resolve('src/components/EndingSoonBanner.tsx'), 'utf8');
    const badgeFn = badgeSrc.slice(
      badgeSrc.indexOf('export function EndingSoonBadge'),
      badgeSrc.indexOf('export function EndingSoonBanner'),
    );
    assert.equal(badgeFn.includes('role="status"'), false);
  });

  it('orientation and responsive invariants: viewport-fit, safe-area insets, container grids, landscape details/sheets, and rotation-safe map bounds', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert.ok(html.includes('viewport-fit=cover'), 'Expected viewport-fit=cover for landscape notched devices');

    const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
    assert.ok(css.includes('env(safe-area-inset-left)'), 'Expected horizontal safe-area-inset-left');
    assert.ok(css.includes('env(safe-area-inset-right)'), 'Expected horizontal safe-area-inset-right');
    assert.ok(css.includes('@container (max-width: 359px)'), 'Expected single-column fallback for ultra-narrow phones');
    assert.ok(css.includes('@container (min-width: 600px)'), 'Expected 3-column grid for wide/landscape list containers');
    assert.ok(css.includes('@media (min-width: 560px) and (max-height: 540px)'), 'Expected landscape SaleDetails 2-column layout');
    assert.ok(css.includes('@media (max-width: 767px) and (max-height: 500px)'), 'Expected compact mobile landscape layout');
    assert.ok(css.includes('max-height: calc(100dvh - 24px)'), 'Expected scrollable max-height on action-sheet');
    assert.ok(css.includes('max-height: min(260px, 55dvh)'), 'Expected viewport-bounded calendar/share popover');

    const mapSrc = fs.readFileSync(path.resolve('src/components/SaleMap.tsx'), 'utf8');
    assert.ok(mapSrc.includes('orientationchange'), 'Expected SaleMap orientationchange handler');
    assert.ok(mapSrc.includes('fromResize'), 'Expected SaleMap to tag resize/rotation bounds emissions');

    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
    assert.ok(appSrc.includes('if (meta?.fromResize) return;'), 'Expected App.onView to preserve areaName on rotation/resize');
    assert.ok(appSrc.includes("window.addEventListener('orientationchange'"), 'Expected App orientationchange recovery');
  });

  it('trailing ad invariant: last card is always an ad and fills remaining columns with zero orphan listings or empty slots in 1-, 2-, and 3-column orientations', () => {
    assert.deepEqual(buildSaleFeed([]), []);

    for (let count = 1; count <= 30; count++) {
      const sales = Array.from({ length: count }, (_, idx) => ({
        ...SEED[idx % SEED.length],
        id: `sale-${idx + 1}`,
      }));
      const feed = buildSaleFeed(sales);

      // 1. Last item is ALWAYS the trailing ad card
      const last = feed[feed.length - 1];
      assert.ok(last, `Expected non-empty feed for ${count} sales`);
      assert.equal(last.kind, 'ad', `Expected last card to be an ad for ${count} sales`);
      assert.equal(last.isTail, true, `Expected last ad to be marked isTail for ${count} sales`);

      // 2. All sales preserved in exact order; no two ads ever adjacent; only the last item is isTail
      const saleIds: string[] = [];
      for (let i = 0; i < feed.length; i++) {
        const item = feed[i];
        if (item.kind === 'sale') {
          saleIds.push(item.sale.id);
        } else {
          assert.equal(item.isTail, i === feed.length - 1);
          if (i > 0) {
            assert.notEqual(
              feed[i - 1].kind,
              'ad',
              `Found adjacent ads at index ${i - 1},${i} for ${count} sales`,
            );
          }
        }
      }
      assert.deepEqual(
        saleIds,
        sales.map((s) => s.id),
      );

      // 3. Total cells fill exact whole rows (zero empty slots) across 1-, 2-, and 3-column layouts
      const preceding = feed.length - 1;
      for (const cols of [1, 2, 3] as const) {
        const span = tailAdColumnSpan(preceding, cols);
        assert.ok(span >= 1 && span <= cols);
        assert.equal(
          (preceding + span) % cols,
          0,
          `Left empty slot(s) for count=${count}, preceding=${preceding}, cols=${cols}, span=${span}`,
        );
      }
    }

    // 4. Verify SaleList and CSS wire up .ad-cell.is-tail for all 3 container breakpoints
    const saleListSrc = fs.readFileSync(path.resolve('src/components/SaleList.tsx'), 'utf8');
    assert.ok(saleListSrc.includes('buildSaleFeed(visible)'));
    assert.ok(saleListSrc.includes('is-tail'));

    const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
    assert.ok(css.includes('.rows > li.ad-cell.is-tail:nth-child(n)'));
    assert.ok(css.includes('.rows > li.ad-cell.is-tail:nth-child(2n)'));
    assert.ok(css.includes('.rows > li.ad-cell.is-tail:nth-child(2n + 1)'));
    assert.ok(css.includes('.rows > li.ad-cell.is-tail:nth-child(3n)'));
    assert.ok(css.includes('.rows > li.ad-cell.is-tail:nth-child(3n + 2)'));
    assert.ok(css.includes('.rows > li.ad-cell.is-tail:nth-child(3n + 1)'));
  });

  it('third-pass audit invariants: pin HTML escaping, modal focus restoration, carousel/menu keyboard a11y, image fallbacks, FilterBar observer, and offline draft sync', () => {
    const mapSrc = fs.readFileSync(path.resolve('src/components/SaleMap.tsx'), 'utf8');
    assert.ok(mapSrc.includes('escapeHtml(s.id)'), 'Expected HTML escaping on map pin data-sid');
    assert.ok(mapSrc.includes("m.on('add'"), 'Expected aria-label assignment when clustered markers enter DOM');

    const modalSrc = fs.readFileSync(path.resolve('src/components/ModalDialog.tsx'), 'utf8');
    assert.ok(modalSrc.includes('prevFocus.focus()'), 'Expected ModalDialog focus restoration on unmount');

    const cardSrc = fs.readFileSync(path.resolve('src/components/SaleCard.tsx'), 'utf8');
    assert.ok(cardSrc.includes("e.key === 'ArrowRight'"), 'Expected Gallery keyboard carousel navigation');
    assert.ok(cardSrc.includes('onError={() =>'), 'Expected broken-image fallbacks on Gallery and Ad cards');
    assert.ok(cardSrc.includes('onMenuKeyDown'), 'Expected ShareMenu WAI-ARIA keyboard navigation');

    const filterBarSrc = fs.readFileSync(path.resolve('src/components/FilterBar.tsx'), 'utf8');
    assert.ok(filterBarSrc.includes('new ResizeObserver(measure)'), 'Expected FilterBar ResizeObserver instead of per-render measure');

    const comboSrc = fs.readFileSync(path.resolve('src/components/Combobox.tsx'), 'utf8');
    assert.ok(comboSrc.includes("scrollIntoView({ block: 'nearest' })"), 'Expected Combobox keyboard active-option scroll');

    const profileSrc = fs.readFileSync(path.resolve('src/components/ProfileDialog.tsx'), 'utf8');
    assert.ok(profileSrc.includes("e.key === 'Escape'"), 'Expected ProfileDialog inline edit Escape cancellation');

    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
    assert.ok(appSrc.includes('x.id === sale.id ? { ...x, local: true } : x'), 'Expected failed cloud create to flip draft to local: true');
  });

  it('fourth-pass audit invariants: strict ending-soon time/date validation, signaled weather deduplication, visibility clock, avatar fallback, toast live region, and error boundary recovery', async () => {
    // 1. getEndingSoonInfo rejects empty times, out-of-range hours/minutes, and non-existent dates (e.g. Feb 31)
    const refNow = new Date(2026, 10, 21, 13, 30, 0);
    assert.equal(getEndingSoonInfo({ date: '2026-11-21', start: '', end: '14:00' }, refNow), null);
    assert.equal(getEndingSoonInfo({ date: '2026-11-21', start: '08:00', end: '' }, refNow), null);
    assert.equal(getEndingSoonInfo({ date: '2026-11-21', start: '25:00', end: '26:00' }, refNow), null);
    assert.equal(getEndingSoonInfo({ date: '2026-11-21', start: '08:60', end: '14:00' }, refNow), null);
    assert.equal(
      getEndingSoonInfo({ date: '2026-02-31', start: '08:00', end: '14:00' }, new Date(2026, 2, 3, 13, 0, 0)),
      null,
    );

    // 2. Concurrent signaled fetchSaleWeather calls deduplicate into a single network request while isolating caller aborts
    clearWeatherCache();
    let weatherCalls = 0;
    let resolveFetch!: (res: Response) => void;
    const saleDate = iso(todayStart());
    globalThis.fetch = (async () => {
      weatherCalls++;
      return await new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    }) as typeof fetch;

    const ac1 = new AbortController();
    const ac2 = new AbortController();
    const p1 = fetchSaleWeather(37.97, -87.57, saleDate, { imperial: true, signal: ac1.signal });
    const p2 = fetchSaleWeather(37.97, -87.57, saleDate, { imperial: true, signal: ac2.signal });

    assert.equal(weatherCalls, 1, 'Expected concurrent signaled weather fetches to share one request');

    // Aborting caller 1 rejects p1 without failing caller 2
    ac1.abort(new DOMException('Caller 1 aborted', 'AbortError'));
    await assert.rejects(() => p1);

    resolveFetch(
      new Response(
        JSON.stringify({
          daily: {
            time: [saleDate],
            weather_code: [1],
            temperature_2m_max: [70],
            temperature_2m_min: [52],
            precipitation_probability_max: [10],
            wind_speed_10m_max: [8],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const res2 = await p2;
    assert.equal(res2.status, 'ok');
    assert.equal(weatherCalls, 1);

    // 3. Component invariants
    const endingSrc = fs.readFileSync(path.resolve('src/components/EndingSoonBanner.tsx'), 'utf8');
    assert.ok(endingSrc.includes("addEventListener('visibilitychange'"), 'Expected visibilitychange refresh on shared EndingSoon clock');

    const iconsSrc = fs.readFileSync(path.resolve('src/components/Icons.tsx'), 'utf8');
    assert.ok(iconsSrc.includes('setPhotoBroken(true)'), 'Expected Avatar onError fallback');

    const toastSrc = fs.readFileSync(path.resolve('src/components/Toast.tsx'), 'utf8');
    assert.ok(toastSrc.includes('aria-live="polite"'), 'Expected persistent aria-live wrapper in Toast');

    const ebSrc = fs.readFileSync(path.resolve('src/components/ErrorBoundary.tsx'), 'utf8');
    assert.ok(ebSrc.includes('componentDidCatch') && ebSrc.includes('Try again'), 'Expected ErrorBoundary logging and Try again recovery');
  });

  it('Copy Share Link uses Web Share API when available, ignores AbortError cancel, and falls back to copying the share URL with toast confirmation', async () => {
    const sample = SEED[0];
    const expectedUrl = `https://stoop.example/#${encodeURIComponent(sample.id)}`;
    const getUrl = () => expectedUrl;

    // 1. Web Share API available & succeeds
    const sharedPayloads: ShareData[] = [];
    let copyCalled = false;
    const webShareRes = await shareSaleLink(sample, {
      getUrl,
      nav: {
        canShare: () => true,
        share: async (data) => {
          if (data) sharedPayloads.push(data);
        },
      },
      copy: async () => {
        copyCalled = true;
        return true;
      },
    });
    assert.equal(webShareRes.method, 'web-share');
    assert.equal(webShareRes.ok, true);
    assert.equal(webShareRes.url, expectedUrl);
    assert.equal(webShareRes.message, 'Sale link shared');
    assert.equal(sharedPayloads.length, 1);
    assert.equal(sharedPayloads[0].title, sample.title);
    assert.equal(sharedPayloads[0].url, expectedUrl);
    assert.equal(copyCalled, false);

    // 2. User dismisses native Web Share sheet (AbortError) -> cancelled without clipboard fallback
    const cancelRes = await shareSaleLink(sample, {
      getUrl,
      nav: {
        share: async () => {
          throw new DOMException('Share cancelled', 'AbortError');
        },
      },
      copy: async () => {
        copyCalled = true;
        return true;
      },
    });
    assert.deepEqual(cancelRes, { method: 'cancelled', ok: false, url: expectedUrl });
    assert.equal(copyCalled, false);

    // 3. Web Share API unavailable -> falls back to copying exact URL to clipboard
    let copiedText = '';
    const fallbackRes = await shareSaleLink(sample, {
      getUrl,
      nav: null,
      copy: async (t) => {
        copiedText = t;
        return true;
      },
    });
    assert.equal(fallbackRes.method, 'clipboard');
    assert.equal(fallbackRes.ok, true);
    assert.equal(fallbackRes.message, 'Share link copied to clipboard');
    assert.equal(copiedText, expectedUrl);

    // 4. Web Share API rejects with non-AbortError (e.g. iframe policy) -> falls back to clipboard URL
    copiedText = '';
    const policyRes = await shareSaleLink(sample, {
      getUrl,
      nav: {
        share: async () => {
          throw new DOMException('Blocked in iframe', 'NotAllowedError');
        },
      },
      copy: async (t) => {
        copiedText = t;
        return true;
      },
    });
    assert.equal(policyRes.method, 'clipboard');
    assert.equal(policyRes.ok, true);
    assert.equal(copiedText, expectedUrl);

    // 5. navigator.canShare returns false -> skips share() and falls back to clipboard URL
    let shareInvoked = false;
    copiedText = '';
    const canShareFalseRes = await shareSaleLink(sample, {
      getUrl,
      nav: {
        canShare: () => false,
        share: async () => {
          shareInvoked = true;
        },
      },
      copy: async (t) => {
        copiedText = t;
        return true;
      },
    });
    assert.equal(shareInvoked, false);
    assert.equal(canShareFalseRes.method, 'clipboard');
    assert.equal(canShareFalseRes.ok, true);
    assert.equal(copiedText, expectedUrl);

    // 6. Clipboard failure surfaces clean error toast message
    const failRes = await shareSaleLink(sample, {
      getUrl,
      nav: null,
      copy: async () => false,
    });
    assert.equal(failRes.method, 'clipboard');
    assert.equal(failRes.ok, false);
    assert.equal(failRes.message, "Couldn't copy share link.");

    // 7. ShareMenu (inside SaleDetails) & QuickActionsSheet wire shareSaleLink + confirmation toast
    const cardSrc = fs.readFileSync(path.resolve('src/components/SaleCard.tsx'), 'utf8');
    assert.ok(cardSrc.includes('shareSaleLink(s)'), 'Expected ShareMenu to call shareSaleLink(s)');
    assert.ok(cardSrc.includes('Copy Share Link'), 'Expected Copy Share Link option inside ShareMenu');

    const detailsSrc = fs.readFileSync(path.resolve('src/components/SaleDetails.tsx'), 'utf8');
    assert.ok(detailsSrc.includes('<ShareMenu'), 'Expected SaleDetails footer to render ShareMenu');
    assert.ok(detailsSrc.includes('onShared={(msg) => onToast?.(msg)}'), 'Expected SaleDetails to forward ShareMenu toast messages');

    const sheetSrc = fs.readFileSync(path.resolve('src/components/QuickActionsSheet.tsx'), 'utf8');
    assert.ok(sheetSrc.includes('shareSaleLink(s)'), 'Expected QuickActionsSheet to use shareSaleLink(s)');
  });

  it('Share via SMS generates cross-platform sms: URIs inside ShareMenu without cluttering SaleDetails footer', () => {
    const sample = {
      ...SEED[0],
      id: 'sale_sms_#1',
      title: 'Books, Tools & Vinyl Sale',
      address: '412 Parrett St, Evansville, IN',
      date: '2026-11-21',
      start: '08:00',
      end: '14:00',
    };
    const deepLink = 'https://stoop.example/#sale_sms_%231';
    const getUrl = () => deepLink;

    // 1. Body includes sale summary + direct URL on its own line
    const body = smsShareBody(sample, getUrl);
    assert.ok(body.includes(sample.title));
    assert.ok(body.includes(sample.address));
    assert.ok(body.endsWith(`\n${deepLink}`));

    // 2. Android / desktop uses RFC 5724 `sms:?body=...`
    const androidHref = smsShareUrl(sample, {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
      maxTouchPoints: 5,
      getUrl,
    });
    assert.ok(androidHref.startsWith('sms:?body='));
    assert.equal(androidHref.includes('#'), false, 'Hash fragment must be percent-encoded inside sms: body');
    assert.equal(decodeURIComponent(androidHref.slice('sms:?body='.length)), body);

    // 3. iPhone & iPadOS (including Macintosh UA with touchPoints > 1) use `sms:&body=...`
    assert.equal(
      isAppleMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)', 5),
      true,
    );
    assert.equal(
      isAppleMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5),
      true,
    );
    assert.equal(
      isAppleMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0),
      false,
    );

    const iosHref = smsShareUrl(sample, {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
      maxTouchPoints: 5,
      getUrl,
    });
    assert.ok(iosHref.startsWith('sms:&body='));
    assert.equal(decodeURIComponent(iosHref.slice('sms:&body='.length)), body);

    // 4. Share via SMS lives inside ShareMenu (not standalone in SaleDetails footer) & QuickActionsSheet
    const cardSrc = fs.readFileSync(path.resolve('src/components/SaleCard.tsx'), 'utf8');
    assert.ok(cardSrc.includes('smsShareUrl(s)'), 'Expected ShareMenu to compute smsShareUrl(s)');
    assert.ok(cardSrc.includes('Share via SMS'), 'Expected Share via SMS menu item in ShareMenu');
    assert.ok(cardSrc.includes('href={smsHref}'), 'Expected sms: anchor in ShareMenu');

    const detailsSrc = fs.readFileSync(path.resolve('src/components/SaleDetails.tsx'), 'utf8');
    assert.equal(detailsSrc.includes('details-sms-btn'), false, 'Expected standalone SMS button removed from SaleDetails footer');

    const sheetSrc = fs.readFileSync(path.resolve('src/components/QuickActionsSheet.tsx'), 'utf8');
    assert.ok(sheetSrc.includes('smsShareUrl(target.sale)'), 'Expected QuickActionsSheet to wire smsShareUrl');
  });

  it('responsive card item chips pack maximum chips in one row for container width and default to +N only on overflow', () => {
    const moreW = (hidden: number) => (hidden < 10 ? 28 : 34);

    // 1. All chips fit cleanly in 1 row -> show all with zero +N overflow
    assert.equal(fitsTagsInRows([40, 45, 50], 150, 4, 1), true);
    assert.equal(computeVisibleTagCount(150, [40, 45, 50], 4, moreW, 1), 3);

    // 2. Narrow card where 5 chips exceed 1 row -> packs maximum (2) + "+3" pill cleanly
    // 50 + 4 + 50 + 4 + 28 (+3) = 136 <= 145
    assert.equal(computeVisibleTagCount(145, [50, 50, 50, 50, 50], 4, moreW, 1), 2);

    // 3. Widening the same card (e.g. orientation change / wider desktop card) reveals more or all chips
    assert.equal(computeVisibleTagCount(205, [50, 50, 50, 50, 50], 4, moreW, 1), 3);
    assert.equal(computeVisibleTagCount(270, [50, 50, 50, 50, 50], 4, moreW, 1), 5);

    // 4. Single-row mode always keeps at least 1 chip alongside +N even on ultra-narrow cards
    assert.equal(computeVisibleTagCount(100, [140, 50, 50], 4, moreW, 1), 1);
    assert.equal(computeVisibleTagCount(0, [50, 60], 4, moreW, 1), 2);
    assert.equal(computeVisibleTagCount(200, [], 4, moreW, 1), 0);

    // 5. SaleRow and SaleDetails wire single-row responsive Tags without hardcoded max={2}
    const cardSrc = fs.readFileSync(path.resolve('src/components/SaleCard.tsx'), 'utf8');
    assert.ok(cardSrc.includes('<Tags cats={chips} responsive maxRows={1} />'));
    assert.equal(cardSrc.includes('<Tags cats={chips} max={2} />'), false);

    const detailsSrc = fs.readFileSync(path.resolve('src/components/SaleDetails.tsx'), 'utf8');
    assert.ok(detailsSrc.includes('<Tags cats={chips} responsive maxRows={1} expandable />'));
  });

  it('fifth-pass audit invariants: async unmount photo guard, radiogroup arrow nav, drag cleanup, AdDialog image fallback, contact copy feedback, and valid terms label markup', () => {
    const addSrc = fs.readFileSync(path.resolve('src/components/AddSaleDialog.tsx'), 'utf8');
    assert.ok(addSrc.includes('if (!mountedRef.current) return;'), 'Expected unmount guard inside AddSaleDialog async photo loop');
    assert.ok(addSrc.includes('f.date !== initial?.date'), 'Expected edit-mode date validation to permit unchanged initial date');
    assert.ok(addSrc.includes('tabIndex={f.saleType === t ? 0 : -1}'), 'Expected roving tabindex on Sale Type radiogroup');

    const mySrc = fs.readFileSync(path.resolve('src/components/MyListings.tsx'), 'utf8');
    assert.ok(mySrc.includes('onLostPointerCapture'), 'Expected lost-pointer-capture drag cleanup in MyListings');

    const adSrc = fs.readFileSync(path.resolve('src/components/AdDialog.tsx'), 'utf8');
    assert.ok(adSrc.includes('onError={() => setImgErr(true)}'), 'Expected broken-image fallback in AdDialog');

    const contactSrc = fs.readFileSync(path.resolve('src/components/LegalContactForm.tsx'), 'utf8');
    assert.ok(contactSrc.includes("copyState === 'failed'"), 'Expected copy failure feedback in LegalContactForm');
    assert.ok(contactSrc.includes('aria-invalid={invalidFields.email'), 'Expected per-field aria-invalid in LegalContactForm');

    const chipsSrc = fs.readFileSync(path.resolve('src/components/FilterChips.tsx'), 'utf8');
    assert.ok(chipsSrc.includes('label="Today"') && chipsSrc.includes('label="This weekend"'), 'Expected remove-filter labels on date chips');

    const actionsSrc = fs.readFileSync(path.resolve('src/components/SaleActions.tsx'), 'utf8');
    assert.equal(actionsSrc.includes('<label className="terms-check"'), false, 'Expected TermsConsentField not to nest interactive buttons inside a label');

    const weatherSrc = fs.readFileSync(path.resolve('src/components/SaleWeather.tsx'), 'utf8');
    assert.ok(weatherSrc.includes('aria-busy="true"'), 'Expected accessible aria-busy loading state on SaleWeather');
  });

  it('search location control fits inside flex .combo-field shell with inset sizing, divider, clear action, and located state', () => {
    const comboSrc = fs.readFileSync(path.resolve('src/components/Combobox.tsx'), 'utf8');
    assert.ok(comboSrc.includes('className="combo-field"'), 'Expected Combobox to render flex .combo-field shell');
    assert.ok(comboSrc.includes('className="combo-trail"'), 'Expected Combobox to wrap trailing action in .combo-trail');
    assert.ok(comboSrc.includes('className="combo-clear"'), 'Expected Combobox to support inline clear action');
    assert.ok(
      comboSrc.includes("next.closest('.combo-list, .combo-clear')"),
      'Expected Combobox blur handler to close suggestions when focus moves to .locate',
    );

    const headerSrc = fs.readFileSync(path.resolve('src/components/Header.tsx'), 'utf8');
    assert.ok(headerSrc.includes('clearable'), 'Expected Header search Combobox to enable clearable');
    assert.ok(headerSrc.includes('className="combo-divider"'), 'Expected hairline divider separating input from location control');
    assert.ok(headerSrc.includes('className="locate-lbl"'), 'Expected responsive Near me label inside .locate');
    assert.ok(headerSrc.includes("located && !locating ? ' is-located' : ''"), 'Expected active located state styling on .locate');

    const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
    assert.ok(css.includes('.combo-field {') && css.includes('.combo-field:focus-within {'), 'Expected unified flex shell and focus-within styling');
    assert.ok(css.includes('min-width: calc(var(--control-h) - 8px);'), 'Expected .locate inset sizing derived from --control-h');
    assert.equal(css.includes('.combo .input.has-trail'), false, 'Expected fragile absolute has-trail padding hack to be removed');
  });
});
