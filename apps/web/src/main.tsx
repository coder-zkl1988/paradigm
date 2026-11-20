import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './styles.css';
import { useSession } from './lib/session';
import { workspaces } from './lib/api';
import { SignIn } from './pages/SignIn';
import { Workspace } from './pages/Workspace';
import { Board } from './board/Board';

function Need({ children }: { children: JSX.Element }) {
  const { me, ready } = useSession(), loc = useLocation();
  if (!ready) return <div style={{ minHeight: '100vh', background: '#F6F6F8' }} />;
  if (!me) return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

function BoardPage() {
  const { id = 'new' } = useParams(), nav = useNavigate(), [q] = useSearchParams();
  const { me, lang, flipLang, setLang, signOut } = useSession();
  return (
    <Board key={id} boardId={id} me={me!} lang={lang} flipLang={flipLang} setLang={setLang} embed={q.get('embed') === '1'} toolbar={q.get('toolbar') !== 'off'}
      goHome={(ws) => nav(ws ? `/?ws=${ws}` : '/')} newBoard={() => nav('/board/new')} signOut={() => void signOut().then(() => nav('/signin'))}
      replaceUrl={(bid) => nav(`/b/${bid}`, { replace: true })} />
  );
}

/** A view link or an embed: anyone with the link sees the board and cannot change it. */
function ViewPage({ embed }: { embed?: boolean }) {
  const { token = '' } = useParams(), nav = useNavigate(), [q] = useSearchParams();
  const { me, ready, lang, flipLang, setLang, signOut } = useSession();
  if (!ready) return <div style={{ minHeight: '100vh', background: '#FFFFFF' }} />;
  return (
    <Board key={token} boardId="" viewToken={token} embed={embed} toolbar={q.get('toolbar') !== 'off'} me={me} lang={lang} flipLang={flipLang} setLang={setLang}
      goHome={() => nav(me ? '/' : '/signin')} newBoard={() => nav(me ? '/board/new' : '/signin')} signOut={() => void signOut().then(() => nav('/signin'))} replaceUrl={() => undefined} />
  );
}

function AcceptInvite() {
  const [p] = useSearchParams(), nav = useNavigate();
  useEffect(() => {
    const t = p.get('token');
    if (!t) { nav('/', { replace: true }); return; }
    workspaces.accept(t).finally(() => nav('/', { replace: true }));
  }, []);
  return <div style={{ minHeight: '100vh', background: '#F6F6F8' }} />;
}

function App() {
  const load = useSession((s) => s.load), lang = useSession((s) => s.lang);
  useEffect(() => { void load(); }, []);
  return (
    <Routes key={lang}>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/" element={<Need><Workspace /></Need>} />
      <Route path="/b/:id" element={<Need><BoardPage /></Need>} />
      <Route path="/board/new" element={<Need><BoardPage /></Need>} />
      <Route path="/invite" element={<Need><AcceptInvite /></Need>} />
      <Route path="/v/:token" element={<ViewPage />} />
      <Route path="/embed/:token" element={<ViewPage embed />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
