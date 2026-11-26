/** Number formatting for display. Pure. Display defaults to three significant figures (spec §E). */
export function sig(x: number, digits = 3): string {
  if (x === 0) return '0';
  if (!Number.isFinite(x)) return String(x);
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e5) {
    const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(a)));
    return x.toFixed(decimals);
  }
  const [m, e] = x.toExponential(digits - 1).split('e');
  return `${m}×10${superscript(Number(e))}`;
}

/** Plain ASCII form for text alternatives and screen readers. */
export function sigText(x: number, digits = 3): string {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e5) return sig(x, digits);
  return x.toExponential(digits - 1).replace('e', ' times 10 to the ');
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function superscript(n: number): string {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

/** Full precision for inspection and export. */
export function full(x: number): string {
  return String(x);
}
