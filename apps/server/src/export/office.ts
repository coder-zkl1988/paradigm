// Doc, Sheet and Slides nodes download as Word, Excel and PowerPoint files.
// The content is what the node shows (blocks, a table, slides), not HTML.

import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import type { Block, ExportRequest, Slide } from '@paradigm/shared';

const FONT = 'Inter';

function docxTable(head: string[] | undefined, rows: string[][]): Table {
  const cell = (t: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold, font: FONT })] })] });
  const all = [...(head?.length ? [new TableRow({ tableHeader: true, children: head.map((h) => cell(h, true)) })] : []), ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) }))];
  return new Table({ rows: all.length ? all : [new TableRow({ children: [cell('')] })], width: { size: 100, type: WidthType.PERCENTAGE } });
}

function docxBlock(b: Block): (Paragraph | Table)[] {
  const run = (t: string, o: Record<string, unknown> = {}) => new TextRun({ text: t, font: FONT, ...o });
  switch (b.k) {
    case 'h1': return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(b.text)] })];
    case 'h2': return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(b.text)] })];
    case 'h3': return [new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(b.text)] })];
    case 'li': return [b.mark && /\d/.test(b.mark) ? new Paragraph({ indent: { left: 360 }, children: [run(b.mark + ' ' + b.text)] }) : new Paragraph({ bullet: { level: 0 }, children: [run(b.text)] })];
    case 'quote': return [new Paragraph({ indent: { left: 540 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'C9CAD0', space: 8 } }, children: [run(b.text, { italics: true })] })];
    case 'code': return b.text.split('\n').map((l) => new Paragraph({ children: [new TextRun({ text: l || ' ', font: 'JetBrains Mono', size: 18 })] }));
    case 'hr': return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9CAD0', space: 1 } }, children: [] })];
    case 'table': return [docxTable(b.head, b.rows || []), new Paragraph({ children: [] })];
    case 'button': case 'link': return [new Paragraph({ children: [run(b.text, { bold: true, color: '2457C5' })] })];
    case 'img': return b.text ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`[Picture: ${b.text}]`, { italics: true, color: '6B6C73' })] })] : [];
    case 'nav': return [new Paragraph({ children: [run((b.items || []).join('  ·  ') || b.text, { color: '6B6C73' })] })];
    case 'field': return [new Paragraph({ children: [run(`${b.text}: ______________________`)] })];
    case 'swatch': return [new Paragraph({ children: [run((b.items || []).join('  ') || b.text)] })];
    default: return b.text ? [new Paragraph({ children: [run(b.text)] })] : [];
  }
}

export async function toDocx(title: string, blocks: Block[]): Promise<Buffer> {
  const children = blocks.flatMap(docxBlock);
  if (!blocks.length || blocks[0].k !== 'h1') children.unshift(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, font: FONT })] }));
  const doc = new Document({ creator: 'Paradigm', title, styles: { default: { document: { run: { font: FONT, size: 22 } } } }, sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function toXlsx(title: string, head: string[], rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Paradigm';
  const ws = wb.addWorksheet(title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet 1');
  const num = (s: string) => (/^-?\d+(\.\d+)?$/.test(s.trim()) ? Number(s) : s);
  if (head.length) { const r = ws.addRow(head); r.font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }]; }
  for (const row of rows) ws.addRow(row.map(num));
  ws.columns.forEach((c, i) => { const w = Math.max(head[i]?.length || 0, ...rows.map((r) => String(r[i] ?? '').length)); c.width = Math.min(60, Math.max(8, w + 2)); });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function toPptx(title: string, slides: Slide[]): Promise<Buffer> {
  const P = (PptxGenJS as any).default || PptxGenJS;
  const pptx = new P();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = title;
  const list = slides.length ? slides : [{ title, items: [] }];
  list.forEach((sl, i) => {
    const s = pptx.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addText(sl.title || title, { x: 0.6, y: i === 0 && !sl.items.length ? 2.8 : 0.45, w: 12.1, h: 0.9, fontSize: i === 0 && !sl.items.length ? 40 : 30, fontFace: 'Space Grotesk', color: '111114' });
    const table = sl.items.find((b) => b.k === 'table');
    const text = sl.items.filter((b) => b.k !== 'table' && b.k !== 'hr' && b.text);
    if (text.length) {
      s.addText(text.map((b) => ({ text: b.text, options: { bullet: b.k === 'li' ? (b.mark && /\d/.test(b.mark) ? { type: 'number' } : true) : false, fontFace: b.k === 'code' ? 'JetBrains Mono' : FONT, bold: b.k === 'h2' || b.k === 'h3', breakLine: true } })),
        { x: 0.7, y: 1.5, w: table ? 5.8 : 11.9, h: 5.4, fontSize: 18, color: '3A3B40', valign: 'top' });
    }
    if (table) {
      const rows = [...(table.head?.length ? [table.head.map((h) => ({ text: h, options: { bold: true, fill: { color: 'F0F1F4' } } }))] : []), ...(table.rows || []).slice(0, 14).map((r) => r.map((c) => ({ text: c })))];
      if (rows.length) s.addTable(rows, { x: text.length ? 6.8 : 0.7, y: 1.5, w: text.length ? 5.8 : 11.9, fontSize: 12, fontFace: FONT, border: { type: 'solid', color: 'DCDDE2', pt: 0.75 } });
    }
  });
  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
}

export async function exportFile(r: ExportRequest): Promise<{ data: Buffer; mime: string; ext: string }> {
  const title = (r.title || 'Untitled').slice(0, 120), c = r.content || ({} as ExportRequest['content']);
  if (r.format === 'docx') return { data: await toDocx(title, c.blocks || []), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
  if (r.format === 'xlsx') return { data: await toXlsx(title, c.head || [], c.rows || []), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
  return { data: await toPptx(title, c.slides || []), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' };
}
