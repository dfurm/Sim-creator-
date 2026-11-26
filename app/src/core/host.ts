/**
 * In-process host adapter for the furmtech.sim/1 envelope (contracts/envelope.schema.json).
 * Used by the standalone page and by contract tests; an iframe adapter would forward
 * postMessage envelopes to the same handler after origin/source checks. Pure: no DOM.
 *
 * Rules implemented (integration/WEBSITE_DEPLOYMENT_PLAN.md, SIMULATION_BLOCK_INTERFACE.md):
 * - validate every message against the envelope schema; cap payload size;
 * - reject commands before handshake; require exact instanceId and modelVersion;
 * - retry cache keyed by session + requestId: a repeated request returns the cached reply
 *   without re-executing it;
 * - acknowledgements and events are separate envelopes.
 */
import type { BlockEvent, Inputs, Snapshot } from '../../../spec/contracts/block';
import { AlgebraicBlock, BlockError } from './block';
import { validateSchema } from './schemas';

export const PROTOCOL = 'furmtech.sim/1';
export const MAX_PAYLOAD_BYTES = 64 * 1024;

export interface Envelope {
  protocol: string; session: string; instanceId: string; requestId: string;
  modelVersion: string; revision: number; kind: 'command' | 'ack' | 'event' | 'error';
  name: string; payload: Record<string, unknown>;
}

type Command = 'handshake' | 'setInputParameters' | 'calculate' | 'getOutputs' | 'saveState' | 'restoreState' | 'reset';
const COMMANDS: ReadonlySet<string> = new Set<Command>([
  'handshake', 'setInputParameters', 'calculate', 'getOutputs', 'saveState', 'restoreState', 'reset',
]);

export class InProcessHost {
  private readonly sessions = new Set<string>();
  private readonly cache = new Map<string, Envelope>();
  private readonly eventSinks = new Set<(e: Envelope) => void>();
  private unsubscribe: (() => void) | null = null;
  private eventCounter = 0;

  constructor(private readonly block: AlgebraicBlock) {}

  onEvent(sink: (e: Envelope) => void): () => void {
    this.eventSinks.add(sink);
    if (!this.unsubscribe) this.unsubscribe = this.block.subscribe((e) => this.forward(e));
    return () => { this.eventSinks.delete(sink); };
  }

  async handle(message: unknown): Promise<Envelope> {
    const size = byteLength(message);
    const base = asPartial(message);
    if (size > MAX_PAYLOAD_BYTES) return this.error(base, 'PAYLOAD_TOO_LARGE', `Message ${size} B exceeds ${MAX_PAYLOAD_BYTES} B.`);
    const v = validateSchema('envelope', message);
    if (!v.valid) return this.error(base, 'BAD_ENVELOPE', v.errors.join('; '));
    const msg = message as Envelope;
    const key = `${msg.session}\u0000${msg.requestId}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const reply = await this.execute(msg);
    this.cache.set(key, reply);
    return reply;
  }

  private async execute(msg: Envelope): Promise<Envelope> {
    if (msg.kind !== 'command') return this.error(msg, 'NOT_A_COMMAND', `Host accepts kind "command" only (got "${msg.kind}").`);
    if (!COMMANDS.has(msg.name)) return this.error(msg, 'UNKNOWN_COMMAND', `Unknown command "${msg.name}".`);
    if (msg.instanceId !== this.block.instanceId) return this.error(msg, 'WRONG_INSTANCE', `No instance "${msg.instanceId}".`);
    if (msg.modelVersion !== this.block.def.modelVersion) {
      return this.error(msg, 'INCOMPATIBLE_VERSION', `Model ${msg.modelVersion} requested; instance runs ${this.block.def.modelVersion}.`);
    }
    if (msg.name === 'handshake') {
      this.sessions.add(msg.session);
      return this.ack(msg, { simulationId: this.block.def.simulationId, modelVersion: this.block.def.modelVersion, revision: this.block.getRevision() });
    }
    if (!this.sessions.has(msg.session)) return this.error(msg, 'NO_HANDSHAKE', 'Command rejected before handshake.');
    try {
      switch (msg.name as Command) {
        case 'setInputParameters': {
          const rev = await this.block.setInputParameters(msg.payload as Inputs, msg.revision);
          return this.ack(msg, { revision: rev });
        }
        case 'calculate': {
          const r = await this.block.calculate();
          return this.ack(msg, { revision: r.revision, outputs: r.outputs, checks: r.checks });
        }
        case 'getOutputs': {
          const r = this.block.getOutputs();
          return this.ack(msg, { revision: r.revision, outputs: r.outputs, checks: r.checks });
        }
        case 'saveState':
          return this.ack(msg, { snapshot: this.block.saveState() });
        case 'restoreState':
          await this.block.restoreState(msg.payload['snapshot'] as Snapshot);
          return this.ack(msg, { revision: this.block.getRevision() });
        case 'reset':
          await this.block.reset();
          return this.ack(msg, { revision: this.block.getRevision() });
        default:
          return this.error(msg, 'UNKNOWN_COMMAND', msg.name);
      }
    } catch (e) {
      if (e instanceof BlockError) return this.error(msg, e.code, e.message, e.details.messages);
      return this.error(msg, 'INTERNAL', String(e));
    }
  }

  private ack(cmd: Envelope, payload: Record<string, unknown>): Envelope {
    return { ...cmd, kind: 'ack', revision: this.block.getRevision(), payload };
  }

  private error(cmd: Partial<Envelope>, code: string, message: string, messages?: string[]): Envelope {
    return {
      protocol: PROTOCOL,
      session: nonEmpty(cmd.session, 'unknown'),
      instanceId: nonEmpty(cmd.instanceId, this.block.instanceId),
      requestId: nonEmpty(cmd.requestId, 'unknown'),
      modelVersion: this.block.def.modelVersion,
      revision: safeRevision(this.block),
      kind: 'error',
      name: nonEmpty(cmd.name, 'error'),
      payload: { code, message, ...(messages ? { messages } : {}), recoverable: true },
    };
  }

  private forward(e: BlockEvent): void {
    for (const session of this.sessions) {
      const env: Envelope = {
        protocol: PROTOCOL, session, instanceId: e.instanceId, requestId: `event-${++this.eventCounter}`,
        modelVersion: this.block.def.modelVersion, revision: e.revision, kind: 'event', name: e.type,
        payload: { ...e.payload, runId: e.runId, timeSI: e.timeSI },
      };
      for (const s of this.eventSinks) s(env);
    }
  }
}

function byteLength(x: unknown): number {
  try { return new TextEncoder().encode(JSON.stringify(x) ?? '').length; } catch { return Infinity; }
}
function asPartial(x: unknown): Partial<Envelope> {
  return x && typeof x === 'object' ? (x as Partial<Envelope>) : {};
}
function nonEmpty(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}
function safeRevision(b: AlgebraicBlock): number {
  return b.getRevision();
}
