/**
 * Stable semantic anchor IDs for visual elements (e.g. "S02/throat_area").
 * IDs persist through title and layout changes. Pure: no DOM.
 */
const ANCHOR_RE = /^S\d{2,}\/[a-z][a-z0-9_]*$/;

export function anchorId(simulationId: string, name: string): string {
  const id = `${simulationId}/${name}`;
  if (!ANCHOR_RE.test(id)) throw new Error(`Invalid anchor id "${id}"`);
  return id;
}

/** DOM-safe element id derived from an anchor id. */
export function anchorElementId(anchor: string): string {
  return `anchor-${anchor.replace('/', '-')}`;
}

export interface AnchorSpec {
  id: string;
  /** What the element represents (spec: geometry, measured field, derived field, qualitative). */
  represents: 'geometry' | 'measured-field' | 'derived-field' | 'qualitative';
  /** Output or input ID the anchor is linked to. */
  quantity: string;
  label: string;
}

export class AnchorRegistry {
  private readonly map = new Map<string, AnchorSpec>();
  /** `memberIds` lets a composite lesson reuse anchors of the blocks it calls (e.g. S07, S08). */
  constructor(readonly simulationId: string, specs: readonly AnchorSpec[], readonly memberIds: readonly string[] = []) {
    const prefixes = [simulationId, ...memberIds].map((p) => `${p}/`);
    for (const s of specs) {
      if (!ANCHOR_RE.test(s.id) || !prefixes.some((p) => s.id.startsWith(p))) {
        throw new Error(`Anchor ${s.id} is not a valid ${simulationId} anchor`);
      }
      if (this.map.has(s.id)) throw new Error(`Duplicate anchor ${s.id}`);
      this.map.set(s.id, s);
    }
  }
  get(id: string): AnchorSpec | undefined { return this.map.get(id); }
  all(): AnchorSpec[] { return [...this.map.values()]; }
  /** Manifest anchors are bare names; returns names missing from this registry. */
  missingFromManifest(manifestAnchors: readonly string[]): string[] {
    return manifestAnchors.filter((n) => !this.map.has(`${this.simulationId}/${n}`));
  }
}
