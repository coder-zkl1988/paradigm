// The workspace home: boards, shared with me, templates, trash, members and
// invites. Layout and words come from the draft; the data is the server's.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NODE_STICKERS, TEMPLATES, TEMPLATE_INFO, layerDefaults } from '@paradigm/shared';
import type { Workspace as WS } from '@paradigm/shared';
import { WorkspaceView } from '../views/WorkspaceView';
import { boards as B, workspaces as W, ApiError, type Member, type Invite, type Summary } from '../lib/api';
import { useSession } from '../lib/session';
import { ago } from '../lib/time';
import { tr } from '../lib/i18n';
import D from '../i18n/workspace.json';

type View = 'boards' | 'shared' | 'templates' | 'trash';
const ICON = (D as any).ICON as Record<string, string>;
const STK = (k: string) => (NODE_STICKERS[k] || NODE_STICKERS.llm).map((l) => ({ ...layerDefaults, ...l }));
const GALLERY = Object.keys(TEMPLATES).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

export function Workspace() {
  const nav = useNavigate(), [params] = useSearchParams();
  const { me, lang, flipLang, signOut } = useSession();
  const t: Record<string, string> = { ...((D as any).T[lang] as Record<string, string>), sample: '' };
  const [s, setS] = useState({ view: 'boards' as View, ws: 0, wsOpen: false, query: '', inviteOpen: false, inviteEmail: '', inviteRole: 'editor', inviteTried: false, tcat: 'all', inviteSent: null as null | { email: string; role: string }[], inviteError: '' });
  const set = (p: Partial<typeof s>) => setS((o) => ({ ...o, ...p }));
  const [list, setList] = useState<WS[]>([]);
  const [items, setItems] = useState<Summary[]>([]);
  const [people, setPeople] = useState<{ members: Member[]; invites: Invite[] }>({ members: [], invites: [] });
  const [flash, setFlash] = useState('');
  const ws = list[s.ws];

  useEffect(() => {
    W.list().then((r) => {
      setList(r.workspaces);
      const want = params.get('ws'), at = want ? r.workspaces.findIndex((w) => w.id === want) : -1;
      if (at >= 0) set({ ws: at });
    }).catch((e) => setFlash(e.message));
  }, []);
  const loadBoards = useCallback(() => {
    if (!ws) return;
    const q = s.query.trim();
    const p = s.view === 'shared' ? B.shared(q) : s.view === 'trash' ? B.list(ws.id, 'trash', q) : s.view === 'boards' ? B.list(ws.id, 'boards', q) : Promise.resolve({ boards: [] as Summary[] });
    p.then((r) => setItems(r.boards)).catch((e) => setFlash(e.message));
  }, [ws?.id, s.view, s.query]);
  useEffect(() => { const h = setTimeout(loadBoards, s.query ? 200 : 0); return () => clearTimeout(h); }, [loadBoards]);
  const loadPeople = useCallback(() => { if (ws) W.members(ws.id).then(setPeople).catch(() => null); }, [ws?.id]);
  useEffect(loadPeople, [loadPeople]);
  useEffect(() => { if (!flash) return; const h = setTimeout(() => setFlash(''), 3200); return () => clearTimeout(h); }, [flash]);

  const open = async (template: string | null) => {
    if (!ws) return;
    try {
      const target = ws.role === 'viewer' ? list.find((w) => w.personal) || ws : ws;
      const r = await B.create(target.id, { template });
      nav(`/b/${r.board.id}`);
    } catch (e) { setFlash((e as Error).message); }
  };

  const q = s.query.trim().toLowerCase();
  const hit = (...a: string[]) => !q || a.some((x) => x.toLowerCase().includes(q));
  const v = s.view;
  if (me) t.you = me.name;
  const meta = (b: Summary) => v === 'trash' ? `${lang === 'zh' ? '删除于' : 'Deleted'} ${ago(b.trashedAt || b.updatedAt)}`
    : v === 'shared' ? `${lang === 'zh' ? '由' : 'Shared by'} ${b.sharedBy}${lang === 'zh' ? ' 共享' : ''} · ${b.role === 'viewer' ? (lang === 'zh' ? '仅查看' : 'view only') : (lang === 'zh' ? '可编辑' : 'can edit')}`
    : `${b.createdAt === b.updatedAt ? (lang === 'zh' ? '创建于' : 'Created') : (lang === 'zh' ? '编辑于' : 'Edited')} ${ago(b.updatedAt)} · ${b.nodes ? `${b.nodes} ${lang === 'zh' ? '个节点' : b.nodes === 1 ? 'node' : 'nodes'}` : (lang === 'zh' ? '空白' : 'empty')}`;
  const cards = items.map((b) => ({ name: b.title, meta: meta(b), tint: b.tint, trash: v === 'trash', href: v === 'trash' ? undefined : `/b/${b.id}`,
    restore: () => B.restore(b.id).then(loadBoards, (e) => setFlash(e.message)) }));
  const tpl = { code: hit(t.tCode, t.forCode), ux: hit(t.tUx, t.forUx), visual: hit(t.tVisual, t.forVisual) };
  const showBoards = v !== 'templates' && cards.length > 0, showTemplates = v === 'boards' && (tpl.code || tpl.ux || tpl.visual);
  const TINT: Record<string, string> = { eng: '#EEF4FF', uxc: '#F3EFFD', vis: '#FFF4E2' }, TAGC: Record<string, [string, string]> = { eng: ['#DDEBFF', '#1D4FA8'], uxc: ['#E9E3FB', '#5B3FB8'], vis: ['#FFE9C7', '#7A4100'] };
  const gallery = GALLERY.map((k) => {
    const info = TEMPLATE_INFO[k], name = lang === 'zh' ? info.zhName : TEMPLATES[k].name, steps = lang === 'zh' ? info.zhSteps : info.steps;
    return { k, g: info.group, name, steps, chain: TEMPLATES[k].n.map((n) => n[1]) };
  }).filter((g) => (s.tcat === 'all' || s.tcat === g.g) && hit(g.name, g.steps, t[g.g]))
    .map((g) => ({
      name: g.name, steps: g.steps, tag: t[g.g], count: t.steps.replace('{0}', String(g.chain.length)),
      chain: g.chain.map((k, n) => ({ arrow: n > 0, layers: STK(k) })), open: () => void open(g.k),
      preview: 'display: flex; align-items: center; justify-content: center; gap: 5px; height: 104px; padding: 0 12px; background-color: ' + TINT[g.g] + '; background-image: radial-gradient(circle at 1px 1px, rgba(20,20,30,0.10) 1px, transparent 1.5px); background-size: 14px 14px;',
      tagStyle: 'padding: 3px 9px; border-radius: 999px; font-size: 12px; background: ' + TAGC[g.g][0] + '; color: ' + TAGC[g.g][1] + ';',
    }));
  const showGallery = v === 'templates' && gallery.length > 0;
  let emptyTitle = '', emptySub = '';
  if (!showBoards && !showTemplates && !showGallery) {
    if (q || v === 'templates') { emptyTitle = t.noMatch; emptySub = t.noMatchSub; }
    else if (v === 'shared') { emptyTitle = t.sharedEmpty; emptySub = t.sharedSub; }
    else if (v === 'trash') { emptyTitle = t.trashEmpty; emptySub = t.trashSub; }
  }
  const emails = s.inviteEmail.split(/[\s,;]+/).filter(Boolean), badList = emails.filter((m) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m));
  const okInvite = emails.length > 0 && badList.length === 0;
  const dot = (bg: string, fg: string) => 'flex: 0 0 auto; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ' + bg + '; color: ' + fg + ';';
  const DOTS: [string, string][] = [['#DDEBFF', '#1D4FA8'], ['#E9E3FB', '#5B3FB8'], ['#DDF3E4', '#1F6B3A'], ['#FFE9C7', '#7A4100']];
  const wsLabel = (w: WS) => (w.personal ? t.personal : w.name);

  const vals = {
    t, langShort: lang === 'zh' ? '中' : 'EN', flipLang,
    openCode: () => void open('Code flow'), openUx: () => void open('UI flow'), openVisual: () => void open('Visual flow'),
    showHome: true, showBoard: false,
    wsName: ws ? wsLabel(ws) : '', wsOpen: s.wsOpen, wsExpanded: s.wsOpen ? 'true' : 'false',
    toggleWs: () => set({ wsOpen: !s.wsOpen }),
    wsList: list.map((w, i) => ({ name: wsLabel(w), checked: s.ws === i ? 'true' : 'false', pick: () => set({ ws: i, wsOpen: false }), style: 'height: 40px; padding: 0 10px; font-size: 14px;' + (s.ws === i ? ' background: #E7EEFB; color: #1A46A8;' : '') })),
    follow: (e: { preventDefault(): void; currentTarget: HTMLAnchorElement }) => {
      e.preventDefault();
      const href = e.currentTarget.getAttribute('href') || '';
      if (href === '/signin') void signOut().then(() => nav('/signin'));
      else if (href === '/board/new') void open(null);
      else nav(href);
    },
    links: { SignIn: '/signin', Main: '/board/new' },
    viewTitle: t[v], query: s.query, onQuery: (e: { target: { value: string } }) => set({ query: e.target.value }),
    showGallery, gallery,
    cats: ['all', 'eng', 'uxc', 'vis'].map((k) => { const on = s.tcat === k; return { label: t[k], pressed: on ? 'true' : 'false', pick: () => set({ tcat: k }), style: 'height: 40px; padding: 0 14px; font-size: 14px; border-radius: 999px; border: 1px solid ' + (on ? '#111114' : '#DCDDE2') + ';' + (on ? ' background: #111114; color: #FFFFFF;' : ' background: #FFFFFF;') }; }),
    showBoards, boards: cards, listTitle: v === 'shared' ? t.sharedWith : v === 'trash' ? t.inTrash : t.yourBoards, showTemplates, tpl,
    hasEmpty: !!emptyTitle, emptyTitle, emptySub,
    inviteOpen: s.inviteOpen, inviteExpanded: s.inviteOpen ? 'true' : 'false',
    inviteTitle: t.inviteTitle.replace('{0}', ws ? wsLabel(ws) : ''),
    inviteForm: !s.inviteSent, inviteDone: !!s.inviteSent,
    toggleInvite: () => set({ inviteOpen: true, inviteTried: false, inviteSent: null, inviteEmail: '', inviteError: '' }),
    closeInvite: () => set({ inviteOpen: false, inviteSent: null, inviteTried: false }),
    inviteMore: () => set({ inviteSent: null, inviteEmail: '', inviteTried: false }),
    stopEv: (e: { stopPropagation(): void }) => e.stopPropagation(),
    inviteEmail: s.inviteEmail, inviteRole: s.inviteRole,
    inviteError: s.inviteTried && (!okInvite || !!s.inviteError), inviteOk: !(s.inviteTried && (!okInvite || !!s.inviteError)),
    inviteErrorText: s.inviteError || (badList.length ? t.badEmails.replace('{0}', badList.join(', ')) : t.badEmail),
    sendLabel: emails.length > 1 ? t.sendInvites.replace('{0}', String(emails.length)) : t.sendInvite,
    onInviteEmail: (e: { target: { value: string } }) => set({ inviteEmail: e.target.value, inviteTried: false, inviteError: '' }),
    roles: ([['editor', t.editorDesc], ['viewer', t.viewerDesc]] as const).map(([r, desc]) => {
      const on = s.inviteRole === r;
      return { label: t[r], desc, checked: on ? 'true' : 'false', pick: () => set({ inviteRole: r }), style: 'flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; text-align: left; border-radius: 14px; border: 1.5px solid ' + (on ? '#2457C5' : '#DCDDE2') + ';' + (on ? ' background: #EEF3FD;' : '') };
    }),
    sendInvite: async (e: { preventDefault(): void }) => {
      e.preventDefault();
      if (!okInvite || !ws) { set({ inviteTried: true }); return; }
      try {
        const r = await W.invite(ws.id, emails, s.inviteRole);
        for (const x of r.sent) if (x.devLink) console.info('Development invite link for', x.email, x.devLink);
        set({ inviteSent: r.sent.map((x) => ({ email: x.email, role: x.role })), inviteEmail: '', inviteTried: false });
        loadPeople();
      } catch (err) { set({ inviteTried: true, inviteError: err instanceof ApiError ? err.message : 'The invites were not sent' }); }
    },
    sentSub: t.sentSub.replace('{0}', ws ? wsLabel(ws) : ''),
    sentList: (s.inviteSent || []).map((m) => ({ email: m.email, role: t[m.role] })),
    members: [
      ...people.members.map((m, i) => ({ name: m.you ? `${m.name} (${t.youTag})` : m.name, role: t[m.role] || m.role, pending: false, dot: m.role === 'owner' ? dot('#111114', '#FFFFFF') : dot(...DOTS[i % DOTS.length]) })),
      ...people.invites.map((m) => ({ name: m.email, role: (t[m.role] || m.role) + ' · ' + t.invited, pending: true, removeLabel: t.removeInvite, dot: dot('#ECEDEF', '#3A3B40'), remove: () => ws && W.cancelInvite(ws.id, m.id).then(loadPeople) })),
    ],
  };
  return (
    <>
      <WorkspaceView v={{ ...vals, nav: navOf(s.view, t, (k) => set({ view: k })) }} />
      {flash ? <div role="status" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', padding: '10px 16px', borderRadius: 999, background: '#111114', color: '#FFFFFF', fontSize: 14, zIndex: 50 }}>{tr(flash)}</div> : null}
    </>
  );
}

function navOf(view: View, t: Record<string, string>, pick: (k: View) => void) {
  return (['boards', 'shared', 'templates', 'trash'] as View[]).map((k) => {
    const on = view === k;
    return { label: t[k], icon: ICON[k], current: on ? 'page' : 'false', pick: () => pick(k), style: 'height: 44px; padding: 0 10px; gap: 10px; font-size: 15px;' + (on ? ' background: #E7EEFB; color: #1A46A8;' : '') };
  });
}
