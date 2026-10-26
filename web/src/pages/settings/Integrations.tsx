import { useCallback, useEffect, useState } from 'react';
import { api } from '../../store.ts';
import { Card, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { fmtDateTime } from '../../ui/format.ts';

export interface SyncStatus { at: string; created: number; updated: number; defects: number; pushed: number; skipped: number; error?: string; warnings?: string[] }
interface Integration { connected: boolean; config: Record<string, any>; status: { lastSync?: SyncStatus } }
type Kind = 'jira' | 'ado';

interface FieldSpec { key: string; label: string; placeholder?: string; help?: string; kind?: 'text' | 'textarea' | 'secret' | 'check' | 'interval'; advanced?: boolean }

const SPECS: Record<Kind, { title: string; blurb: string; fields: FieldSpec[] }> = {
  jira: {
    title: 'Jira',
    blurb: 'Pull stories and bugs from Jira Cloud on a schedule, and optionally create Jira issues for stories you write here.',
    fields: [
      { key: 'site', label: 'Jira site', placeholder: 'https://your-company.atlassian.net' },
      { key: 'email', label: 'Account email', placeholder: 'you@company.com', help: 'The Atlassian account the API token belongs to. Its permissions decide what syncs.' },
      { key: 'secret', label: 'API token', kind: 'secret', help: 'Create one at id.atlassian.com → Security → API tokens.' },
      { key: 'jql', label: 'Which issues (JQL)', kind: 'textarea', placeholder: 'project = SH AND updated >= -90d ORDER BY updated DESC' },
      { key: 'projectKey', label: 'Project for new issues', placeholder: 'SH' },
      { key: 'push', label: 'Create Jira issues for new stories written here', kind: 'check' },
      { key: 'intervalMinutes', label: 'Sync', kind: 'interval' },
      { key: 'storyPointsField', label: 'Story points field', placeholder: 'customfield_10016', advanced: true },
      { key: 'sprintField', label: 'Sprint field', placeholder: 'customfield_10020', advanced: true },
      { key: 'acceptanceField', label: 'Acceptance criteria field', placeholder: 'customfield_…', advanced: true },
    ],
  },
  ado: {
    title: 'Azure DevOps',
    blurb: 'Pull user stories and bugs from Azure Boards on a schedule, and optionally create work items for stories you write here.',
    fields: [
      { key: 'org', label: 'Organisation', placeholder: 'https://dev.azure.com/your-org' },
      { key: 'project', label: 'Project', placeholder: 'ServiceHub' },
      { key: 'secret', label: 'Personal access token', kind: 'secret', help: 'User settings → Personal access tokens, with Work Items: Read & write.' },
      { key: 'push', label: 'Create work items for new stories written here', kind: 'check' },
      { key: 'intervalMinutes', label: 'Sync', kind: 'interval' },
      { key: 'wiql', label: 'Which work items (WIQL)', kind: 'textarea', placeholder: 'Default: user stories, PBIs, bugs and tasks changed in the last 90 days', advanced: true },
    ],
  },
};

export function syncSummary(s: SyncStatus): string {
  if (s.error) return s.error;
  const parts = [s.created && `${s.created} new`, s.updated && `${s.updated} updated`, s.defects && `${s.defects} defects`, s.pushed && `${s.pushed} sent`].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Up to date';
}

function IntegrationCard({ kind, current, onChange }: { kind: Kind; current: Integration | null; onChange: () => void }) {
  const spec = SPECS[kind];
  const [form, setForm] = useState<Record<string, any>>(() => ({ intervalMinutes: 30, ...(current?.config ?? {}) }));
  const [secret, setSecret] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState<'' | 'save' | 'test' | 'sync'>('');
  const last = current?.status.lastSync;
  const run = async (what: 'save' | 'test' | 'sync', fn: () => Promise<void>) => { setBusy(what); try { await fn(); } catch (err) { errorToast(err); } finally { setBusy(''); onChange(); } };
  const save = () => run('save', async () => {
    await api(`/api/admin/integrations/${kind}`, { method: 'PUT', json: { config: form, secret: secret || undefined } });
    setSecret('');
    toast(`${spec.title} connection saved`);
  });
  const test = () => run('test', async () => { const r = await api<{ message: string }>(`/api/admin/integrations/${kind}/test`, { method: 'POST' }); toast(r.message); });
  const sync = () => run('sync', async () => { const r = await api<SyncStatus>(`/api/integrations/${kind}/sync`, { method: 'POST' }); toast(`${spec.title}: ${syncSummary(r)}`); });
  const disconnect = () => { if (confirm(`Disconnect ${spec.title}? Stories already imported stay.`)) void run('save', async () => { await api(`/api/admin/integrations/${kind}`, { method: 'DELETE' }); setForm({ intervalMinutes: 30 }); }); };

  return (
    <Card title={<span className="row" style={{ gap: 8 }}>{spec.title}{current?.connected && <span className="badge green">Connected</span>}</span>} sub={spec.blurb}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        {spec.fields.filter((f) => !f.advanced || advanced).map((f) => (
          <div key={f.key} className={`field ${f.kind === 'textarea' || f.kind === 'check' ? 'full' : ''}`}>
            {f.kind === 'check' ? (
              <label className="check-row"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />{f.label}</label>
            ) : (
              <>
                <label htmlFor={`${kind}-${f.key}`}>{f.label}</label>
                {f.kind === 'textarea' ? <textarea id={`${kind}-${f.key}`} className="textarea mono" rows={2} value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  : f.kind === 'secret' ? <input id={`${kind}-${f.key}`} className="input" type="password" autoComplete="off" value={secret} placeholder={current?.connected ? 'Saved — paste a new one to replace it' : ''} onChange={(e) => setSecret(e.target.value)} />
                  : f.kind === 'interval' ? (
                    <select id={`${kind}-${f.key}`} className="select" value={form[f.key] ?? 30} onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}>
                      <option value={0}>Only when I click Sync now</option><option value={15}>Every 15 minutes</option><option value={30}>Every 30 minutes</option><option value={60}>Every hour</option><option value={240}>Every 4 hours</option><option value={1440}>Once a day</option>
                    </select>
                  ) : <input id={`${kind}-${f.key}`} className="input" value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
                {f.help && <span className="help">{f.help}</span>}
              </>
            )}
          </div>
        ))}
        <div className="full row-wrap">
          <button type="button" className="btn-link small" onClick={() => setAdvanced((a) => !a)}>{advanced ? 'Hide advanced fields' : 'Advanced fields'}</button>
          <span className="spacer" />
          {current?.connected && <button type="button" className="btn btn-ghost btn-danger" onClick={disconnect}>Disconnect</button>}
          {current?.connected && <button type="button" className="btn" onClick={test} disabled={!!busy}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>}
          {current?.connected && <button type="button" className="btn" onClick={sync} disabled={!!busy}><Icon name="refresh-cw" size={14} />{busy === 'sync' ? 'Syncing…' : 'Sync now'}</button>}
          <button className="btn btn-primary" disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
      {last && (
        <div className={`small mt12 ${last.error ? 'err' : 'muted'}`} role="status">
          Last sync {fmtDateTime(last.at)}: {syncSummary(last)}{last.warnings?.length ? ` · ${last.warnings.join(' ')}` : ''}
        </div>
      )}
    </Card>
  );
}

export function IntegrationsTab() {
  const [all, setAll] = useState<Record<Kind, Integration | null> | null>(null);
  const load = useCallback(() => { api<Record<Kind, Integration | null>>('/api/integrations').then(setAll).catch(errorToast); }, []);
  useEffect(load, [load]);
  if (!all) return null;
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>Your team keeps working in its delivery tool; Throughline keeps the backlog in step for analysis, forecasts and traceability. A sync behaves like re-importing an export: known items are updated by key, and links or notes you made here are kept.</p>
      <IntegrationCard key={`jira-${!!all.jira}`} kind="jira" current={all.jira} onChange={load} />
      <IntegrationCard key={`ado-${!!all.ado}`} kind="ado" current={all.ado} onChange={load} />
    </div>
  );
}
