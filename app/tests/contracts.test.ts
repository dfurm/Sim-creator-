/** Contract structures: spec examples and S02 artefacts validate against spec/contracts/*.schema.json. */
import { describe, expect, it } from 'vitest';
import { validateSchema } from '../src/core/schemas';
import hostCommand from '../../spec/examples/host-command.json';
import wallManifest from '../../spec/examples/wall.manifest.json';
import wallScenario from '../../spec/examples/wall.scenario.json';
import wallSnapshot from '../../spec/examples/wall.snapshot.json';
import s02Manifest from '../../spec/manifests/S02.json';
import { S02_ANCHORS, S02_SCENARIOS } from '../src/sims/S02/definition';
import metadata from '../src/sims/S02/metadata.json';

describe('spec examples validate (cross-host contract structures, S11 wall)', () => {
  it('host command envelope', () => expect(validateSchema('envelope', hostCommand)).toEqual({ valid: true, errors: [] }));
  it('wall manifest', () => expect(validateSchema('manifest', wallManifest).valid).toBe(true));
  it('wall scenario', () => expect(validateSchema('scenario', wallScenario).valid).toBe(true));
  it('wall snapshot', () => expect(validateSchema('snapshot', wallSnapshot).valid).toBe(true));
  it('schema rejects a malformed envelope', () => {
    const r = validateSchema('envelope', { ...hostCommand, protocol: 'other/1', extra: 1 });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/protocol|additional/);
  });
});

describe('S02 artefacts', () => {
  it('spec S02 manifest validates', () => expect(validateSchema('manifest', s02Manifest).valid).toBe(true));
  for (const [k, s] of Object.entries(S02_SCENARIOS)) {
    it(`scenario ${k} validates`, () => expect(validateSchema('scenario', s)).toEqual({ valid: true, errors: [] }));
  }
  it('every manifest anchor is registered', () => {
    expect(S02_ANCHORS.missingFromManifest(s02Manifest.rendering.anchors)).toEqual([]);
  });
});

describe('S02 sidecar metadata', () => {
  const statuses = new Set(['verified', 'single-source', 'unverified', 'needs-SME-review']);
  const collect = (o: unknown, out: string[] = []): string[] => {
    if (Array.isArray(o)) o.forEach((x) => collect(x, out));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'verification_status') out.push(v as string); collect(v, out); }
    return out;
  };
  it('every equation, coefficient, reference and rule has a verification_status', () => {
    for (const list of [metadata.equations, metadata.coefficients, metadata.references, metadata.applicabilityRules]) {
      for (const item of list) expect(statuses.has((item as { verification_status: string }).verification_status)).toBe(true);
    }
  });
  it('nothing is marked verified or reviewed', () => {
    const all = collect(metadata);
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter((s) => s === 'verified')).toEqual([]);
  });
  it('all curriculum mappings are proposed; every activity has Bloom level and evidence type', () => {
    for (const a of metadata.activities) {
      expect(a.bloom).toBeTruthy();
      expect(a.evidenceType).toBeTruthy();
      for (const m of [...a.eaStage1, ...a.ncse2026]) expect(m.mappingStatus).toBe('proposed');
    }
    expect(metadata.fidelity.mappingStatus).toBe('proposed');
  });
});
