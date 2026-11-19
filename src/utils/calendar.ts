import { PAYMENTS } from '../data/seedSales';
import type { Sale } from '../types/sale';
import { iso, pad, shareUrl, todayStart } from './format';
import { directionsUrl } from './geocode';

const PAY_LABEL = new Map<string, string>(PAYMENTS.map((p) => [p.id, p.label]));

export function getLocalTimeZone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && typeof tz === 'string' ? tz : undefined;
  } catch {
    return undefined;
  }
}

function parseClockMinutes(t: string, fallbackMinutes: number): number {
  const match = /^\s*(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?\s*$/.exec(String(t ?? ''));
  if (!match) return fallbackMinutes;
  const hh = Number(match[1]);
  const mm = Number(match[2] ?? '0');
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallbackMinutes;
  const h = Math.min(23, Math.max(0, Math.floor(hh)));
  const m = Math.min(59, Math.max(0, Math.floor(mm)));
  return h * 60 + m;
}

function formatDateYmd(dateStr: string): { ymd: string; dashed: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ymd: dateStr.replace(/-/g, ''), dashed: dateStr };
  }
  const fallback = iso(todayStart());
  return { ymd: fallback.replace(/-/g, ''), dashed: fallback };
}

function addOneDay(dashed: string): { ymd: string; dashed: string } {
  const [y, m, d] = dashed.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const nextDashed = iso(next);
  return { ymd: nextDashed.replace(/-/g, ''), dashed: nextDashed };
}

export function resolveEventTimes(s: Pick<Sale, 'date' | 'start' | 'end'>): {
  startStamp: string;
  endStamp: string;
  startIsoLocal: string;
  endIsoLocal: string;
} {
  const startDay = formatDateYmd(s.date);
  const startMin = parseClockMinutes(s.start, 8 * 60);
  let endMin = parseClockMinutes(s.end, startMin + 60);
  let endDay = startDay;

  if (endMin <= startMin) {
    endMin = startMin + 60;
    if (endMin >= 24 * 60) {
      endMin -= 24 * 60;
      endDay = addOneDay(startDay.dashed);
    }
  }

  const sh = pad(Math.floor(startMin / 60));
  const sm = pad(startMin % 60);
  const eh = pad(Math.floor(endMin / 60));
  const em = pad(endMin % 60);

  return {
    startStamp: `${startDay.ymd}T${sh}${sm}00`,
    endStamp: `${endDay.ymd}T${eh}${em}00`,
    startIsoLocal: `${startDay.dashed}T${sh}:${sm}:00`,
    endIsoLocal: `${endDay.dashed}T${eh}:${em}:00`,
  };
}

export function buildCalendarNotes(s: Sale): string {
  const payList = (s.pay || [])
    .map((id) => PAY_LABEL.get(id) || id)
    .filter(Boolean);
  const url = shareUrl(s);
  const dirs = directionsUrl(s);

  const parts = [
    s.saleType ? `Sale type: ${s.saleType}` : '',
    s.desc ? s.desc.trim() : '',
    s.items && s.items.length
      ? `Items: ${s.items.slice(0, 12).join(', ')}`
      : '',
    payList.length ? `Payment accepted: ${payList.join(', ')}` : '',
    dirs ? `Directions: ${dirs}` : '',
    url ? `Listing: ${url}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

export function googleCalUrl(s: Sale, timeZone = getLocalTimeZone()): string {
  const times = resolveEventTimes(s);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: s.title,
    dates: `${times.startStamp}/${times.endStamp}`,
    location: s.address,
    details: buildCalendarNotes(s),
  });
  if (timeZone) params.set('ctz', timeZone);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalUrl(s: Sale): string {
  const times = resolveEventTimes(s);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: s.title,
    startdt: times.startIsoLocal,
    enddt: times.endIsoLocal,
    location: s.address,
    body: buildCalendarNotes(s),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

export function icsEsc(t: string): string {
  return String(t)
    .replace(/\r\n?/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function icsParamQuote(t: string): string {
  return `"${String(t).replace(/[\r\n"]/g, ' ').trim()}"`;
}

export function foldIcsLine(line: string, maxOctets = 75): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= maxOctets) return line;
  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = maxOctets;

  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    if (currentBytes + chBytes > limit && current.length > 0) {
      out.push(current);
      current = ` ${ch}`;
      currentBytes = 1 + chBytes;
      limit = maxOctets;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  if (current) out.push(current);
  return out.join('\r\n');
}

export function icsFilename(s: Pick<Sale, 'id' | 'title' | 'date'>): string {
  const slug = String(s.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? `-${s.date}` : '';
  const fallbackId = s.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'sale';
  return `stoop-${slug || fallbackId}${datePart}.ics`;
}

export function buildIcsContent(s: Sale, now = new Date()): string {
  const times = resolveEventTimes(s);
  const safeId = s.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'sale';
  const utcStamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const notes = buildCalendarNotes(s);
  const url = shareUrl(s);
  const hasCoords =
    typeof s.lat === 'number' &&
    typeof s.lng === 'number' &&
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng) &&
    Math.abs(s.lat) <= 90 &&
    Math.abs(s.lng) <= 180;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stoop//Sales Near You//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${safeId}@stoop`,
    `DTSTAMP:${utcStamp}`,
    `DTSTART:${times.startStamp}`,
    `DTEND:${times.endStamp}`,
    `SUMMARY:${icsEsc(s.title)}`,
    `LOCATION:${icsEsc(s.address)}`,
  ];

  if (hasCoords) {
    lines.push(`GEO:${s.lat.toFixed(6)};${s.lng.toFixed(6)}`);
    lines.push(
      `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=${icsParamQuote(s.address)};X-APPLE-RADIUS=72;X-TITLE=${icsParamQuote(s.title)}:geo:${s.lat.toFixed(6)},${s.lng.toFixed(6)}`,
    );
  }

  lines.push(`DESCRIPTION:${icsEsc(notes)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push(
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEsc(`${s.title} starts in 1 hour`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lines.map((line) => foldIcsLine(line)).join('\r\n') + '\r\n';
}

export function downloadIcs(s: Sale): void {
  const body = buildIcsContent(s);
  const url = URL.createObjectURL(
    new Blob([body], { type: 'text/calendar;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = icsFilename(s);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
