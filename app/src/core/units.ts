/**
 * SI units and dimensional analysis. Pure: no DOM, no framework.
 * Dimension exponents are ordered [M, L, T, Θ, N, I, J].
 */
export type Dimension = readonly [number, number, number, number, number, number, number];

export const DIMENSIONLESS: Dimension = [0, 0, 0, 0, 0, 0, 0];
export const MASS: Dimension = [1, 0, 0, 0, 0, 0, 0];
export const LENGTH: Dimension = [0, 1, 0, 0, 0, 0, 0];
export const TIME: Dimension = [0, 0, 1, 0, 0, 0, 0];

export function dimMul(a: Dimension, b: Dimension): Dimension {
  return a.map((x, i) => x + (b[i] ?? 0)) as unknown as Dimension;
}
export function dimDiv(a: Dimension, b: Dimension): Dimension {
  return a.map((x, i) => x - (b[i] ?? 0)) as unknown as Dimension;
}
export function dimPow(a: Dimension, n: number): Dimension {
  return a.map((x) => x * n) as unknown as Dimension;
}
export function dimEqual(a: Dimension, b: Dimension): boolean {
  return a.every((x, i) => Math.abs(x - (b[i] ?? 0)) < 1e-12);
}
export function dimToString(d: Dimension): string {
  const names = ['M', 'L', 'T', 'Θ', 'N', 'I', 'J'];
  const parts = d.flatMap((e, i) => (e === 0 ? [] : [e === 1 ? names[i]! : `${names[i]!}^${e}`]));
  return parts.length ? parts.join('·') : '1';
}

export interface UnitDef {
  /** Display symbol, exactly as used in manifests. */
  readonly symbol: string;
  readonly dimension: Dimension;
  /** SI value = factor × value + offset. */
  readonly factor: number;
  readonly offset: number;
}

const u = (symbol: string, dimension: Dimension, factor = 1, offset = 0): UnitDef => ({
  symbol, dimension, factor, offset,
});

const VOLUME_FLOW: Dimension = [0, 3, -1, 0, 0, 0, 0];
const AREA: Dimension = [0, 2, 0, 0, 0, 0, 0];
const VELOCITY: Dimension = [0, 1, -1, 0, 0, 0, 0];
const MASS_FLOW: Dimension = [1, 0, -1, 0, 0, 0, 0];
const DENSITY: Dimension = [1, -3, 0, 0, 0, 0, 0];

/** Registry of units used by the Phase 2 blocks. SI units have factor 1, offset 0. */
export const UNITS: Readonly<Record<string, UnitDef>> = {
  '1': u('1', DIMENSIONLESS),
  'm': u('m', LENGTH),
  'mm': u('mm', LENGTH, 1e-3),
  'm²': u('m²', AREA),
  'mm²': u('mm²', AREA, 1e-6),
  'm³/s': u('m³/s', VOLUME_FLOW),
  'L/min': u('L/min', VOLUME_FLOW, 1e-3 / 60),
  'L/s': u('L/s', VOLUME_FLOW, 1e-3),
  'm/s': u('m/s', VELOCITY),
  'kg/s': u('kg/s', MASS_FLOW),
  'kg/m³': u('kg/m³', DENSITY),
  's': u('s', TIME),
  'K': u('K', [0, 0, 0, 1, 0, 0, 0]),
  '°C': u('°C', [0, 0, 0, 1, 0, 0, 0], 1, 273.15),
};

export function unitDef(symbol: string): UnitDef {
  const d = UNITS[symbol];
  if (!d) throw new Error(`Unknown unit "${symbol}"`);
  return d;
}

export function isSIUnit(symbol: string): boolean {
  const d = unitDef(symbol);
  return d.factor === 1 && d.offset === 0;
}

export function toSI(value: number, unit: string): number {
  const d = unitDef(unit);
  return value * d.factor + d.offset;
}

export function fromSI(valueSI: number, unit: string): number {
  const d = unitDef(unit);
  return (valueSI - d.offset) / d.factor;
}

/** Convert between two units of the same dimension; throws on dimension mismatch. */
export function convert(value: number, from: string, to: string): number {
  const a = unitDef(from);
  const b = unitDef(to);
  if (!dimEqual(a.dimension, b.dimension)) {
    throw new Error(`Dimension mismatch: ${from} [${dimToString(a.dimension)}] → ${to} [${dimToString(b.dimension)}]`);
  }
  return fromSI(toSI(value, from), to);
}

/** A dimensioned scalar used to check model formulas symbolically. */
export class DimQ {
  constructor(readonly value: number, readonly dim: Dimension) {}
  static of(value: number, unit: string): DimQ {
    const d = unitDef(unit);
    return new DimQ(toSI(value, unit), d.dimension);
  }
  static pure(value: number): DimQ { return new DimQ(value, DIMENSIONLESS); }
  mul(o: DimQ): DimQ { return new DimQ(this.value * o.value, dimMul(this.dim, o.dim)); }
  div(o: DimQ): DimQ { return new DimQ(this.value / o.value, dimDiv(this.dim, o.dim)); }
  pow(n: number): DimQ { return new DimQ(this.value ** n, dimPow(this.dim, n)); }
  add(o: DimQ): DimQ {
    if (!dimEqual(this.dim, o.dim)) {
      throw new Error(`Cannot add [${dimToString(this.dim)}] and [${dimToString(o.dim)}]`);
    }
    return new DimQ(this.value + o.value, this.dim);
  }
  sub(o: DimQ): DimQ { return this.add(new DimQ(-o.value, o.dim)); }
  hasUnit(unit: string): boolean { return dimEqual(this.dim, unitDef(unit).dimension); }
}
