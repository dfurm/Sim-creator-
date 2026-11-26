/**
 * JSON Schema validation against the spec's contracts (read directly from ./spec,
 * never copied). Pure: no DOM.
 */
import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject, ValidateFunction } from 'ajv';
import envelopeSchema from '../../../spec/contracts/envelope.schema.json';
import manifestSchema from '../../../spec/contracts/manifest.schema.json';
import scenarioSchema from '../../../spec/contracts/scenario.schema.json';
import snapshotSchema from '../../../spec/contracts/snapshot.schema.json';

export type SchemaName = 'envelope' | 'manifest' | 'scenario' | 'snapshot';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators: Record<SchemaName, ValidateFunction> = {
  envelope: ajv.compile(envelopeSchema),
  manifest: ajv.compile(manifestSchema),
  scenario: ajv.compile(scenarioSchema),
  snapshot: ajv.compile(snapshotSchema),
};

export interface SchemaResult { valid: boolean; errors: string[] }

function fmt(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`);
}

export function validateSchema(name: SchemaName, data: unknown): SchemaResult {
  const v = validators[name];
  const valid = v(data) as boolean;
  return { valid, errors: valid ? [] : fmt(v.errors) };
}
