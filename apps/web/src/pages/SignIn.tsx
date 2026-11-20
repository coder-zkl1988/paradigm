// Sign in, create an account, email link, password reset and "Skip for now".
// The look and the robot come from the draft; the actions are real.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignInView } from '../views/SignInView';
import { auth, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import T from '../i18n/signin.json';

type Mode = 'in' | 'up';

export function SignIn() {
  const nav = useNavigate(), [params, setParams] = useSearchParams();
  const { lang, flipLang, signedIn } = useSession();
  const [s, setS] = useState({ mode: 'in' as Mode, name: '', email: '', pw: '', show: false, tried: false, sent: false, focus: null as null | string, look: { x: 0, y: 0 }, shake: 0, busy: false, server: '' });
  const set = (p: Partial<typeof s>) => setS((o) => ({ ...o, ...p }));
  const botEl = useRef<HTMLElement | null>(null);
  const reset = params.get('reset');
  const t = (T as any).T[lang] as Record<string, string>;

  const done = (r: { token: string; user: any }) => {
    signedIn(r.token, r.user);
    const back = params.get('next');
    nav(back && back.startsWith('/') ? back : '/', { replace: true });
  };
  const fail = (e: unknown) => set({ busy: false, tried: true, server: e instanceof ApiError ? e.message : 'Something went wrong. Try again.', shake: s.shake + 1 });

  // Arriving from an email link, or back from single sign-on.
  useEffect(() => {
    const link = params.get('link'), sso = params.get('sso'), ssoError = params.get('sso_error');
    if (!link && !sso && !ssoError) return;
    const next = params.get('next');
    setParams(next ? { next } : {}, { replace: true });
    if (link) auth.verify(link).then(done, fail);
    else if (sso) auth.ssoFinish(sso).then(done, fail);
    else set({ tried: true, server: ssoError || '', shake: 1 });
  }, []);

  const up = s.mode === 'up';
  const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email), okPw = s.pw.length >= 8, okName = !up || s.name.trim().length > 0;
  const ready = okEmail && okPw && okName;
  const error = s.server || (!okName ? t.errName : !okEmail ? t.errEmail : !okPw ? t.errPw : '');
  const tab = (on: boolean) => 'height: 38px; justify-content: center; font-size: 14px; border-radius: 10px;' + (on ? ' background: #FFFFFF; box-shadow: 0 1px 3px rgba(20,20,30,0.14);' : '');
  const field = (k: 'name' | 'email' | 'pw') => (e: { target: { value: string } }) => set({ [k]: e.target.value, sent: false, shake: 0, server: '' } as Partial<typeof s>);
  let lx = s.look.x, ly = s.look.y;
  const f = s.focus;
  if (f === 'email' || f === 'name') { lx = Math.max(-1, Math.min(1, (f === 'email' ? s.email : s.name).length / 12 - 1)); ly = 1; }
  else if (f === 'pw') { lx = 0; ly = 0.7; }
  const OL = 'M37 50h.01', OR = 'M63 50h.01', SL = 'M30.5 50Q37 55.5 43.5 50', SR = 'M56.5 50Q63 55.5 69.5 50', HL = 'M30.5 52.5Q37 43.5 43.5 52.5', HR = 'M56.5 52.5Q63 43.5 69.5 52.5';
  const hide = f === 'pw' && !s.show, peek = f === 'pw' && s.show, happy = ready && !f && !s.shake;
  const eyeL = hide || peek ? SL : happy ? HL : OL, eyeR = hide ? SR : happy ? HR : OR;
  const fo = (k: string) => () => set({ focus: k });

  const submit = async () => {
    if (!ready) { set({ tried: true, shake: s.shake + 1 }); return; }
    set({ busy: true, server: '' });
    try {
      if (reset) done(await auth.reset(reset, s.pw));
      else done(up ? await auth.signup(s.name.trim(), s.email.trim(), s.pw) : await auth.signin(s.email.trim(), s.pw));
    } catch (e) { fail(e); }
  };
  const sendLink = async (purpose: 'signin' | 'reset') => {
    if (!okEmail) { set({ tried: true, sent: false, shake: s.shake + 1 }); return; }
    try {
      const r = await auth.link(s.email.trim(), purpose);
      if (r.devLink) console.info('Development email link:', r.devLink);
      set({ sent: true, tried: false, server: '' });
    } catch (e) { fail(e); }
  };

  const v = {
    t: { ...t, ...(reset ? { titleIn: lang === 'zh' ? '设置新密码' : 'Choose a new password', goIn: lang === 'zh' ? '保存并登录' : 'Save and sign in' } : {}) },
    langShort: lang === 'zh' ? '中' : 'EN',
    flipLang,
    botRef: (el: HTMLElement | null) => { if (el) botEl.current = el; },
    bot: {
      wrap: 'position: absolute; left: 50%; top: -44px; width: 88px; height: 88px; margin-left: -44px; border-radius: 50%; filter: drop-shadow(0 4px 5px rgba(0,0,0,0.22)); animation: ' + (s.shake ? 'si-shake' + (s.shake % 2 ? 'A' : 'B') + ' 0.45s ease' : 'si-float 3.2s ease-in-out infinite') + ';',
      eyesOuter: 'transition: transform 160ms ease-out; transform: translate(' + lx * 4.4 + 'px, ' + ly * 5.2 + 'px);',
      eyesInner: 'transform-box: fill-box; transform-origin: center;' + (eyeL === OL && eyeR === OR ? ' animation: si-blink 4.6s infinite;' : ''),
      eyeL, eyeR, wL: eyeL === OL ? 10.5 : 4.6, wR: eyeR === OR ? 10.5 : 4.6,
      glL: 'opacity: ' + (eyeL === OL ? 1 : 0) + ';', glR: 'opacity: ' + (eyeR === OR ? 1 : 0) + ';',
    },
    onMove: (e: { clientX: number; clientY: number }) => {
      if (s.focus || !botEl.current) return;
      const r = botEl.current.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 200), x = Math.round((dx / d) * m * 4) / 4, y = Math.round((dy / d) * m * 4) / 4;
      if (x !== s.look.x || y !== s.look.y) set({ look: { x, y } });
    },
    focusName: fo('name'), focusEmail: fo('email'), focusPw: fo('pw'),
    blur: () => set({ focus: null }),
    keepFocus: (e: { preventDefault(): void }) => e.preventDefault(),
    pwHidden: !s.show, pwShown: s.show, showPressed: s.show ? 'true' : 'false',
    switchText: up ? t.toIn : t.toUp, switchAction: up ? t.toInAct : t.toUpAct,
    toggleMode: () => set({ mode: up ? 'in' : 'up', tried: false, shake: 0, server: '' }),
    title: up ? t.titleUp : reset ? v_title() : t.titleIn, sub: up ? t.subUp : t.subIn, go: s.busy ? '…' : up ? t.goUp : reset ? v_go() : t.goIn,
    isUp: up && !reset, isIn: !up,
    name: s.name, email: s.email, pw: s.pw, onName: field('name'), onEmail: field('email'), onPw: field('pw'),
    pwType: s.show ? 'text' : 'password', showLabel: s.show ? t.hidePw : t.showPw,
    toggleShow: () => set({ show: !s.show }),
    // The draft turns the button into a link once the form is valid; here the form always submits.
    ready: false, notReady: true, hasError: s.tried && !!error, error,
    onSubmit: (e: { preventDefault(): void }) => { e.preventDefault(); void submit(); },
    sendLink: () => void sendLink('signin'),
    sent: s.sent && okEmail, sentMsg: t.sent.replace('{0}', s.email),
    primary: 'height: 48px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; background: #2457C5; color: #FFFFFF; font-size: 15px; font-weight: 500;' + (s.busy ? ' opacity: 0.7;' : ''),
    secondary: 'height: 46px; width: 100%; box-sizing: border-box; padding: 0 10px; display: flex; align-items: center; justify-content: center; gap: 8px; text-align: center; border-radius: 12px; background: #FFFFFF; border: 1px solid #DCDDE2; color: #111114; font-size: 14px;',
    links: { Workspace: '/', Main: '/board/new' },
    follow: (e: { preventDefault(): void; currentTarget: HTMLAnchorElement }) => {
      e.preventDefault();
      const href = e.currentTarget.getAttribute('href');
      if (href === '/') auth.sso(params.get('next') || undefined).then((r) => { window.location.assign(r.url); }, fail); // the SSO button
      else auth.guest().then((r) => { signedIn(r.token, r.user); nav('/board/new', { replace: true }); }, fail); // Skip for now
    },
  };
  function v_title() { return lang === 'zh' ? '设置新密码' : 'Choose a new password'; }
  function v_go() { return lang === 'zh' ? '保存并登录' : 'Save and sign in'; }

  return (
    <div onClickCapture={(e) => {
      const a = (e.target as HTMLElement).closest('a[href="#si-email"]');
      if (a) { e.preventDefault(); void sendLink('reset'); }
    }}>
      <SignInView v={v} />
    </div>
  );
}
