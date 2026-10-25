import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { acceptInvite, api, demoLogin, login, logout, signup, useStore, type Persona, type Role } from '../../store.ts';
import { navigate } from '../../router.tsx';
import { Avatar, Seg } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';

const ROLE_HINT: Record<Role, string> = {
  owner: 'full control',
  admin: 'manages people & settings',
  editor: 'can edit',
  viewer: 'read & comment',
};

function errText(err: unknown) {
  const e = err as { message?: string; errors?: string[] };
  return e.errors?.join(' · ') ?? e.message ?? 'Something went wrong.';
}

function Brand({ children }: { children?: ReactNode }) {
  return (
    <aside className="auth-brand">
      <div className="row" style={{ gap: 10 }}>
        <span className="ws-mark" style={{ background: 'var(--on-ink)', color: 'var(--ink)' }}>T</span>
        <span style={{ fontWeight: 650, fontSize: 15, letterSpacing: '-0.01em' }}>Throughline</span>
      </div>
      <div className="col" style={{ gap: 18 }}>
        <h1>The working notebook for product owners and business analysts.</h1>
        <p>Stakeholders, specs, decisions and delivery in one place — linked, so a change in one shows up everywhere it matters.</p>
        {children}
      </div>
      <ul className="auth-points">
        <li><Icon name="check" size={15} />Know who to talk to today, and what you promised them</li>
        <li><Icon name="check" size={15} />Specs that flag vague wording, gaps and contradictions as you type</li>
        <li><Icon name="check" size={15} />Process models you draw by dragging, in horizontal or vertical lanes</li>
        <li><Icon name="check" size={15} />Works with Claude, other AI models, and any MCP-capable assistant</li>
      </ul>
    </aside>
  );
}

export function AuthScreen() {
  const s = useStore();
  const auth = s.auth;
  const [mode, setMode] = useState<'signin' | 'signup'>(auth?.firstRun && !auth.demo.length ? 'signup' : 'signin');
  const canSignup = auth?.signup !== 'invite-only';
  return (
    <div className="auth">
      <Brand />
      <section className="auth-panel">
        <div className="auth-card col" style={{ gap: 20 }}>
          {canSignup && (
            <Seg options={[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'Create account' }]} value={mode} onChange={setMode} />
          )}
          {mode === 'signin' || !canSignup ? <SignIn /> : <SignUp />}
          {!!auth?.demo.length && <DemoAccounts accounts={auth.demo} />}
          {!canSignup && <p className="small muted">New here? This server is invite-only — ask a workspace admin for an invite link.</p>}
        </div>
      </section>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); } catch (err) { setError(errText(err)); setBusy(false); }
  };
  return (
    <form className="col" style={{ gap: 14 }} onSubmit={submit}>
      <div>
        <h2 style={{ fontSize: 20 }}>Welcome back</h2>
        <div className="small muted">Sign in to your workspaces.</div>
      </div>
      <div className="field"><label htmlFor="si-email">Email</label><input id="si-email" className="input" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="si-pw">Password</label><input id="si-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <div className="err">{error}</div>}
      <button className="btn btn-primary btn-lg" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

const SAMPLES: { id: 'it' | 'saas' | 'empty'; label: string; hint: string }[] = [
  { id: 'it', label: 'IT sample', hint: 'ServiceHub — an internal IT platform: SSO, access requests, ITSM migration. Explore every tool with realistic data.' },
  { id: 'saas', label: 'SaaS sample', hint: 'Ledgerly — a B2B payments product. Good if you work on a customer-facing product.' },
  { id: 'empty', label: 'Blank', hint: 'Start clean. You can load a sample later from Settings.' },
];

function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [persona, setPersona] = useState<Persona>('po');
  const [sample, setSample] = useState<'it' | 'saas' | 'empty'>('it');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await signup({ name, email, password, persona, sample }); } catch (err) { setError(errText(err)); setBusy(false); }
  };
  return (
    <form className="col" style={{ gap: 14 }} onSubmit={submit}>
      <div>
        <h2 style={{ fontSize: 20 }}>Create your account</h2>
        <div className="small muted">You get a personal workspace. Invite your team whenever you are ready.</div>
      </div>
      <div className="field"><label htmlFor="su-name">Your name</label><input id="su-name" className="input" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="su-email">Work email</label><input id="su-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field">
        <label htmlFor="su-pw">Password</label>
        <input id="su-pw" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <span className="help">At least 10 characters.</span>
      </div>
      <div className="field">
        <label>I mostly work as</label>
        <Seg options={[{ id: 'po', label: 'Product owner' }, { id: 'ba', label: 'Business analyst' }, { id: 'both', label: 'A bit of both' }]} value={persona} onChange={setPersona} />
        <span className="help">This only picks your starting sidebar. Every tool stays available.</span>
      </div>
      <div className="field">
        <label>Start with</label>
        <Seg options={SAMPLES.map((x) => ({ id: x.id, label: x.label }))} value={sample} onChange={setSample} />
        <span className="help">{SAMPLES.find((x) => x.id === sample)!.hint}</span>
      </div>
      {error && <div className="err">{error}</div>}
      <button className="btn btn-primary btn-lg" disabled={busy || !name || !email || password.length < 10}>{busy ? 'Setting up…' : 'Create account'}</button>
    </form>
  );
}

function DemoAccounts({ accounts }: { accounts: { id: string; name: string; title?: string; role: Role }[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const go = async (id: string) => {
    setBusy(id); setError('');
    try { await demoLogin(id); } catch (err) { setError(errText(err)); setBusy(null); }
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="small" style={{ fontWeight: 600 }}>Or look around as someone on the demo team</span>
        <span className="spacer" style={{ height: 1, background: 'var(--border)' }} />
      </div>
      <div className="demo-list">
        {accounts.map((a) => (
          <button key={a.id} onClick={() => go(a.id)} disabled={!!busy}>
            <Avatar name={a.name} size="sm" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 560, fontSize: 13 }}>{a.name}</div>
              <div className="small muted ellipsis">{a.title}</div>
            </span>
            <span className="small muted">{busy === a.id ? 'Opening…' : `${a.role} · ${ROLE_HINT[a.role]}`}</span>
          </button>
        ))}
      </div>
      {error && <div className="err">{error}</div>}
      <div className="small muted">Each role sees the same data with different rights — try a viewer to see what read-only looks like.</div>
    </div>
  );
}

// ---------------- invite links ----------------

interface InviteInfo { workspaceName: string; email: string; role: Role; invitedBy?: string; accountExists: boolean; signedInAs: string | null }

export function JoinScreen({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [persona, setPersona] = useState<Persona>('both');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api<InviteInfo>(`/api/invites/${encodeURIComponent(token)}`).then(setInfo).catch((err) => setLoadError(errText(err)));
  }, [token]);

  const accept = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await acceptInvite(token, { name, password, persona });
      navigate('/today', { replace: true });
    } catch (err) { setError(errText(err)); setBusy(false); }
  };

  const signedInOther = info?.signedInAs && info.signedInAs !== info.email;
  return (
    <div className="auth">
      <Brand />
      <section className="auth-panel">
        <div className="auth-card col" style={{ gap: 16 }}>
          {loadError && (
            <>
              <h2 style={{ fontSize: 20 }}>This invite can't be used</h2>
              <p className="muted">{loadError}</p>
              <button className="btn" onClick={() => navigate('/today', { replace: true })}>Go to sign in</button>
            </>
          )}
          {!info && !loadError && <div className="muted">Checking your invite…</div>}
          {info && (
            <form className="col" style={{ gap: 14 }} onSubmit={accept}>
              <div>
                <div className="eyebrow">You're invited</div>
                <h2 style={{ fontSize: 22 }}>Join {info.workspaceName}</h2>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {info.invitedBy ? `${info.invitedBy} invited ` : 'Invite for '}<b>{info.email}</b> as <b>{info.role}</b> — {ROLE_HINT[info.role]}.
                </div>
              </div>
              {signedInOther ? (
                <>
                  <p className="small">You're signed in as <b>{info.signedInAs}</b>. Sign out to accept this invite with {info.email}.</p>
                  <button type="button" className="btn" onClick={() => void logout()}>Sign out</button>
                </>
              ) : info.signedInAs ? (
                <p className="small muted">You're signed in as {info.signedInAs}. Accepting adds this workspace to your switcher.</p>
              ) : info.accountExists ? (
                <div className="field"><label htmlFor="j-pw">Your password</label><input id="j-pw" className="input" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /><span className="help">You already have an account with this email.</span></div>
              ) : (
                <>
                  <div className="field"><label htmlFor="j-name">Your name</label><input id="j-name" className="input" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="field"><label htmlFor="j-pw">Choose a password</label><input id="j-pw" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><span className="help">At least 10 characters.</span></div>
                  <div className="field"><label>I mostly work as</label><Seg options={[{ id: 'po', label: 'Product owner' }, { id: 'ba', label: 'Business analyst' }, { id: 'both', label: 'Both' }]} value={persona} onChange={setPersona} /></div>
                </>
              )}
              {error && <div className="err">{error}</div>}
              {!signedInOther && <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Joining…' : `Join ${info.workspaceName}`}</button>}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
