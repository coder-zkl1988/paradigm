// Text shown to people is written in English in the code. The web app plugs in
// a translator; the server keeps the default, which returns the text as is.

let translate: (text: string) => string = (t) => t;

export function setTranslator(fn: (text: string) => string): void {
  translate = fn;
}

export function tr(text: string): string {
  return translate(text);
}

/** Translates a template, then fills {0}, {1}… */
export function fmt(text: string, ...args: unknown[]): string {
  return tr(text).replace(/\{(\d)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}
