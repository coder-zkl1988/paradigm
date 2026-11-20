import { describe, expect, it } from 'vitest';
import { htmlParse, makeView, mdBlocks, slidesOf, tableOf, tableToCsv } from '../src';

describe('Markdown blocks', () => {
  it('reads headings, lists, tables, quotes and code', () => {
    const b = mdBlocks('# Title\n\nSome **bold** and `code`.\n\n- one\n1. first\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n> quote\n\n```\nlet x = 1;\n```\n---\nlast');
    expect(b.map((x) => x.k)).toEqual(['h1', 'p', 'li', 'li', 'table', 'quote', 'code', 'hr', 'p']);
    expect(b[1].text).toBe('Some bold and code.');
    expect(b[3].mark).toBe('1.');
    expect(b[4].rows).toEqual([['1', '2']]);
  });
});

describe('HTML preview parser', () => {
  const page = '<!doctype html><html><head><title>T &amp; Co</title><style>:root{--bg:#101014;--ink:#FAFAFA;--accent:#E07A5F} main{text-align:center}</style><script>alert("x")</' + 'script></head><body onload="steal()"><nav><a href="/a">Docs</a><a href="/b">Pricing</a></nav><main><h1 onclick="x()">Hello <em>world</em></h1><img src=x onerror="alert(1)" alt="A hero"><iframe src="http://evil">inside frame</iframe><ol><li>x</li><li>y</li></ol><button class="cta">Go</button><input type="email" placeholder="you@example.com"><table><tr><th>N</th></tr><tr><td>a</td></tr></table></main></body></html>';
  const p = htmlParse(page);
  it('keeps text, order and colours', () => {
    expect(p.title).toBe('T & Co');
    expect(p.theme).toEqual({ bg: '#101014', ink: '#FAFAFA', accent: '#E07A5F', center: true });
    expect(p.blocks.map((b) => b.k)).toEqual(['nav', 'h1', 'img', 'li', 'li', 'button', 'field', 'table']);
    expect(p.blocks[3].mark).toBe('1.');
  });
  it('drops scripts, frames and handlers', () => {
    expect(JSON.stringify(p)).not.toMatch(/alert|steal|inside frame|onerror/);
  });
});

describe('tables', () => {
  it('reads every shape of data', () => {
    expect(tableOf([{ a: 1, b: 'x' }, { a: 2, c: true }])!.head).toEqual(['a', 'b', 'c']);
    expect(tableOf('name,qty\n"Smith, J",2\nLee,3\n')!.rows[0]).toEqual(['Smith, J', '2']);
    expect(tableOf('a\tb\n1\t2')!.rows).toEqual([['1', '2']]);
    expect(tableOf({ repo: 'shop' })!.head).toEqual(['Field', 'Value']);
    expect(tableOf('just a sentence, with a comma')).toBeNull();
  });
  it('writes CSV with quoting', () => {
    expect(tableToCsv({ head: ['a'], rows: [['x, "y"']] })).toBe('a\r\n"x, ""y"""\r\n');
  });
});

describe('render node views', () => {
  const inp = (v: unknown, type = 'text') => ({ from: 'u1', type, value: v });
  it('makes a sheet with sums', () => {
    const v = makeView('sheet', [inp('item,qty,price\nPen,2,1.50\nBook,1,12')]).view;
    expect(v.kind).toBe('sheet');
    if (v.kind === 'sheet') expect(v.sums.map((s) => s.value)).toEqual([3, 13.5]);
  });
  it('splits slides by heading and six items', () => {
    expect(slidesOf(mdBlocks('# Deck\n\nIntro\n\n## First\n\n- a\n- b\n\n## Second\n\ntext')).map((s) => s.title)).toEqual(['Deck', 'First', 'Second']);
  });
  it('builds an escaped page from Markdown', () => {
    const r = makeView('html', [inp('# Plain\n\ntext & <stuff>')]);
    expect(r.value as string).toContain('&lt;stuff&gt;');
  });
  it('refuses empty input', () => {
    expect(() => makeView('doc', [inp('')])).toThrow(/Nothing to show/);
  });
});
