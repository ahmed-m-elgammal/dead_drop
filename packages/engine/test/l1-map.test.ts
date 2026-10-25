import { describe, expect, it } from 'vitest';
import { MapValidationError, edgeCost, validateCityMap } from '../src/map.js';
import { loadAlphaMap, loadRawMapJson } from './helpers.js';

describe('L1 · map_alpha v1.2.0 structure (the published numbers everything is tied to)', () => {
  const vm = loadAlphaMap();

  it('has 48 nodes / 84 edges with the 56F/16T/12M class mix', () => {
    expect(vm.map.nodes).toHaveLength(48);
    expect(vm.map.edges).toHaveLength(84);
    const mix = { F: 0, T: 0, M: 0 };
    for (const e of vm.map.edges) mix[e.type] += 1;
    expect(mix).toEqual({ F: 56, T: 16, M: 12 });
  });

  it('declares the widened pools: 24 candidates, 2 gates, 2 safehouses, disjoint', () => {
    expect(vm.map.drop_candidates).toHaveLength(24);
    expect(vm.map.gates).toEqual(['D1-08', 'D4-02']);
    expect(vm.map.safehouses).toEqual(['D2-07', 'D3-06']);
    const all = [...vm.map.drop_candidates, ...vm.map.gates, ...vm.map.safehouses];
    expect(new Set(all).size).toBe(all.length);
  });

  it('exactly one parallel-edge pair exists (aud003 §5 map-content note)', () => {
    expect(vm.parallelEdgePairs).toBe(1);
  });

  it('derives node pool flags from the arrays (T11 divergence handled)', () => {
    const byId = new Map(vm.map.nodes.map((n) => [n.id, n]));
    expect(byId.get('D2-07')?.is_safehouse).toBe(true);
    expect(byId.get('D1-08')?.is_gate).toBe(true);
    expect(byId.get('D2-06')?.is_drop_candidate).toBe(true);
    expect(byId.get('D3-01')?.is_drop_candidate).toBe(true); // v1.2.0 addition
    expect(byId.get('D2-07')?.is_gate).toBe(false);
  });

  it('edge costs come from the parameter table, never hard-coded', () => {
    expect(edgeCost('F')).toBe(1);
    expect(edgeCost('T')).toBe(2);
    expect(edgeCost('M')).toBe(3);
  });

  it('fails loudly on tampered data (pool overlap)', () => {
    const raw = structuredClone(loadRawMapJson());
    (raw['safehouses'] as string[]).push('D1-08'); // D1-08 is a gate
    expect(() => validateCityMap(raw)).toThrow(MapValidationError);
  });

  it('fails loudly on a bad edge class', () => {
    const raw = structuredClone(loadRawMapJson());
    (raw['edges'] as Array<{ type: string }>)[0]!.type = 'X';
    expect(() => validateCityMap(raw)).toThrow(MapValidationError);
  });
});
