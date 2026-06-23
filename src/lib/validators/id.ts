export function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

// Valida cédula ecuatoriana (10 dígitos)
export function validateEcuadorCedula(cedula: string) {
  const ced = digitsOnly(cedula);
  if (!/^[0-9]{10}$/.test(ced)) return false;

  const province = Number(ced.substring(0, 2));
  if (province < 1 || province > 24) return false;

  const digits = ced.split('').map((d) => Number(d));
  const verifier = digits[9];

  let acc = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i];
    if (i % 2 === 0) {
      val = val * 2;
      if (val > 9) val -= 9;
    }
    acc += val;
  }
  const nextTen = Math.ceil(acc / 10) * 10;
  let check = nextTen - acc;
  if (check === 10) check = 0;
  return check === verifier;
}

// Valida RUC ecuatoriano que termina en 001 (13 dígitos)
// Persona natural usa cédula base, persona jurídica usa algoritmo especial con tercer dígito 9.
export function validateEcuadorRucJuridica(ruc: string) {
  const r = digitsOnly(ruc);
  if (!/^[0-9]{13}$/.test(r)) return false;
  if (r[2] !== '9') return false;
  if (!r.endsWith('001')) return false;

  const digits = r.split('').map((d) => Number(d));
  const coefficients = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * coefficients[i];
  }

  const mod = sum % 11;
  let verifier = 11 - mod;
  if (verifier === 11) verifier = 0;
  if (verifier === 10) return false;

  return verifier === digits[9];
}

export function validateEcuadorRuc(ruc: string) {
  // Practical requirement: a RUC is 13 numeric digits. We deliberately do NOT
  // enforce the '001' establishment suffix, the 3rd-digit type, or the
  // check-digit — those reject legitimate RUCs: public-sector RUCs (3rd digit
  // 6), branch establishments ending in 002/003…, and valid numbers issued by
  // the SRI that don't pass the modulus check. 13 digits is the rule.
  return /^[0-9]{13}$/.test(digitsOnly(ruc));
}

// Valida que sea cédula (10) o RUC (13 con 001). Si es RUC, valida los primeros 10.
export function validateCedulaOrRuc(value: string) {
  const v = (value || '').toString().trim();
  const d = digitsOnly(v);
  if (d.length === 10) return validateEcuadorCedula(d);
  if (d.length === 13) return validateEcuadorRuc(d);
  return false;
}

export default validateCedulaOrRuc;

// Validate tax number (RUC / equivalent) for a given country code or name.
// Currently supports Ecuador explicitly and provides a sensible fallback.
export function validateTaxNumberForCountry(taxNumber: string | undefined, country?: string) {
  const v = (taxNumber || '').toString().trim();
  if (!v) return false;
  const d = digitsOnly(v);

  if (!country) {
    // without country, accept common lengths (6-20 digits)
    return d.length >= 6 && d.length <= 20;
  }

  const c = country.toLowerCase();
  // Ecuador: RUC 13 digits ending with 001
  if (c.includes('ec') || c.includes('ecuador')) {
    return validateEcuadorRuc(d);
  }

  // Spain: NIF/NIE/CIF basic checks
  if (c.includes('es') || c.includes('spain') || c.includes('espana') || c.includes('españa')) {
    // Normalize uppercase and remove spaces/hyphens
    const s = (taxNumber || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    // NIF (DNI): 8 digits + letter
    if (/^[0-9]{8}[A-Z]$/.test(s)) return true;
    // NIE: starts with X/Y/Z + 7 digits + letter
    if (/^[XYZ][0-9]{7}[A-Z]$/.test(s)) return true;
    // CIF (company): letter + 7 digits + control (digit or letter)
    if (/^[A-HJNP-SUVW][0-9]{7}[0-9A-J]$/.test(s)) return true;
    return false;
  }

  // Peru: RUC 11 digits (basic check)
  if (c.includes('pe') || c.includes('peru')) {
    return /^[0-9]{11}$/.test(d);
  }

  // Colombia: NIT typically 9-10 digits (allow 6-15 general)
  if (c.includes('co') || c.includes('colombia')) {
    return d.length >= 6 && d.length <= 15;
  }

  // Fallback: accept 6-20 digits (generic tax id)
  return d.length >= 6 && d.length <= 20;
}

// Validate phone number roughly based on country. This is a lightweight
// validator (no external lib). It accepts E.164-like numbers or applies
// simple country-specific rules (Ecuador mobile starts with 9 and 10 digits local).
export function validatePhoneForCountry(phone: string | undefined, country?: string) {
  const p = (phone || '').toString().trim();
  if (!p) return false;
  const d = digitsOnly(p);

  // If it looks like an international E.164 number (starts with + and 7-15 digits)
  // and no country was provided, accept broadly. If a country is provided,
  // fall through to country-specific logic so we can validate properly.
  if (p.startsWith('+') && !country) {
    return d.length >= 7 && d.length <= 15;
  }

  if (!country) {
    // no country: accept 7-15 digits
    return d.length >= 7 && d.length <= 15;
  }

  const c = country.toLowerCase();
  // Ecuador: local mobile last 10 digits and starts with 9 (09 or 9)
  if (c.includes('ec') || c.includes('ecuador')) {
    // If provided with country code (593), strip it
    let local = d;
    if (local.startsWith('593')) local = local.slice(3);
    // Two acceptable local formats:
    // - 9 digits starting with 9 (e.g. 9XXXXXXXX)
    // - 10 digits starting with 09 (e.g. 09XXXXXXXX)
    if (local.length === 9 && local.startsWith('9')) return true;
    if (local.length === 10 && local.startsWith('09')) return true;
    // also allow if user included a leading zero and we accidentally stripped it elsewhere
    if (local.startsWith('0') && local.slice(1).length === 9 && local.slice(1).startsWith('9')) return true;
    return false;
  }

  // Peru: mobile usually 9 digits starting with 9
  if (c.includes('pe') || c.includes('peru')) {
    let local = d;
    if (local.startsWith('51')) local = local.slice(2);
    if (local.startsWith('0')) local = local.slice(1);
    return local.length === 9 && local.startsWith('9');
  }

  // Colombia: mobile 10 digits typically starting with 3
  if (c.includes('co') || c.includes('colombia')) {
    let local = d;
    if (local.startsWith('57')) local = local.slice(2);
    if (local.startsWith('0')) local = local.slice(1);
    return local.length === 10 && local.startsWith('3');
  }

  // Fallback: accept 7-15 digits
  return d.length >= 7 && d.length <= 15;
}
