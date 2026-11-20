// Two languages, as in the draft. Shared code translates through setTranslator();
// the pages read their own label tables.

import { setTranslator, fmt as sharedFmt } from '@paradigm/shared';
import zh from '../i18n/zh.json';
import keys from '../i18n/ui-keys.json';

export type Lang = 'en' | 'zh';
let lang: Lang = (localStorage.getItem('paradigm.lang') as Lang) || (navigator.language.startsWith('zh') ? 'zh' : 'en');
const ZH = zh as Record<string, string>;

export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem('paradigm.lang', l); } catch { /* private mode */ }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
}

/** English text in, the current language out. Unknown text stays English. */
export function tr(s: string): string { return lang === 'zh' && ZH[s] ? ZH[s] : s; }
export const fmt = (s: string, ...a: unknown[]) => sharedFmt(s, ...a);

/** The draft's i.kNN labels. */
export const labels = () => (keys as { en: Record<string, string>; zh: Record<string, string> })[lang];

/** Translates every string in a view object, the way the draft's trOut() does. */
export function trOut<T>(o: T): T {
  if (lang !== 'zh') return o;
  const walk = (x: any, key?: string): any => {
    if (typeof x === 'string') return key && /style|Style|css|d$|^d$|path|href|src|id$|Id$/.test(key) ? x : tr(x);
    if (Array.isArray(x)) return x.map((y) => walk(y, key));
    if (x && typeof x === 'object' && !x.$$typeof && Object.getPrototypeOf(x) === Object.prototype) {
      if (x._raw || x._v) return x;
      const o2: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(x)) o2[k] = walk(v, k);
      return o2;
    }
    return x;
  };
  return walk(o);
}

setTranslator((s: string) => tr(s));
setLang(lang);
