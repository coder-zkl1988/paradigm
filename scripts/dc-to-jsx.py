#!/usr/bin/env python3
"""Converts the markup of a design-draft page (.dc.html) to a React component.

The draft's markup uses {{name}} bindings, <sc-if value> and <sc-for list as>.
Here each binding becomes a read from the view object `v` (or from a loop
variable), sc-if becomes a condition, sc-for becomes a map, inline style text
goes through css(), and attribute names get their React spelling. The logic
that fills `v` is written by hand in the app; this script only carries the
markup across so the page looks the same.

Usage: dc-to-jsx.py draft.dc.html ComponentName out.tsx
"""
import re, sys
from html.parser import HTMLParser

VOID = {'input', 'img', 'br', 'hr', 'meta', 'link'}
ATTR = {
    'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'autofocus': 'autoFocus', 'autocomplete': 'autoComplete',
    'viewbox': 'viewBox', 'preserveaspectratio': 'preserveAspectRatio', 'readonly': 'readOnly', 'maxlength': 'maxLength',
    'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'stroke-dasharray': 'strokeDasharray',
    'stroke-miterlimit': 'strokeMiterlimit', 'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'vector-effect': 'vectorEffect', 'stop-color': 'stopColor',
    'spellcheck': 'spellCheck', 'contenteditable': 'contentEditable', 'srcset': 'srcSet', 'crossorigin': 'crossOrigin',
}
EVENTS = ['Click', 'DoubleClick', 'ContextMenu', 'PointerDown', 'PointerMove', 'PointerUp', 'PointerLeave', 'PointerCancel', 'PointerEnter', 'Wheel',
          'KeyDown', 'KeyUp', 'Change', 'Input', 'Submit', 'Focus', 'Blur', 'Scroll', 'MouseDown', 'DragStart', 'Drop', 'DragOver', 'Paste']
for e in EVENTS: ATTR['on' + e.lower()] = 'on' + e
TAGS = {'lineargradient': 'linearGradient', 'radialgradient': 'radialGradient', 'clippath': 'clipPath', 'foreignobject': 'foreignObject'}
BIND = re.compile(r'\{\{\s*(.*?)\s*\}\}')
# The sign-in buttons' logos: Google's "G" and GitHub's mark, as uploaded to the design canvas.
BLOBS = {
    '/_blob/d95bdcb6396c683fe4ed9a4703d7e6ab': '/brand/google.svg',
    '/_blob/1eeced5ec4c7507f6d0636b610ce7b16': '/brand/github.svg',
}

class Node:
    def __init__(self, tag, attrs): self.tag, self.attrs, self.kids = tag, attrs, []

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = Node('#root', []); self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        n = Node(TAGS.get(tag, tag), attrs); self.stack[-1].kids.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        self.stack[-1].kids.append(Node(TAGS.get(tag, tag), attrs))
    def handle_endtag(self, tag):
        tag = TAGS.get(tag, tag)
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag: del self.stack[i:]; return
    def handle_data(self, d): self.stack[-1].kids.append(d)
    def handle_entityref(self, name): self.stack[-1].kids.append('&' + name + ';')
    def handle_charref(self, name): self.stack[-1].kids.append('&#' + name + ';')

def ref(expr, scope):
    e = expr.strip()
    if e in ('true', 'false', 'null') or re.fullmatch(r'-?\d+(\.\d+)?', e) or re.fullmatch(r"'[^']*'", e): return e
    parts = e.split('.')
    head = parts[0] if parts[0] in scope else 'v.' + parts[0]
    return head + ''.join('?.' + p for p in parts[1:]) if parts[1:] else head

def attr_value(name, val, scope):
    if val is None: return '{true}'
    m = BIND.fullmatch(val.strip())
    if name == 'style':
        if m: return '{css(' + ref(m.group(1), scope) + ')}'
        if BIND.search(val):
            tpl = BIND.sub(lambda x: '${' + ref(x.group(1), scope) + '}', val.replace('`', '\\`'))
            return '{css(`' + tpl + '`)}'
        return '{css(' + repr_js(val) + ')}'
    if m: return '{' + ref(m.group(1), scope) + '}'
    if BIND.search(val):
        tpl = BIND.sub(lambda x: '${' + ref(x.group(1), scope) + '}', val.replace('`', '\\`'))
        return '{`' + tpl + '`}'
    if name in ('tabIndex', 'rows', 'cols', 'colSpan', 'rowSpan') and re.fullmatch(r'-?\d+', val): return '{' + val + '}'
    return repr_js(val)

def repr_js(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ') + '"'

def text(t, scope):
    out, last = [], 0
    for m in BIND.finditer(t):
        out.append(esc_text(t[last:m.start()])); out.append('{' + ref(m.group(1), scope) + '}'); last = m.end()
    out.append(esc_text(t[last:]))
    return ''.join(out)

def esc_text(s):
    return s.replace('{', "{'{'}").replace('}', "{'}'}").replace('>', '&gt;')

def emit(n, scope, ind, idx):
    pad = '  ' * ind
    if isinstance(n, str):
        if not n.strip(): return ''
        return pad + text(n.strip() if '\n' in n else n, scope) + '\n'
    a = dict(n.attrs)
    if n.tag == 'sc-if':
        cond = ref(BIND.fullmatch(a['value'].strip()).group(1), scope)
        inner = kids(n, scope, ind + 1)
        return f'{pad}{{{cond} ? (<>\n{inner}{pad}</>) : null}}\n'
    if n.tag == 'sc-for':
        lst = ref(BIND.fullmatch(a['list'].strip()).group(1), scope)
        var = a.get('as', 'x'); i = f'i{len(scope)}'
        inner = kids(n, scope | {var, i}, ind + 2)
        return f'{pad}{{({lst} || []).map(({var}: any, {i}: number) => (\n{pad}  <Fragment key={{{i}}}>\n{inner}{pad}  </Fragment>\n{pad}))}}\n'
    if n.tag == 'dc-import':
        return f'{pad}{{v.embed}}\n'
    if n.tag in ('helmet', 'x-dc', 'script'): return kids(n, scope, ind)
    attrs = []
    loops = [x for x in scope if not re.fullmatch(r'i\d+', x)]
    for k, val in n.attrs:
        if k.startswith('hint-'): continue
        name = ATTR.get(k, k)
        if name == 'href' and val and val.endswith('.dc.html'):
            page = val[:-8]
            own = sorted(loops)[0] if loops and n.tag == 'a' and page == 'Main' else None
            attrs.append('href={' + (f'{own}?.href || ' if own else '') + f'v.links?.{page}' + '}')
            if not any(kk.lower() == 'onclick' for kk, _ in n.attrs): attrs.append('onClick={v.follow}')
            continue
        attrs.append(f'{name}={attr_value(name, val, scope)}')
    open_ = '<' + n.tag + (' ' + ' '.join(attrs) if attrs else '')
    if n.tag in VOID or not n.kids: return f'{pad}{open_} />\n'
    if n.tag in ('textarea',):
        return f'{pad}{open_} />\n'
    inner = kids(n, scope, ind + 1)
    if not inner.strip(): return f'{pad}{open_} />\n'
    return f'{pad}{open_}>\n{inner}{pad}</{n.tag}>\n'

def kids(n, scope, ind):
    return ''.join(emit(k, scope, ind, i) for i, k in enumerate(n.kids))

def main():
    src, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
    s = open(src).read()
    body = s[s.index('</helmet>') + 9: s.index('<script type="text/x-dc"')]
    body = body.replace('</x-dc>', '')
    # Live editing: a sticky note names who wrote it, where the draft always said "You".
    you = '<span style="position: absolute; left: 18px; bottom: 12px; font-size: 12px; color: rgba(0,0,0,0.6); pointer-events: none">{{i.k60}}</span>'
    if name == 'BoardView':
        assert body.count(you) == 1, 'sticky author label moved in the draft'
        body = body.replace(you, you.replace('{{i.k60}}', '{{it.byLabel}}'))
        # Backend interfaces: the draft only had "Simulated"; a real service gets a green tag.
        tag = '<span style="flex: 0 0 auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; background: #FFE9C7; color: #7A4100">{{ar.state}}</span>'
        assert body.count(tag) == 1, 'backend status tag moved in the draft'
        body = body.replace(tag, '<span style="{{ar.stateStyle}}">{{ar.state}}</span>')
    # Images uploaded to the design canvas live at /_blob/<id> there; the app serves its own copies.
    for blob, path in BLOBS.items(): body = body.replace(blob, path)
    assert '/_blob/' not in body, 'an image in the draft has no copy in apps/web/public (add it to BLOBS)'
    p = P(); p.feed(body)
    jsx = kids(p.root, frozenset(), 2)
    open(out, 'w').write(f'''// Generated from design/{src.split('/')[-1]} by scripts/dc-to-jsx.py. Do not edit by hand:
// change the draft or the view model that fills `v`, then run the script again.
/* eslint-disable */
import {{ Fragment }} from 'react';
import {{ css }} from '../lib/css';

export function {name}({{ v }}: {{ v: any }}) {{
  return (
    <>
{jsx}    </>
  );
}}
''')

main()
