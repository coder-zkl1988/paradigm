import { describe, expect, it } from 'vitest';
import { mergeItems, type BoardItem } from '../src';

const sticky = (id: string, text: string, x = 0): BoardItem => ({ id, kind: 'sticky', x, y: 0, w: 100, h: 100, text } as unknown as BoardItem);

describe('merging a saved board into the page', () => {
  const base = [sticky('a', 'A'), sticky('b', 'B'), sticky('c', 'C')];

  it('keeps both people\'s changes to different items', () => {
    const local = [sticky('a', 'A mine'), base[1], base[2], sticky('d', 'new here')];
    const remote = [base[0], sticky('b', 'B theirs'), sticky('e', 'new there')];
    const m = mergeItems(base, local, remote);
    expect(m.items.map((o: any) => `${o.id}:${o.text}`)).toEqual(['a:A mine', 'b:B theirs', 'e:new there', 'd:new here']);
    expect(m.kept.sort()).toEqual(['a', 'd']);
  });

  it('lets a delete on either side stand when the other side did not touch the item', () => {
    const local = [base[0], base[1]]; // deleted c here
    const remote = [base[1], base[2]]; // deleted a there
    expect(mergeItems(base, local, remote).items.map((o) => o.id)).toEqual(['b']);
  });

  it('keeps this page\'s version when both changed the same item, and its run status', () => {
    const local = [sticky('a', 'A mine', 5), { ...base[1], status: 'running' } as BoardItem, base[2]];
    const remote = [sticky('a', 'A theirs'), sticky('b', 'B', 40), base[2]];
    const m = mergeItems(base, local, remote);
    expect((m.items[0] as any).text).toBe('A mine');
    expect(m.items[1]).toMatchObject({ x: 40, status: 'running' });
    expect(m.kept).toEqual(['a']);
  });

  it('ignores arrow ends that only followed their nodes', () => {
    const arrow = (x2: number) => ({ id: 'r', kind: 'arrow', from: { id: 'a', side: 'right' }, to: { id: 'b', side: 'left' }, x1: 0, y1: 0, x2, y2: 0, color: '#111', weight: 2 } as unknown as BoardItem);
    const m = mergeItems([arrow(0)], [arrow(120)], [{ ...arrow(0), color: '#E5484D' } as BoardItem]);
    expect((m.items[0] as any).color).toBe('#E5484D');
    expect(m.kept).toEqual([]);
  });

  it('keeps both items when two people added different ones under the same id', () => {
    const arrow = { id: 'r9', kind: 'arrow', from: { id: 'a', side: 'right' }, to: { id: 'n4', side: 'left' }, x1: 0, y1: 0, x2: 0, y2: 0 } as unknown as BoardItem;
    const local = [...base, sticky('n4', 'mine'), arrow];
    const remote = [...base, sticky('n4', 'theirs')];
    const m = mergeItems(base, local, remote, (id) => id + 'x');
    expect(m.renamed).toEqual({ n4: 'n4x' });
    expect(m.items.map((o: any) => `${o.id}:${o.text ?? o.to.id}`)).toEqual(['a:A', 'b:B', 'c:C', 'n4:theirs', 'n4x:mine', 'r9:n4x']);
  });
});
