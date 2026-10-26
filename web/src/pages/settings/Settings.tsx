import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ENTITIES, ENTITY_MAP, nameOf, type Entity } from '../../../../core/schema.ts';
import { api, can, deleteAccount, getState, logout, refreshAuth, restoreEntity, updateMe, updateSettings, useGraph, useMe, useSettings, useStore, type Persona, type Role } from '../../store.ts';
import { setQuery, useRoute } from '../../router.tsx';
import { Avatar, Card, Empty, Modal, PageHead, Seg, Tabs, copyText, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { fmtDate, relDays } from '../../ui/format.ts';
import { openEditor } from '../../entity/editor.tsx';
import { useTheme } from '../../shell.tsx';
import { IntegrationsTab } from './Integrations.tsx';
import { Customise } from './Customise.tsx';

type Tab = 'profile' | 'workspace' | 'members' | 'connect' | 'integrations' | 'ai' | 'data';

export function SettingsPage() {
  const { query } = useRoute();
  const isAdmin = can('admin');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'workspace', label: 'Workspace' },
    ...(isAdmin ? [{ id: 'members' as Tab, label: 'People & access' }] : []),
    { id: 'connect', label: 'Tokens & integrations' },
    ...(isAdmin ? [{ id: 'integrations' as Tab, label: 'Jira, ADO & more' }] : []),
    { id: 'ai', label: 'AI' },
    { id: 'data', label: 'Data' },
  ];
  const requested = query.get('tab') as Tab | null;
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested! : 'profile';
  return (
    <div className="page">
      <PageHead title="Settings" sub="Your profile, this workspace, who has access, and how other tools and AI models connect." />
      <Tabs tabs={tabs} value={tab} onChange={(t) => setQuery({ tab: t })} />
      <div className="mt16">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'workspace' && <WorkspaceTab />}
        {tab === 'members' && isAdmin && <MembersTab />}
        {tab === 'connect' && <ConnectTab />}
        {tab === 'integrations' && isAdmin && <IntegrationsTab />}
        {tab === 'ai' && <AiTab />}
        {tab === 'data' && <DataTab />}
      </div>
    </div>
  );
}

function Row({ label, help, children }: { label: string; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div><div className="strong">{label}</div>{help && <div className="small muted">{help}</div>}</div>
      <div>{children}</div>
    </div>
  );
}

// ---------------- profile ----------------

function ProfileTab() {
  const me = useMe()!;
  const [theme, setTheme] = useTheme();
  const [name, setName] = useState(me.name);
  const [title, setTitle] = useState(me.title ?? '');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [deleting, setDeleting] = useState(false);
  const persona = me.prefs.persona ?? 'both';
  const saveProfile = async () => {
    try { await updateMe({ name, title }); toast('Profile saved'); } catch (err) { errorToast(err); }
  };
  const changePassword = async () => {
    try {
      await api('/api/me/password', { method: 'POST', json: pw });
      setPw({ current: '', next: '' });
      toast('Password changed. Other devices were signed out.');
    } catch (err) { errorToast(err); }
  };
  return (
    <div className="stack">
      <Card title="You">
        <Row label="Name" help="Shown on everything you change, and on your stakeholder record in each workspace."><input aria-label="Your name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Row>
        <Row label="Role or title"><input aria-label="Your title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Product Owner, Identity & Access" /></Row>
        <Row label="Email"><span className="muted">{me.email}</span></Row>
        <div className="row mt12"><span className="spacer" /><button className="btn btn-primary" onClick={saveProfile} disabled={!name.trim()}>Save profile</button></div>
      </Card>
      <Card title="How you work">
        <Row label="I mostly work as" help="Sets the starting pins in your sidebar. Every tool is always one click away under All tools.">
          <Seg options={[{ id: 'po', label: 'Product owner' }, { id: 'ba', label: 'Business analyst' }, { id: 'both', label: 'Both' }]} value={persona} onChange={(p: Persona) => updateMe({ prefs: { persona: p } }).catch(errorToast)} />
        </Row>
        <Row label="Theme"><Seg options={[{ id: 'system', label: 'Match system' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} value={theme} onChange={setTheme} /></Row>
        <Row label="Tips" help="Short how-to panels at the top of tools.">
          <button className="btn btn-sm" onClick={() => updateMe({ prefs: { dismissedGuides: [] } }).then(() => toast('Tips will show again')).catch(errorToast)} disabled={!me.prefs.dismissedGuides?.length}>Show dismissed tips again</button>
        </Row>
      </Card>
      <Card title="Password">
        {me.demo ? <div className="small muted">Demo accounts share a password and are reset with the demo: create your own account to keep your work.</div> : (
          <>
            <Row label="Current password"><input aria-label="Current password" className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Row>
            <Row label="New password" help="At least 10 characters. Signs out your other devices."><input aria-label="New password" className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Row>
            <div className="row mt12"><span className="spacer" /><button className="btn" onClick={changePassword} disabled={!pw.current || pw.next.length < 10}>Change password</button></div>
          </>
        )}
      </Card>
      <Notifications />
      <Card title="Your data">
        <Row label="Download" help="Your profile, preferences, tokens, comments and everything you changed in each workspace, as one JSON file.">
          <a className="btn" href="/api/me/export" download><Icon name="download" size={14} />Download my data</a>
        </Row>
        {!me.demo && (
          <Row label="Delete account" help="Workspaces where you're the only member are deleted with it. Elsewhere your work stays, and your name is replaced with “Former member”.">
            <button className="btn btn-danger" onClick={() => setDeleting(true)}><Icon name="trash-2" size={14} />Delete my account…</button>
          </Row>
        )}
      </Card>
      <div><button className="btn btn-ghost" onClick={() => void logout()}><Icon name="log-out" size={14} />Sign out</button></div>
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </div>
  );
}

function Notifications() {
  const me = useMe()!;
  const mail = !!useStore().auth?.mail;
  const n = (me.prefs.notify ?? {}) as { mentions?: boolean; approvals?: boolean; digest?: boolean };
  const set = (k: 'mentions' | 'approvals' | 'digest', v: boolean) => updateMe({ prefs: { notify: { ...n, [k]: v } } }).catch(errorToast);
  const toggle = (k: 'mentions' | 'approvals' | 'digest', on: boolean, label: string, help: string) => (
    <label className="check-row"><input type="checkbox" checked={on} disabled={!mail || me.demo} onChange={(e) => set(k, e.target.checked)} /><span><span className="strong">{label}</span><span className="small muted">: {help}</span></span></label>
  );
  return (
    <Card title="Notifications" sub={mail ? `Emails go to ${me.email}.` : 'This server has no email set up, so everything shows in your Inbox instead.'}>
      <div className="col" style={{ gap: 8 }}>
        {toggle('mentions', n.mentions !== false, 'When someone mentions me', 'with the comment and a link')}
        {toggle('approvals', n.approvals !== false, 'When my sign-off is requested', 'with the due date')}
        {toggle('digest', n.digest === true, 'Weekly digest', 'Monday morning: what is waiting on you in each workspace')}
      </div>
    </Card>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const me = useMe()!;
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true); setError('');
    try { await deleteAccount(me.hasPassword === false ? { confirm: secret } : { password: secret }); } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <Modal onClose={onClose} label="Delete your account">
      <form className="col" style={{ padding: 20, gap: 14 }} onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <div>
          <h2>Delete your account?</h2>
          <p className="small muted" style={{ marginBottom: 0 }}>This can't be undone. Download your data first if you want a copy.</p>
        </div>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Workspaces where you're the only member are deleted.</li>
          <li>In shared workspaces your work stays, signed “Former member”.</li>
          <li>Your tokens stop working and you're signed out everywhere.</li>
        </ul>
        <div className="field">
          <label htmlFor="del-secret">{me.hasPassword === false ? 'Type your email to confirm' : 'Your password'}</label>
          <input id="del-secret" className="input" type={me.hasPassword === false ? 'email' : 'password'} autoComplete={me.hasPassword === false ? 'off' : 'current-password'} autoFocus value={secret} onChange={(e) => setSecret(e.target.value)} />
        </div>
        {error && <div className="err" role="alert">{error}</div>}
        <div className="row"><span className="spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={busy || !secret}>{busy ? 'Deleting…' : 'Delete my account'}</button></div>
      </form>
    </Modal>
  );
}

// ---------------- workspace ----------------

function WorkspaceTab() {
  const s = useStore();
  const settings = useSettings();
  const isAdmin = can('admin');
  const cur = s.auth?.current;
  const [name, setName] = useState(cur?.name ?? settings.workspaceName);
  const [product, setProduct] = useState(settings.productName);
  const [currency, setCurrency] = useState(settings.currency ?? '$');
  const save = async () => {
    try {
      if (cur && name.trim() !== cur.name) await api('/api/admin/workspace', { method: 'PATCH', json: { name } });
      await updateSettings({ productName: product, currency });
      await refreshAuth();
      toast('Workspace saved');
    } catch (err) { errorToast(err); }
  };
  const archive = async () => {
    if (!cur || !confirm(`Archive “${cur.name}”? Nobody will be able to open it. The data file is kept on the server.`)) return;
    try { await api('/api/admin/workspace', { method: 'DELETE' }); toast('Workspace archived'); location.hash = '#/today'; location.reload(); } catch (err) { errorToast(err); }
  };
  return (
    <div className="stack">
      <Card title="This workspace">
        <Row label="Name"><input aria-label="Workspace name" className="input" value={name} disabled={!isAdmin} onChange={(e) => setName(e.target.value)} /></Row>
        <Row label="Product or programme" help="Used in generated documents and the daily brief."><input aria-label="Product or programme" className="input" value={product} disabled={!isAdmin} onChange={(e) => setProduct(e.target.value)} /></Row>
        <Row label="Currency symbol"><input aria-label="Currency symbol" className="input" style={{ maxWidth: 90 }} value={currency} disabled={!isAdmin} onChange={(e) => setCurrency(e.target.value)} /></Row>
        <Row label="Your access"><span>{cur?.role}{cur?.demo ? ' · demo workspace' : ''}{cur?.kind === 'personal' ? ' · personal' : ' · team'}</span></Row>
        {isAdmin ? <div className="row mt12"><span className="spacer" /><button className="btn btn-primary" onClick={save}>Save</button></div> : <div className="small muted mt12">Only admins and owners can change workspace settings.</div>}
      </Card>
      <Customise />
      <Card title="Use it everywhere">
        <div className="small">Install Goldthread as an app: in Chrome or Edge choose <b>Install app</b> in the address bar; in Safari use <b>File → Add to Dock</b> (macOS) or <b>Share → Add to Home Screen</b> (iPhone, iPad). The last copy of the workspace stays readable offline.</div>
      </Card>
      {isAdmin && <EmailStatus />}
      {cur?.role === 'owner' && (
        <Card title="Archive workspace">
          <div className="row"><div className="small muted grow">Removes it from everyone's switcher. You need at least one other workspace.</div><button className="btn btn-danger" onClick={archive}>Archive…</button></div>
        </Card>
      )}
    </div>
  );
}

function EmailStatus() {
  const [st, setSt] = useState<{ enabled: boolean; from?: string; host?: string; recent: { to: string; subject: string; createdAt: string; sentAt?: string; attempts: number; error?: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api('/api/admin/mail').then(setSt).catch(errorToast); }, []);
  useEffect(load, [load]);
  const test = async () => {
    setBusy(true);
    try { const r = await api<{ to: string }>('/api/admin/mail/test', { method: 'POST' }); toast(`Test email sent to ${r.to}`); } catch (err) { errorToast(err); } finally { setBusy(false); load(); }
  };
  if (!st) return null;
  return (
    <Card title="Email (whole server)" sub={st.enabled ? `Sending as ${st.from} through ${st.host}.` : 'Not set up. Invites and reset links are shared by hand, and notifications stay in the Inbox.'}
      actions={st.enabled && <button className="btn btn-sm" onClick={test} disabled={busy}>{busy ? 'Sending…' : 'Send me a test email'}</button>}>
      {!st.enabled && <div className="small">Set <code>GT_SMTP_URL</code> (for example <code>smtp://user:password@smtp.example.com:587</code>), <code>GT_MAIL_FROM</code> and <code>GT_PUBLIC_URL</code> on the server and restart it. See the self-hosting guide.</div>}
      {st.enabled && st.recent.length > 0 && (
        <div className="list">{st.recent.map((m, i) => (
          <div key={i} className="list-item small" style={{ padding: '6px 0' }}>
            <span className={`dot ${m.sentAt ? 'good' : m.attempts >= 5 ? 'critical' : 'warning'}`} />
            <div className="grow ellipsis">{m.subject} <span className="muted">→ {m.to}</span>{m.error && !m.sentAt && <div className="muted ellipsis">{m.error}</div>}</div>
            <span className="muted nowrap">{m.sentAt ? 'sent' : m.attempts >= 5 ? 'gave up' : `retrying (${m.attempts})`}</span>
          </div>
        ))}</div>
      )}
    </Card>
  );
}

// ---------------- members & access ----------------

interface MemberRow { userId: string; name: string; email: string; title?: string; demo: boolean; role: Role; joinedAt: string; teamIds: string[] }
interface InviteRow { id: string; email: string; role: Role; teamIds: string[]; createdAt: string; expiresAt: string; acceptedAt?: string; revoked?: boolean; invitedBy?: string }

const ROLE_INFO: { role: Role; label: string; can: string }[] = [
  { role: 'viewer', label: 'Viewer', can: 'Reads everything, comments, and creates read-only tokens. Good for sponsors, auditors and stakeholders.' },
  { role: 'editor', label: 'Editor', can: 'Creates and edits items, runs meetings, captures signals. Most of the team.' },
  { role: 'admin', label: 'Admin', can: 'Everything an editor can, plus invites people, changes roles, sets up AI and imports data.' },
  { role: 'owner', label: 'Owner', can: 'Everything, including making other admins and owners, and archiving the workspace.' },
];

function MembersTab() {
  const s = useStore();
  const g = useGraph();
  const me = useMe()!;
  const isOwner = s.role === 'owner';
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [link, setLink] = useState<{ email: string; url: string; emailed?: boolean } | null>(null);
  const mail = !!s.auth?.mail;
  const [sendEmail, setSendEmail] = useState(true);
  const [resetLink, setResetLink] = useState<{ name: string; url: string; expiresAt: string } | null>(null);
  const teams = g.all('team');
  const load = useCallback(() => {
    api<MemberRow[]>('/api/admin/members').then(setMembers).catch(errorToast);
    api<InviteRow[]>('/api/admin/invites').then(setInvites).catch(errorToast);
  }, []);
  useEffect(load, [load, s.members.length]);

  const invite = async () => {
    try {
      const r = await api<{ link: string; emailed: boolean }>('/api/admin/invites', { method: 'POST', json: { email, role, teamIds, sendEmail: mail && sendEmail } });
      setLink({ email, url: r.link, emailed: r.emailed });
      setEmail(''); setTeamIds([]);
      load();
    } catch (err) { errorToast(err); }
  };
  const changeRole = async (m: MemberRow, next: Role) => {
    try { await api(`/api/admin/members/${m.userId}`, { method: 'PATCH', json: { role: next } }); toast(`${m.name} is now ${next}`); load(); } catch (err) { errorToast(err); }
  };
  const remove = async (m: MemberRow) => {
    if (!confirm(`Remove ${m.name} from this workspace? Their history stays; they lose access straight away.`)) return;
    try { await api(`/api/admin/members/${m.userId}`, { method: 'DELETE' }); toast(`${m.name} removed`); load(); } catch (err) { errorToast(err); }
  };
  const issueReset = async (m: MemberRow) => {
    try {
      const r = await api<{ token: string; expiresAt: string }>(`/api/admin/members/${m.userId}/reset-link`, { method: 'POST' });
      setResetLink({ name: m.name, url: `${location.origin}${location.pathname}#/reset/${r.token}`, expiresAt: r.expiresAt });
    } catch (err) { errorToast(err); }
  };
  const revoke = async (i: InviteRow) => {
    try { await api(`/api/admin/invites/${i.id}`, { method: 'DELETE' }); load(); } catch (err) { errorToast(err); }
  };
  const roleOptions = (current: Role) => ROLE_INFO.filter((r) => isOwner || (r.role !== 'owner' && r.role !== 'admin') || r.role === current);
  const pending = invites.filter((i) => !i.acceptedAt && !i.revoked && i.expiresAt > new Date().toISOString());
  const teamName = (id: string) => g.get(id)?.name ?? '–';

  return (
    <div className="stack">
      <Card title="Invite someone" sub={mail ? 'They get an email with a link. It works once, for that address, for 14 days.' : 'This server has no email set up. Create a link and share it in Slack, Teams or email: it works once, for that address, for 14 days.'}>
        <form className="invite-form" onSubmit={(e) => { e.preventDefault(); void invite(); }}>
          <input className="input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email to invite" />
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role">
            {ROLE_INFO.filter((r) => isOwner || r.role === 'editor' || r.role === 'viewer').map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!email.includes('@')}><Icon name="user-plus" size={14} />Create invite link</button>
        </form>
        {mail && <label className="row small mt8" style={{ gap: 6 }}><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />Email the invite to them</label>}
        {teams.length > 0 && (
          <div className="row-wrap mt8 small"><span className="muted">Add to teams:</span>
            {teams.map((t) => (
              <label key={t.id} className="chip" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={teamIds.includes(t.id)} onChange={(e) => setTeamIds(e.target.checked ? [...teamIds, t.id] : teamIds.filter((x) => x !== t.id))} style={{ marginRight: 4 }} />{t.name}
              </label>
            ))}
          </div>
        )}
        {link && (
          <div className="invite-link mt12">
            <div className="small"><b>Invite for {link.email}</b>{link.emailed ? ': emailed to them. The link is here too, in case it lands in spam.' : ': copy it now; for security it isn\'t shown again.'}</div>
            <div className="row mt8"><input aria-label="Invite link" className="input mono" readOnly value={link.url} onFocus={(e) => e.target.select()} /><button className="btn" onClick={() => copyText(link.url, 'Invite link copied')}><Icon name="copy" size={14} />Copy</button></div>
          </div>
        )}
      </Card>

      {resetLink && (
        <Card title={`Password reset link for ${resetLink.name}`} actions={<button className="btn btn-ghost btn-sm" onClick={() => setResetLink(null)}>Done</button>}>
          <div className="small">Send it to them privately. It works once, until {fmtDate(resetLink.expiresAt.slice(0, 10))}, and earlier links stop working. Copy it now; it isn't shown again.</div>
          <div className="row mt8"><input className="input mono" readOnly value={resetLink.url} onFocus={(e) => e.target.select()} aria-label="Reset link" /><button className="btn" onClick={() => copyText(resetLink.url, 'Reset link copied')}><Icon name="copy" size={14} />Copy</button></div>
        </Card>
      )}
      <Card title={`People · ${members.length}`} flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Person</th><th>Teams</th><th className="tight">Role</th><th className="tight" /></tr></thead>
            <tbody>
              {members.map((m) => {
                const self = m.userId === me.id;
                const locked = !isOwner && (m.role === 'owner' || m.role === 'admin');
                return (
                  <tr key={m.userId}>
                    <td><div className="row"><Avatar name={m.name} size="sm" /><div style={{ minWidth: 0 }}><div className="strong">{m.name}{self && <span className="muted"> (you)</span>}</div><div className="small muted ellipsis">{m.email}{m.title ? ` · ${m.title}` : ''}</div></div></div></td>
                    <td><div className="chips">{m.teamIds.map((t) => <span key={t} className="chip">{teamName(t)}</span>)}{!m.teamIds.length && <span className="muted small">–</span>}</div></td>
                    <td className="tight">
                      <select className="select" style={{ minWidth: 110 }} value={m.role} disabled={locked || self} onChange={(e) => changeRole(m, e.target.value as Role)} aria-label={`Role for ${m.name}`}>
                        {roleOptions(m.role).map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="tight">{!self && !locked && (
                      <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        {!m.demo && <button className="btn btn-ghost btn-sm" onClick={() => issueReset(m)} title={`Create a password reset link for ${m.name}`}>Reset password</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(m)} title={`Remove ${m.name}`}>Remove</button>
                      </div>
                    )}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {pending.length > 0 && (
        <Card title={`Pending invites · ${pending.length}`} flush>
          <div className="list">
            {pending.map((i) => (
              <div key={i.id} className="list-item" style={{ alignItems: 'center' }}>
                <Icon name="mail" size={15} className="muted" />
                <div className="grow"><div className="strong">{i.email}</div><div className="small muted">{i.role}{i.teamIds.length ? ` · ${i.teamIds.map(teamName).join(', ')}` : ''} · invited by {i.invitedBy ?? 'someone'} {relDays(i.createdAt)} · expires {fmtDate(i.expiresAt)}</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => revoke(i)}>Revoke</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Teams" sub="Group people inside the workspace. Teams show up in capacity planning and RACI, and you can invite straight into one." actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'team', open: false })}><Icon name="plus" size={13} />New team</button>} flush>
        {teams.length === 0 ? <Empty icon="users">No teams yet.</Empty> : (
          <div className="list">
            {teams.map((t) => {
              const people = members.filter((m) => m.teamIds.includes(t.id));
              return (
                <div key={t.id} className="list-item" style={{ alignItems: 'center' }}>
                  <div className="grow">
                    <div className="strong">{t.name}</div>
                    <div className="small muted">{t.leadId ? `Lead: ${g.get(t.leadId)?.name ?? '–'} · ` : ''}{people.length ? people.map((p) => p.name).join(', ') : 'No members with accounts yet'}</div>
                  </div>
                  <TeamMembersPicker team={t} members={members} onChange={load} />
                  <button className="btn btn-ghost btn-sm" onClick={() => openEditor({ type: 'team', id: t.id })}>Edit</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="What each role can do" flush>
        <div className="list">
          {ROLE_INFO.map((r) => <div key={r.role} className="list-item"><span className="badge" style={{ minWidth: 64, justifyContent: 'center' }}>{r.label}</span><div className="small">{r.can}</div></div>)}
        </div>
      </Card>
    </div>
  );
}

function TeamMembersPicker({ team, members, onChange }: { team: { id: string; memberUserIds?: string[] }; members: MemberRow[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const ids: string[] = team.memberUserIds ?? [];
  const toggle = async (userId: string) => {
    const next = ids.includes(userId) ? ids.filter((x) => x !== userId) : [...ids, userId];
    try {
      await api(`/api/entities/${team.id}`, { method: 'PATCH', json: { memberUserIds: next } });
      onChange();
    } catch (err) { errorToast(err); }
  };
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-sm" onClick={() => setOpen((o) => !o)}>Members</button>
      {open && (
        <div className="menu" style={{ right: 0, top: 'calc(100% + 6px)' }} onMouseLeave={() => setOpen(false)}>
          {members.map((m) => (
            <label key={m.userId} className="menu-item" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={ids.includes(m.userId)} onChange={() => void toggle(m.userId)} />{m.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- tokens & integrations ----------------

interface TokenRow { id: string; name: string; prefix: string; scope: 'read' | 'write'; workspaceId: string; workspaceName?: string; createdAt: string; lastUsedAt?: string }
interface ConnectInfo { mcpBridge: string; cli: string; extension: string; mcpTools: string[] }

function Snippet({ title, code, hint }: { title: string; code: string; hint?: ReactNode }) {
  return (
    <div className="snippet">
      <div className="row"><div className="strong small">{title}</div><span className="spacer" /><button className="btn btn-ghost btn-sm" onClick={() => copyText(code, 'Copied')}><Icon name="copy" size={13} />Copy</button></div>
      <pre><code>{code}</code></pre>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

function ConnectTab() {
  const s = useStore();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [info, setInfo] = useState<ConnectInfo | null>(null);
  const [name, setName] = useState('Claude Desktop');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [fresh, setFresh] = useState<string | null>(null);
  const canWrite = can('editor');
  const load = useCallback(() => { api<TokenRow[]>('/api/me/tokens').then(setTokens).catch(errorToast); }, []);
  useEffect(() => { load(); api<ConnectInfo>('/api/connect-info').then(setInfo).catch(() => {}); }, [load]);
  const create = async () => {
    try {
      const r = await api<{ token: string }>('/api/me/tokens', { method: 'POST', json: { name, scope } });
      setFresh(r.token);
      load();
    } catch (err) { errorToast(err); }
  };
  const revoke = async (t: TokenRow) => {
    if (!confirm(`Revoke “${t.name}”? Anything using it stops working.`)) return;
    try { await api(`/api/me/tokens/${t.id}`, { method: 'DELETE' }); load(); } catch (err) { errorToast(err); }
  };
  const origin = location.origin;
  const tok = fresh ?? '<your token>';
  const wsName = s.auth?.current?.name ?? 'this workspace';
  const desktop = JSON.stringify({ mcpServers: { goldthread: { command: 'node', args: [info?.mcpBridge ?? '/path/to/goldthread/mcp/stdio.ts'], env: { GT_URL: origin, GT_TOKEN: tok } } } }, null, 2);
  return (
    <div className="stack">
      <Card title="Personal access tokens" sub={`Tokens let other tools act as you in ${wsName}. They carry your role, capped at read-only or read & write. Create one per tool so you can revoke them separately.`}>
        <form className="invite-form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What will use it?" aria-label="Token name" />
          <Seg options={[{ id: 'read', label: 'Read only' }, ...(canWrite ? [{ id: 'write' as const, label: 'Read & write' }] : [])]} value={scope} onChange={setScope} />
          <button className="btn btn-primary" disabled={!name.trim()}><Icon name="key-round" size={14} />Create token</button>
        </form>
        {fresh && (
          <div className="invite-link mt12">
            <div className="small"><b>Copy your token now</b>: it's shown once. The snippets below already include it.</div>
            <div className="row mt8"><input aria-label="New token" className="input mono" readOnly value={fresh} onFocus={(e) => e.target.select()} /><button className="btn" onClick={() => copyText(fresh, 'Token copied')}><Icon name="copy" size={14} />Copy</button></div>
          </div>
        )}
        {tokens.length > 0 && (
          <div className="list mt12" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            {tokens.map((t) => (
              <div key={t.id} className="list-item" style={{ alignItems: 'center' }}>
                <Icon name="key-round" size={15} className="muted" />
                <div className="grow"><div className="strong">{t.name} <span className="mono small muted">{t.prefix}…</span></div><div className="small muted">{t.scope === 'write' ? 'Read & write' : 'Read only'} · {t.workspaceName} · created {fmtDate(t.createdAt)} · {t.lastUsedAt ? `last used ${relDays(t.lastUsedAt)}` : 'never used'}</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => revoke(t)}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="AI assistants (MCP)" sub="Give Claude Desktop, Claude Code, Cursor, VS Code or any MCP client access to this workspace. It can search, read, prepare meetings, forecast, check specs, and, with a write token, capture and update items.">
        <div className="stack" style={{ gap: 14 }}>
          <Snippet title="Claude Desktop: claude_desktop_config.json" code={desktop} hint="Settings → Developer → Edit config. Restart Claude Desktop afterwards. Needs Node 23.6 or newer on this machine." />
          <Snippet title="Claude Code" code={`claude mcp add --transport http goldthread ${origin}/mcp --header "Authorization: Bearer ${tok}"`} />
          <Snippet title="Any client that speaks Streamable HTTP" code={`URL:    ${origin}/mcp\nHeader: Authorization: Bearer ${tok}`} />
          {info && <div className="small muted">Tools offered: {info.mcpTools.map((t) => <code key={t} style={{ marginRight: 6 }}>{t}</code>)}</div>}
        </div>
      </Card>

      <Card title="Command line, browser and REST">
        <div className="stack" style={{ gap: 14 }}>
          <Snippet title="CLI" code={`export GT_URL=${origin}\nexport GT_TOKEN=${tok}\nnode ${info?.cli ?? 'cli/goldthread.ts'} brief\nnode ${info?.cli ?? 'cli/goldthread.ts'} capture "Service desk can't see MFA status" --account "Service Desk"\nnode ${info?.cli ?? 'cli/goldthread.ts'} lint docs/spec.md   # exits 1 on errors, for CI`} />
          <div className="small"><b>Browser extension.</b> In Chrome open Extensions → Developer mode → Load unpacked, and choose <code>{info?.extension ?? 'extension/'}</code>. Paste the URL and a write token in its options. Then select text on any page → right-click → <i>Send to Goldthread</i>.</div>
          <Snippet title="REST" code={`curl -X POST ${origin}/api/capture \\\n  -H "Authorization: Bearer ${tok}" -H "Content-Type: application/json" \\\n  -d '{"kind":"evidence","text":"VPN drops during Teams calls","source":"support"}'`} />
        </div>
      </Card>
    </div>
  );
}

// ---------------- AI ----------------

interface AiConfig { provider: 'none' | 'anthropic' | 'openai-compatible'; model: string; baseUrl: string; hasKey: boolean; envAnthropicKey: boolean }

const PRESETS: { label: string; baseUrl: string; model: string; needsKey: boolean }[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: '', needsKey: true },
  { label: 'Azure OpenAI', baseUrl: 'https://<resource>.openai.azure.com/openai/v1', model: '', needsKey: true },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: '', needsKey: true },
  { label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', needsKey: false },
  { label: 'LM Studio (local)', baseUrl: 'http://localhost:1234/v1', model: '', needsKey: false },
];

function AiTab() {
  const s = useStore();
  const isAdmin = can('admin');
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<string | null>(null);
  useEffect(() => { if (isAdmin) api<AiConfig>('/api/admin/ai').then(setCfg).catch(errorToast); }, [isAdmin]);

  const status = s.ai.enabled ? `On: ${s.ai.provider === 'anthropic' ? 'Claude' : 'OpenAI-compatible'}${s.ai.model ? ` (${s.ai.model})` : ''}` : 'Off: built-in engines only';
  const intro = (
    <div className="small muted">
      Every analysis in Goldthread works without AI: the spec checks, forecasts, gap detection and briefs are deterministic and explainable.
      Connecting a model adds deeper spec reviews, plain-language answers in Ask, and extraction from meeting notes. Emails, phone numbers and IBANs are masked before anything is sent, and AI only proposes: nothing is saved without your click.
    </div>
  );
  if (!isAdmin) return <Card title="AI">{intro}<div className="mt12"><b>Status:</b> {status}. An admin can change this.</div></Card>;
  if (!cfg) return <Card title="AI"><div className="muted">Loading…</div></Card>;

  const save = async (patch: Partial<AiConfig> & { apiKey?: string | null } = {}) => {
    setBusy(true); setTest(null);
    try {
      const body: Record<string, unknown> = { provider: cfg.provider, model: cfg.model, baseUrl: cfg.baseUrl, ...patch };
      if (key) body.apiKey = key;
      await api('/api/admin/ai', { method: 'PUT', json: body });
      setKey('');
      setCfg(await api<AiConfig>('/api/admin/ai'));
      toast('AI settings saved');
    } catch (err) { errorToast(err); } finally { setBusy(false); }
  };
  const runTest = async () => {
    setBusy(true); setTest(null);
    try {
      const r = await api<{ provider: string; model: string; reported?: string }>('/api/ai/test', { method: 'POST' });
      setTest(`Connected: ${r.provider} answered as “${r.reported || r.model}”.`);
    } catch (err) { setTest(`Didn't work: ${(err as Error).message}`); } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <Card title="AI model" sub={<>Status: {status}</>}>
        {intro}
        <div className="mt16">
          <Row label="Provider">
            <Seg options={[{ id: 'none', label: 'None' }, { id: 'anthropic', label: 'Claude (Anthropic)' }, { id: 'openai-compatible', label: 'OpenAI-compatible' }]} value={cfg.provider} onChange={(p) => setCfg({ ...cfg, provider: p })} />
          </Row>
          {cfg.provider === 'openai-compatible' && (
            <Row label="Endpoint" help="Any server with an OpenAI-style /chat/completions API: OpenAI, Azure, OpenRouter, Mistral, Groq, or a local Ollama / LM Studio / vLLM.">
              <input aria-label="Base URL" className="input mono" value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
              <div className="row-wrap mt8">{PRESETS.map((p) => <button key={p.label} className="btn btn-sm btn-ghost" onClick={() => setCfg({ ...cfg, baseUrl: p.baseUrl, model: p.model || cfg.model })}>{p.label}</button>)}</div>
            </Row>
          )}
          {cfg.provider !== 'none' && (
            <>
              <Row label="Model" help={cfg.provider === 'anthropic' ? 'Leave empty for the default (claude-opus-5-5).' : 'The model name your endpoint expects, e.g. gpt-5 or llama3.1.'}>
                <input aria-label="Model" className="input mono" value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder={cfg.provider === 'anthropic' ? 'claude-opus-5-5' : 'model name'} />
              </Row>
              <Row label="API key" help={cfg.hasKey ? 'A key is saved (encrypted on this server). Type a new one to replace it.' : cfg.provider === 'anthropic' && cfg.envAnthropicKey ? 'Using ANTHROPIC_API_KEY from the server environment. Enter a key to override it for this workspace.' : 'Stored encrypted on this server; never sent back to the browser.'}>
                <div className="row">
                  <input aria-label="API key" className="input mono" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={cfg.hasKey ? '•••••••• saved' : 'paste key'} />
                  {cfg.hasKey && <button className="btn btn-ghost btn-sm" onClick={() => save({ apiKey: null })}>Remove</button>}
                </div>
              </Row>
            </>
          )}
          <div className="row mt12">
            {test && <span className={`small ${test.startsWith('Connected') ? '' : 'err'}`}>{test}</span>}
            <span className="spacer" />
            {s.ai.enabled && <button className="btn" onClick={runTest} disabled={busy}>Test connection</button>}
            <button className="btn btn-primary" onClick={() => save()} disabled={busy}>Save</button>
          </div>
        </div>
      </Card>
      <Card title="Other ways to bring AI in">
        <div className="small">You can also point your own assistant at Goldthread instead: connect Claude Desktop, Claude Code or any MCP client under <a href="#/workspace/settings?tab=connect">Tokens & integrations</a>. That uses your assistant's model and subscription, and Goldthread stays the source of truth.</div>
      </Card>
    </div>
  );
}

// ---------------- data ----------------

function DataTab() {
  const g = useGraph();
  const isAdmin = can('admin');
  const canExport = can('editor');
  const [sample, setSample] = useState<'it' | 'saas' | 'empty'>('it');
  const importFile = async (file: File) => {
    try {
      const dump = JSON.parse(await file.text());
      if (!confirm(`Replace everything in this workspace with ${dump.entities?.length ?? 0} items from ${file.name}?`)) return;
      await api('/api/import', { method: 'POST', json: dump });
      toast('Workspace imported');
    } catch (err) { errorToast(err); }
  };
  const reset = async () => {
    const what = sample === 'empty' ? 'an empty workspace' : sample === 'it' ? 'the IT sample (ServiceHub)' : 'the SaaS sample (Ledgerly)';
    if (!confirm(`Replace everything in “${getState().auth?.current?.name}” with ${what}? This can't be undone: export first if unsure.`)) return;
    try { await api('/api/reset', { method: 'POST', json: { sample } }); toast('Workspace reset'); } catch (err) { errorToast(err); }
  };
  const counts = ENTITIES.map((d) => ({ d, n: g.all(d.type).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  return (
    <div className="stack">
      <Card title="Export & import">
        <div className="row-wrap">
          {canExport && <a className="btn" href="/api/export" download><Icon name="download" size={14} />Export JSON</a>}
          {isAdmin && <label className="btn" style={{ cursor: 'pointer' }}><Icon name="upload" size={14} />Import JSON<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} /></label>}
        </div>
        <div className="small muted mt8">Each workspace is its own SQLite file on the server (<code>data/workspaces/</code>). Accounts and access live in <code>data/system.db</code>.</div>
      </Card>
      {isAdmin && (
        <Card title="Start over">
          <Row label="Replace contents with">
            <Seg options={[{ id: 'it', label: 'IT sample' }, { id: 'saas', label: 'SaaS sample' }, { id: 'empty', label: 'Empty' }]} value={sample} onChange={setSample} />
          </Row>
          <div className="row mt12"><span className="small muted grow">Members, their access and integrations stay as they are. Custom fields and item types are removed with the content.</span><button className="btn btn-danger" onClick={reset}>Replace…</button></div>
        </Card>
      )}
      {canExport && <RecentlyDeleted />}
      <Card title={`What's in here · ${g.byId.size.toLocaleString()} items`}>
        <div className="chips">{counts.map(({ d, n }) => <span key={d.type} className="badge">{d.plural} {n}</span>)}</div>
      </Card>
    </div>
  );
}

function RecentlyDeleted() {
  const [items, setItems] = useState<(Entity & { deletedAt: string })[] | null>(null);
  const load = useCallback(() => { api<(Entity & { deletedAt: string })[]>('/api/trash?limit=40').then(setItems).catch(errorToast); }, []);
  useEffect(load, [load]);
  const restore = async (e: Entity) => {
    try {
      await restoreEntity(e.id);
      toast(`Restored “${nameOf(e)}”`);
      load();
    } catch (err) { errorToast(err); }
  };
  const shown = (items ?? []).filter((e) => e.type !== 'comment');
  return (
    <Card title="Recently deleted" icon="archive-restore" flush sub="Deletes are never final. Bring anything back with its links intact.">
      {items === null ? <div className="empty">Loading…</div> : shown.length === 0 ? <Empty icon="archive-restore">Nothing has been deleted.</Empty> : (
        <div className="list">{shown.map((e) => (
          <div key={e.id} className="list-item" style={{ alignItems: 'center' }}>
            <Icon name={ENTITY_MAP[e.type]?.icon ?? 'circle-dot'} size={15} className="muted" />
            <div className="grow"><div className="strong">{nameOf(e)}</div><div className="small muted">{ENTITY_MAP[e.type]?.label ?? e.type} · deleted {fmtDate(e.deletedAt.slice(0, 10))}</div></div>
            <button className="btn btn-sm" onClick={() => restore(e)}><Icon name="undo-2" size={13} />Restore</button>
          </div>
        ))}</div>
      )}
    </Card>
  );
}
