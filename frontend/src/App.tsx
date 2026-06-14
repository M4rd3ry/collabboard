import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  BarChart3, Calendar, CheckCircle2, Clock3, Edit3, Filter, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Search, Sparkles, Trash2, UserRound, X
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Workspace = { id: number; name: string };
type Board = { id: number; workspaceId: number; name: string };
type Column = { id: number; boardId: number; title: string; position: number };
type Card = { id: number; boardId: number; columnId: number; title: string; description?: string; priority: Priority; assignee?: string; dueDate?: string; label?: string; position: number };
type Draft = { title: string; description: string; priority: Priority; assignee: string; dueDate: string; label: string; columnId: number };
type EntityDialog = { kind: 'workspace' | 'board' | 'column'; mode: 'create' | 'rename'; id?: number; value: string };

const emptyDraft = (columnId = 0): Draft => ({ title: '', description: '', priority: 'MEDIUM', assignee: '', dueDate: '', label: '', columnId });

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  return token
    ? <Dashboard onLogout={() => { localStorage.clear(); setToken(null); }} />
    : <Auth onAuth={(value) => { localStorage.setItem('accessToken', value); setToken(value); }} />;
}

function Auth({ onAuth }: { onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Vitalii');
  const [email, setEmail] = useState('demo@demo.com');
  const [password, setPassword] = useState('demo12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = mode === 'register' ? { name, email, password } : { email, password };
      const { data } = await api.post(`/api/auth/${mode}`, payload);
      onAuth(data.accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not connect to the server');
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-hero">
      <div className="hero-badge"><Sparkles size={16} /> Built for focused teams</div>
      <h1>Turn ideas into<br /><span>finished work.</span></h1>
      <p>A full-stack Kanban workspace built with Spring Boot, React, PostgreSQL, JWT and Docker.</p>
      <div className="hero-stats"><b>JWT</b><b>REST API</b><b>PostgreSQL</b><b>Docker</b></div>
    </section>
    <section className="auth-panel">
      <div className="brand"><div>CB</div><strong>CollabBoard</strong></div>
      <h2>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
      <p>{mode === 'login' ? 'Sign in to continue to your boards.' : 'Your first workspace is created automatically.'}</p>
      <div className="tabs">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Login</button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Register</button>
      </div>
      <form onSubmit={submit}>
        {mode === 'register' && <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>}
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </section>
  </main>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const initialized = useRef(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [workspaceId, setWorkspaceId] = useState<number>();
  const [boardId, setBoardId] = useState<number>();
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('ALL');
  const [cardModal, setCardModal] = useState<{ card?: Card; columnId: number } | null>(null);
  const [entityDialog, setEntityDialog] = useState<EntityDialog | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; text: string; run: () => Promise<void> } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<number>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void bootstrap();
  }, []);

  function fail(err: any, fallback = 'Something went wrong') {
    if (err.response?.status === 401) return onLogout();
    setError(err.response?.data?.message || fallback);
  }

  async function bootstrap() {
    setLoading(true);
    try {
      let ws = (await api.get<Workspace[]>('/api/workspaces')).data;
      if (ws.length === 0) {
        await api.post('/api/bootstrap/default');
        ws = (await api.get<Workspace[]>('/api/workspaces')).data;
      }
      setWorkspaces(ws);
      if (ws[0]) {
        setWorkspaceId(ws[0].id);
        await loadBoards(ws[0].id);
      } else {
        setBoards([]);
        setColumns([]);
        setCards([]);
      }
    } catch (err) {
      fail(err, 'Could not load your workspace');
    } finally {
      setLoading(false);
    }
  }

  async function loadBoards(wid: number, preferredBoard?: number) {
    const bs = (await api.get<Board[]>('/api/boards', { params: { workspaceId: wid } })).data;
    setBoards(bs);
    const selected = bs.find((b) => b.id === preferredBoard) || bs[0];
    setBoardId(selected?.id);
    if (selected) await loadSnapshot(selected.id);
    else { setColumns([]); setCards([]); }
  }

  async function loadSnapshot(id: number) {
    const { data } = await api.get(`/api/boards/${id}/snapshot`);
    setColumns(data.columns);
    setCards(data.cards);
  }

  async function refreshWorkspaces(preferred?: number) {
    const ws = (await api.get<Workspace[]>('/api/workspaces')).data;
    setWorkspaces(ws);
    const selected = ws.find((w) => w.id === preferred) || ws[0];
    setWorkspaceId(selected?.id);
    if (selected) await loadBoards(selected.id);
    else { setBoards([]); setBoardId(undefined); setColumns([]); setCards([]); }
  }

  async function submitEntity(value: string) {
    if (!entityDialog) return;
    try {
      if (entityDialog.kind === 'workspace') {
        if (entityDialog.mode === 'create') {
          const { data } = await api.post('/api/workspaces', { name: value });
          await refreshWorkspaces(data.id);
        } else {
          await api.patch(`/api/workspaces/${entityDialog.id}`, { name: value });
          await refreshWorkspaces(entityDialog.id);
        }
      }
      if (entityDialog.kind === 'board' && workspaceId) {
        if (entityDialog.mode === 'create') {
          const { data } = await api.post('/api/boards', { workspaceId, name: value });
          await loadBoards(workspaceId, data.id);
        } else {
          await api.patch(`/api/boards/${entityDialog.id}`, { name: value });
          await loadBoards(workspaceId, entityDialog.id);
        }
      }
      if (entityDialog.kind === 'column' && boardId) {
        if (entityDialog.mode === 'create') await api.post('/api/columns', { boardId, title: value, position: columns.length });
        else {
          const col = columns.find((c) => c.id === entityDialog.id)!;
          await api.patch(`/api/columns/${col.id}`, { title: value, position: col.position });
        }
        await loadSnapshot(boardId);
      }
      setNotice(`${capitalize(entityDialog.kind)} ${entityDialog.mode === 'create' ? 'created' : 'renamed'}`);
      setEntityDialog(null);
    } catch (err) { fail(err); }
  }

  async function saveCard(draft: Draft, id?: number) {
    if (!boardId) return;
    try {
      const payload = {
        ...draft,
        boardId,
        position: id ? cards.find((c) => c.id === id)?.position || 0 : cards.filter((c) => c.columnId === draft.columnId).length,
        dueDate: draft.dueDate || null
      };
      if (id) await api.patch(`/api/cards/${id}`, payload);
      else await api.post('/api/cards', payload);
      setCardModal(null);
      setNotice(id ? 'Task updated' : 'Task created');
      await loadSnapshot(boardId);
    } catch (err) { fail(err); }
  }

  async function removeCard(id: number) {
    if (!boardId) return;
    try {
      await api.delete(`/api/cards/${id}`);
      setCardModal(null);
      setNotice('Task deleted');
      await loadSnapshot(boardId);
    } catch (err) { fail(err); }
  }

  async function drop(columnId: number) {
    if (!dragId || !boardId) return;
    try {
      await api.patch(`/api/cards/${dragId}/move`, { columnId, position: cards.filter((c) => c.columnId === columnId).length });
      setDragId(undefined);
      await loadSnapshot(boardId);
    } catch (err) { fail(err); }
  }

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);
  const currentBoard = boards.find((b) => b.id === boardId);
  const filtered = useMemo(() => cards.filter((card) =>
    (priority === 'ALL' || card.priority === priority) &&
    `${card.title} ${card.description || ''} ${card.assignee || ''} ${card.label || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [cards, search, priority]);
  const doneId = columns.find((c) => c.title.toLowerCase() === 'done')?.id;
  const done = cards.filter((c) => c.columnId === doneId).length;
  const overdue = cards.filter((c) => c.dueDate && new Date(`${c.dueDate}T23:59:59`) < new Date() && c.columnId !== doneId).length;

  return <div className="app">
    <button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={sidebarOpen ? 'open' : ''}>
      <button className="sidebar-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
      <div className="brand side"><div>CB</div><strong>CollabBoard</strong></div>
      <nav><a className="active"><LayoutDashboard size={18} /> Boards</a></nav>
      <div className="workspace-label">WORKSPACE</div>
      <select aria-label="Workspace" value={workspaceId || ''} onChange={async (e) => { const id = Number(e.target.value); setWorkspaceId(id); await loadBoards(id); setSidebarOpen(false); }}>
        {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <div className="side-actions">
        <button title="Create workspace" onClick={() => setEntityDialog({ kind: 'workspace', mode: 'create', value: '' })}><Plus size={16} /></button>
        <button title="Rename workspace" disabled={!currentWorkspace} onClick={() => currentWorkspace && setEntityDialog({ kind: 'workspace', mode: 'rename', id: currentWorkspace.id, value: currentWorkspace.name })}><Edit3 size={15} /></button>
        <button title="Delete workspace" disabled={!currentWorkspace} onClick={() => currentWorkspace && setConfirmAction({
          title: 'Delete workspace?', text: `“${currentWorkspace.name}” and all its boards, columns and tasks will be permanently deleted.`,
          run: async () => { await api.delete(`/api/workspaces/${currentWorkspace.id}`); await refreshWorkspaces(); setNotice('Workspace deleted'); }
        })}><Trash2 size={15} /></button>
      </div>
      <button className="logout" onClick={onLogout}><LogOut size={17} /><span>Log out</span></button>
    </aside>

    <main className="content">
      <header>
        <div><div className="eyebrow">{currentWorkspace?.name || 'WORKSPACE'} / BOARD</div><h1>{loading ? 'Loading…' : currentBoard?.name || 'No board selected'}</h1><p>Plan, prioritize and ship meaningful work.</p></div>
        <div className="header-actions">
          <button className="ghost" disabled={!workspaceId} onClick={() => setEntityDialog({ kind: 'board', mode: 'create', value: '' })}><Plus size={17} /> New board</button>
          <button className="primary compact" disabled={!columns[0]} onClick={() => columns[0] && setCardModal({ columnId: columns[0].id })}><Plus size={17} /> Add task</button>
        </div>
      </header>

      {error && <div className="page-error"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}

      <section className="stats">
        <Stat icon={<CheckCircle2 />} label="Completed" value={done} />
        <Stat icon={<Clock3 />} label="Open tasks" value={cards.length - done} />
        <Stat icon={<Calendar />} label="Overdue" value={overdue} />
        <Stat icon={<BarChart3 />} label="Progress" value={cards.length ? `${Math.round(done / cards.length * 100)}%` : '0%'} />
      </section>

      <div className="toolbar">
        <div className="search"><Search size={17} /><input placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter"><Filter size={16} /><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="ALL">All priorities</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></div>
        <select value={boardId || ''} onChange={async (e) => { const id = Number(e.target.value); setBoardId(id); await loadSnapshot(id); }}>{boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <button className="icon-btn" title="Rename board" disabled={!currentBoard} onClick={() => currentBoard && setEntityDialog({ kind: 'board', mode: 'rename', id: currentBoard.id, value: currentBoard.name })}><Edit3 size={17} /></button>
        <button className="icon-btn danger-icon" title="Delete board" disabled={!currentBoard} onClick={() => currentBoard && workspaceId && setConfirmAction({
          title: 'Delete board?', text: `“${currentBoard.name}” and all its columns and tasks will be permanently deleted.`,
          run: async () => { await api.delete(`/api/boards/${currentBoard.id}`); await loadBoards(workspaceId); setNotice('Board deleted'); }
        })}><Trash2 size={17} /></button>
        <button className="icon-btn" title="Add column" disabled={!boardId} onClick={() => setEntityDialog({ kind: 'column', mode: 'create', value: '' })}><Plus size={18} /></button>
      </div>

      {!loading && !currentBoard && <EmptyState title="No boards yet" text="Create a board to start organizing tasks." action="Create board" onClick={() => setEntityDialog({ kind: 'board', mode: 'create', value: '' })} />}

      {currentBoard && <section className="kanban">
        {columns.map((col) => <div className="column" key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(col.id)}>
          <div className="column-head">
            <div><span className="dot" /><b>{col.title}</b><em>{filtered.filter((c) => c.columnId === col.id).length}</em></div>
            <div className="column-actions">
              <button title="Add task" onClick={() => setCardModal({ columnId: col.id })}><Plus size={18} /></button>
              <button title="Rename column" onClick={() => setEntityDialog({ kind: 'column', mode: 'rename', id: col.id, value: col.title })}><Edit3 size={15} /></button>
              <button title="Delete column" onClick={() => setConfirmAction({
                title: 'Delete column?', text: `“${col.title}” and ${cards.filter((c) => c.columnId === col.id).length} task(s) will be permanently deleted.`,
                run: async () => { await api.delete(`/api/columns/${col.id}`); await loadSnapshot(currentBoard.id); setNotice('Column deleted'); }
              })}><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="card-list">
            {filtered.filter((c) => c.columnId === col.id).sort((a, b) => a.position - b.position).map((card) => <article draggable onDragStart={() => setDragId(card.id)} onClick={() => setCardModal({ card, columnId: card.columnId })} className="task" key={card.id}>
              <div className="task-top"><span className={`priority ${card.priority.toLowerCase()}`}>{card.priority}</span><button type="button" className="task-menu" aria-label={`Edit ${card.title}`} onClick={(event) => { event.stopPropagation(); setCardModal({ card, columnId: card.columnId }); }}><MoreHorizontal size={17} /></button></div>
              <h3>{card.title}</h3>{card.description && <p>{card.description}</p>}
              <div className="task-meta">{card.label && <span className="label">{card.label}</span>}{card.dueDate && <span className={new Date(`${card.dueDate}T23:59:59`) < new Date() && card.columnId !== doneId ? 'late' : ''}><Calendar size={14} />{card.dueDate}</span>}</div>
              <div className="task-footer">{card.assignee ? <><span className="avatar">{card.assignee.slice(0, 2).toUpperCase()}</span><span>{card.assignee}</span></> : <><span className="avatar muted"><UserRound size={13} /></span><span>No assignee</span></>}</div>
            </article>)}
            <button className="add-inline" onClick={() => setCardModal({ columnId: col.id })}><Plus size={16} /> Add task</button>
          </div>
        </div>)}
      </section>}
      {notice && <div className="toast" onAnimationEnd={() => setNotice('')}>{notice}</div>}
    </main>

    {cardModal && <CardModal initial={cardModal.card} columnId={cardModal.columnId} columns={columns} onClose={() => setCardModal(null)} onSave={saveCard} onDelete={cardModal.card ? () => setConfirmAction({ title: 'Delete task?', text: `“${cardModal.card!.title}” will be permanently deleted.`, run: () => removeCard(cardModal.card!.id) }) : undefined} />}
    {entityDialog && <NameModal title={`${entityDialog.mode === 'create' ? 'Create' : 'Rename'} ${entityDialog.kind}`} value={entityDialog.value} onClose={() => setEntityDialog(null)} onSave={submitEntity} />}
    {confirmAction && <ConfirmModal title={confirmAction.title} text={confirmAction.text} onClose={() => setConfirmAction(null)} onConfirm={async () => { try { await confirmAction.run(); setConfirmAction(null); } catch (err) { fail(err); } }} />}
  </div>;
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) { return <div className="stat"><div className="stat-icon">{icon}</div><div><b>{value}</b><span>{label}</span></div></div>; }
function EmptyState({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) { return <div className="empty-state"><h2>{title}</h2><p>{text}</p><button className="primary compact" onClick={onClick}><Plus size={16} />{action}</button></div>; }

function NameModal({ title, value, onClose, onSave }: { title: string; value: string; onClose: () => void; onSave: (value: string) => Promise<void> }) {
  const [name, setName] = useState(value);
  const [saving, setSaving] = useState(false);
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal small-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; setSaving(true); await onSave(name.trim()); setSaving(false); }}>
    <div className="modal-head"><div><h2>{title}</h2><p>Use a clear, descriptive name.</p></div><button type="button" onClick={onClose}><X /></button></div>
    <label>Name<input autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required /></label>
    <div className="modal-actions simple"><button type="button" className="ghost" onClick={onClose}>Cancel</button><button className="primary compact" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
  </form></div>;
}

function ConfirmModal({ title, text, onClose, onConfirm }: { title: string; text: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [working, setWorking] = useState(false);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal small-modal" onMouseDown={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><h2>{title}</h2><p>{text}</p></div><button onClick={onClose}><X /></button></div>
    <div className="modal-actions simple"><button className="ghost" onClick={onClose}>Cancel</button><button className="danger solid" disabled={working} onClick={async () => { setWorking(true); await onConfirm(); setWorking(false); }}>{working ? 'Deleting…' : 'Delete'}</button></div>
  </div></div>;
}

function CardModal({ initial, columnId, columns, onClose, onSave, onDelete }: { initial?: Card; columnId: number; columns: Column[]; onClose: () => void; onSave: (d: Draft, id?: number) => void; onDelete?: () => void }) {
  const [draft, setDraft] = useState<Draft>(initial ? { title: initial.title, description: initial.description || '', priority: initial.priority, assignee: initial.assignee || '', dueDate: initial.dueDate || '', label: initial.label || '', columnId: initial.columnId } : emptyDraft(columnId));
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave(draft, initial?.id); }}>
    <div className="modal-head"><div><h2>{initial ? 'Edit task' : 'Create task'}</h2><p>Add enough context for your teammates.</p></div><button type="button" onClick={onClose}><X /></button></div>
    <label>Title<input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required maxLength={140} /></label>
    <label>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} maxLength={2000} /></label>
    <div className="form-grid">
      <label>Status<select value={draft.columnId} onChange={(e) => setDraft({ ...draft, columnId: Number(e.target.value) })}>{columns.map((c) => <option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
      <label>Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>
      <label>Assignee<input value={draft.assignee} maxLength={80} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} placeholder="Vitalii" /></label>
      <label>Due date<input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
    </div>
    <label>Label<input value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Frontend, API, Design…" /></label>
    <div className="modal-actions">{onDelete && <button type="button" className="danger" onClick={onDelete}><Trash2 size={16} /> Delete</button>}<span /><button type="button" className="ghost" onClick={onClose}>Cancel</button><button className="primary compact">{initial ? 'Save changes' : 'Create task'}</button></div>
  </form></div>;
}
