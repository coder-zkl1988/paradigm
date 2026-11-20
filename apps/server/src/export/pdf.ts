// A small PDF writer for the PDF export market node: text documents with
// headings, paragraphs and lists, in the standard Helvetica fonts, A4 pages.

import type { Block } from '@paradigm/shared';

const W = 595, H = 842, M = 56;
const esc = (s: string) => s.replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7E]/g, '?');

function wrap(text: string, size: number, width: number): string[] {
  const max = Math.max(10, Math.floor(width / (size * 0.5)));
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      if ((line + ' ' + w).trim().length > max) { if (line) out.push(line); line = w; }
      else line = (line + ' ' + w).trim();
    }
    out.push(line);
  }
  return out;
}

export function textPdf(title: string, blocks: Block[]): Buffer {
  const pages: string[][] = [[]];
  let y = H - M;
  const put = (s: string, size: number, font: 'F1' | 'F2', x = M) => {
    if (y - size < M) { pages.push([]); y = H - M; }
    y -= size * 1.35;
    pages[pages.length - 1].push(`BT /${font} ${size} Tf ${x} ${y.toFixed(1)} Td (${esc(s)}) Tj ET`);
  };
  const all: Block[] = blocks.length && blocks[0].k === 'h1' ? blocks : [{ k: 'h1', text: title }, ...blocks];
  for (const b of all) {
    const size = b.k === 'h1' ? 22 : b.k === 'h2' ? 16 : b.k === 'h3' ? 13 : 11, font = /^h/.test(b.k) ? 'F2' : 'F1';
    if (/^h/.test(b.k)) y -= 6;
    if (b.k === 'table') { for (const r of [b.head || [], ...(b.rows || [])]) if (r.length) put(r.join('  |  '), 10, 'F1'); y -= 4; continue; }
    if (b.k === 'hr') { y -= 8; continue; }
    const pre = b.k === 'li' ? (b.mark && /\d/.test(b.mark) ? b.mark + ' ' : '- ') : '';
    wrap(pre + (b.text || ''), size, W - 2 * M - (b.k === 'li' ? 14 : 0)).forEach((l) => put(l, size, font as 'F1' | 'F2', b.k === 'li' ? M + 14 : M));
    y -= 4;
  }
  const objs: string[] = [];
  const add = (s: string) => { objs.push(s); return objs.length; };
  const catalog = add(''), pagesId = add(''), f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const kids: number[] = [];
  for (const p of pages) {
    const stream = p.join('\n'), content = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info << /Title (${esc(title)}) /Producer (Paradigm) >> >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
