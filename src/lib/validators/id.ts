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
// Omite los últimos 3 dígitos y valida la cédula base
export function validateEcuadorRuc(ruc: string) {
  const r = digitsOnly(ruc);
  if (!/^[0-9]{13}$/.test(r)) return false;
  if (!r.endsWith('001')) return false;
  const base = r.substring(0, 10);
  return validateEcuadorCedula(base);
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
