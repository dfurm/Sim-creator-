/** Cross-host contract: the same state gives the same outputs standalone and through the envelope host. */
import { describe, expect, it } from 'vitest';
import { InProcessHost, PROTOCOL, type Envelope } from '../src/core/host';
import { createS02Block, S02_SCENARIOS } from '../src/sims/S02/definition';
import { validateSchema } from '../src/core/schemas';

function cmd(name: string, payload: Record<string, unknown>, requestId: string, revision = 0, extra: Partial<Envelope> = {}): Envelope {
  return { protocol: PROTOCOL, session: 's1', instanceId: 'S02-host', requestId, modelVersion: '0.2.0', revision, kind: 'command', name, payload, ...extra };
}

async function setup() {
  const block = createS02Block('S02-host');
  await block.initialise(S02_SCENARIOS['default']!);
  return { block, host: new InProcessHost(block) };
}

describe('in-process host adapter (furmtech.sim/1)', () => {
  it('rejects commands before handshake', async () => {
    const { host } = await setup();
    const r = await host.handle(cmd('calculate', {}, 'r1'));
    expect(r.kind).toBe('error');
    expect(r.payload['code']).toBe('NO_HANDSHAKE');
  });
  it('replies are schema-valid envelopes; ack and events are separate', async () => {
    const { block, host } = await setup();
    const events: Envelope[] = [];
    host.onEvent((e) => events.push(e));
    const hs = await host.handle(cmd('handshake', {}, 'r1'));
    expect(hs.kind).toBe('ack');
    const ack = await host.handle(cmd('setInputParameters', { D2: 0.02 }, 'r2', block.getRevision()));
    expect(ack.kind).toBe('ack');
    for (const e of [hs, ack, ...events]) expect(validateSchema('envelope', e).valid).toBe(true);
    expect(events.map((e) => e.name)).toContain('parameter.changed');
    expect(events.every((e) => e.kind === 'event')).toBe(true);
  });
  it('same state, same outputs: standalone vs hosted', async () => {
    const { block, host } = await setup();
    await host.handle(cmd('handshake', {}, 'h'));
    await host.handle(cmd('setInputParameters', { Q: 0.0013, D1: 0.06, D2: 0.021 }, 'p', block.getRevision()));
    const hosted = await host.handle(cmd('calculate', {}, 'c'));
    const standalone = createS02Block();
    await standalone.initialise(S02_SCENARIOS['default']!);
    await standalone.setInputParameters({ Q: 0.0013, D1: 0.06, D2: 0.021 });
    const r = await standalone.calculate();
    expect(hosted.payload['outputs']).toEqual(r.outputs);
  });
  it('retry cache: a repeated requestId is not re-executed', async () => {
    const { block, host } = await setup();
    await host.handle(cmd('handshake', {}, 'h'));
    const rev = block.getRevision();
    const a = await host.handle(cmd('setInputParameters', { Q: 0.002 }, 'dup', rev));
    const b = await host.handle(cmd('setInputParameters', { Q: 0.002 }, 'dup', rev));
    expect(b).toEqual(a);
    expect(block.getRevision()).toBe(rev + 1);
  });
  it('rejects wrong instance, wrong model version, bad envelope, oversize payload, stale revision', async () => {
    const { host } = await setup();
    await host.handle(cmd('handshake', {}, 'h'));
    expect((await host.handle(cmd('calculate', {}, 'a', 0, { instanceId: 'other' }))).payload['code']).toBe('WRONG_INSTANCE');
    expect((await host.handle(cmd('calculate', {}, 'b', 0, { modelVersion: '0.1.0' }))).payload['code']).toBe('INCOMPATIBLE_VERSION');
    expect((await host.handle({ protocol: 'x' })).payload['code']).toBe('BAD_ENVELOPE');
    expect((await host.handle(cmd('setInputParameters', { big: 'x'.repeat(70000) }, 'c'))).payload['code']).toBe('PAYLOAD_TOO_LARGE');
    expect((await host.handle(cmd('setInputParameters', { Q: 0.002 }, 'd', 999))).payload['code']).toBe('STALE_REVISION');
    expect((await host.handle(cmd('setInputParameters', { Q: -1 }, 'e', 1))).payload['code']).toBe('BAD_INPUT');
  });
  it('save/restore through the host reproduces outputs', async () => {
    const { block, host } = await setup();
    await host.handle(cmd('handshake', {}, 'h'));
    await host.handle(cmd('setInputParameters', { D2: 0.017 }, 'p', block.getRevision()));
    const out1 = (await host.handle(cmd('calculate', {}, 'c1'))).payload['outputs'];
    const snap = (await host.handle(cmd('saveState', {}, 's'))).payload['snapshot'];
    await host.handle(cmd('reset', {}, 'r'));
    await host.handle(cmd('restoreState', { snapshot: snap }, 'rs'));
    const out2 = (await host.handle(cmd('getOutputs', {}, 'g'))).payload['outputs'];
    expect(out2).toEqual(out1);
  });
});
