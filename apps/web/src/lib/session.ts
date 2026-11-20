import { create } from 'zustand';
import { auth, session, type Me } from './api';
import { getLang, setLang, type Lang } from './i18n';

interface SessionState {
  me: Me | null;
  ready: boolean;
  lang: Lang;
  load(): Promise<void>;
  signedIn(token: string, me: Me): void;
  signOut(): Promise<void>;
  flipLang(): void;
  setLang(l: Lang): void;
}

export const useSession = create<SessionState>((set, get) => ({
  me: null, ready: false, lang: getLang(),
  async load() {
    if (!session.token) { set({ ready: true }); return; }
    try { const { user } = await auth.me(); set({ me: user, ready: true }); }
    catch { session.set(null); set({ me: null, ready: true }); }
  },
  signedIn(token, me) { session.set(token); set({ me }); },
  async signOut() { await auth.signout(); session.set(null); set({ me: null }); },
  flipLang() { get().setLang(get().lang === 'zh' ? 'en' : 'zh'); },
  setLang(l) {
    setLang(l); set({ lang: l });
    if (get().me) void auth.update({ lang: l }).catch(() => null);
  },
}));
