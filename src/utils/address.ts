export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

function splitStatePostal(token: string): { state: string; postal: string } {
  const trimmed = token.trim();
  const m = trimmed.match(
    /^([A-Za-z.\s]{1,20}?)\s+([A-Za-z0-9]{2,5}\s+[A-Za-z0-9]{2,4}|[A-Za-z0-9-]{3,12})$/,
  );
  if (m && /\d/.test(m[2])) {
    return { state: m[1].trim(), postal: m[2].replace(/\s+/g, ' ').trim() };
  }
  if (
    /^\d{4,10}(?:-\d{4})?$/.test(trimmed) ||
    (/^[A-Za-z0-9]{2,5}\s+[A-Za-z0-9]{2,4}$/.test(trimmed) && /\d/.test(trimmed))
  ) {
    return { state: '', postal: trimmed.replace(/\s+/g, ' ') };
  }
  return { state: trimmed, postal: '' };
}

export function parseFullAddress(raw: string): ParsedAddress {
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { street: '', city: '', state: '', postal: '', country: '' };
  }
  if (parts.length === 1) {
    return { street: parts[0], city: '', state: '', postal: '', country: '' };
  }
  if (parts.length === 2) {
    return { street: parts[0], city: parts[1], state: '', postal: '', country: '' };
  }
  if (parts.length === 3) {
    const sp = splitStatePostal(parts[2]);
    return {
      street: parts[0],
      city: parts[1],
      state: sp.state,
      postal: sp.postal,
      country: '',
    };
  }
  const sp = splitStatePostal(parts[parts.length - 2]);
  return {
    street: parts.slice(0, -3).join(', '),
    city: parts[parts.length - 3],
    state: sp.state,
    postal: sp.postal,
    country: parts[parts.length - 1],
  };
}

export function composeFullAddress(f: ParsedAddress): string {
  const statePostal = [f.state.trim(), f.postal.trim()].filter(Boolean).join(' ');
  return [f.street.trim(), f.city.trim(), statePostal, f.country.trim()]
    .filter(Boolean)
    .join(', ')
    .slice(0, 200);
}
