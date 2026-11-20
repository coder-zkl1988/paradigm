import { describe, expect, it } from 'vitest';
import { MANIFEST_TEMPLATE, SAMPLE_MANIFESTS, skillText, validateManifest } from '../src';

const base = () => JSON.parse(JSON.stringify(MANIFEST_TEMPLATE));
const paths = (m: unknown) => validateManifest(m).map((p) => p.path);

describe('manifest check', () => {
  it('passes every sample and the template', () => {
    for (const m of SAMPLE_MANIFESTS) expect(validateManifest(m)).toEqual([]);
    expect(validateManifest(base())).toEqual([]);
  });
  it('rejects looks, markup, bad ids and wires', () => {
    expect(paths({ ...base(), style: 'x' })).toEqual(['style']);
    expect(paths({ ...base(), name: '<b>x</b>' })).toEqual(['name']);
    expect(paths({ ...base(), id: 'Title Case' })).toEqual(['id']);
    expect(paths({ ...base(), accepts: ['text', 'banana'] })).toEqual(['accepts[1]']);
  });
  it('rejects code that reaches out, but not words in strings', () => {
    expect(paths({ ...base(), run: 'return fetch("x")' })).toEqual(['run']);
    expect(paths({ ...base(), run: 'return "the window" + input' })).toEqual([]);
    expect(paths({ ...base(), run: 'return (' })).toEqual(['run']);
  });
  it('writes a skill from the same spec', () => {
    expect(skillText()).toMatch(/at most 28 characters/);
  });
});
