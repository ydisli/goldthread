import { useMemo, useState } from 'react';
import { parseCsv, planIssueImport, storiesToCsv } from '../../../../core/engines/importers.ts';
import { batch, getGraph, useGraph, type BatchOp } from '../../store.ts';
import { Badge, Drawer, downloadFile, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { humanize } from '../../ui/format.ts';

const SOURCE_LABEL = { jira: 'Jira', ado: 'Azure DevOps', generic: 'CSV' } as const;

/** Import a Jira / Azure DevOps CSV export into the backlog. Re-imports update by key. */
export function ImportIssuesDrawer({ onClose }: { onClose: () => void }) {
  const g = useGraph();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [bugs, setBugs] = useState(true);
  const [busy, setBusy] = useState(false);
  const plan = useMemo(() => (text.trim() ? planIssueImport(parseCsv(text), [...g.all('story'), ...g.all('defect')], { bugsAsDefects: bugs }) : null), [text, g, bugs]);
  const total = plan ? plan.creates.length + plan.updates.length + (bugs ? plan.defects.length + plan.defectUpdates.length : 0) : 0;

  const run = async () => {
    if (!plan) return;
    const ops: BatchOp[] = [
      ...plan.creates.map((data) => ({ op: 'create' as const, type: 'story', data })),
      ...plan.updates.map((u) => ({ op: 'update' as const, id: u.id, data: u.data })),
      ...(bugs ? plan.defects.map((data) => ({ op: 'create' as const, type: 'defect', data })) : []),
      ...(bugs ? plan.defectUpdates.map((u) => ({ op: 'update' as const, id: u.id, data: u.data })) : []),
    ];
    setBusy(true);
    try {
      for (let i = 0; i < ops.length; i += 500) await batch(ops.slice(i, i + 500));
      toast(`Imported from ${SOURCE_LABEL[plan.source]}: ${plan.creates.length} new, ${plan.updates.length} updated${bugs && plan.defects.length ? `, ${plan.defects.length} defects` : ''}`);
      onClose();
    } catch (err) { errorToast(err); } finally { setBusy(false); }
  };

  return (
    <Drawer
      title="Import from Jira or Azure DevOps"
      width={640}
      onClose={onClose}
      footer={<><span className="small muted">{plan ? `${total} changes` : 'Nothing to import yet'}</span><span className="spacer" /><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!total || busy} onClick={run}>{busy ? 'Importing…' : `Import ${total || ''}`}</button></>}
    >
      <div className="stack">
        <div className="small muted">
          <p style={{ marginTop: 0 }}><strong>Jira:</strong> run a filter, then <em>Export → Export CSV (all fields)</em>. <strong>Azure DevOps:</strong> open a query, then <em>⋯ → Export to CSV</em>.</p>
          <p style={{ marginBottom: 0 }}>Stories come in with points, sprint, labels and acceptance criteria. Done items keep their resolved date, which feeds the forecast. Importing the same export again updates stories by key and leaves your links and notes alone.</p>
        </div>
        <div className="row-wrap">
          <label className="btn" style={{ cursor: 'pointer' }}>
            <Icon name="file-up" size={14} />Choose CSV file
            <input type="file" accept=".csv,text/csv,text/tab-separated-values" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setFileName(f.name); setText(await f.text()); } }} />
          </label>
          {fileName && <span className="small muted">{fileName}</span>}
          <span className="spacer" />
          <label className="row small"><input type="checkbox" checked={bugs} onChange={(e) => setBugs(e.target.checked)} />Import bugs as defects</label>
        </div>
        <textarea className="textarea mono" rows={6} value={text} onChange={(e) => { setText(e.target.value); setFileName(''); }} placeholder={'…or paste the CSV here.\nSummary,Issue key,Issue Type,Status,Custom field (Story Points),Sprint'} />
        {plan && (
          <>
            <div className="row-wrap">
              <Badge tone="blue">{SOURCE_LABEL[plan.source]} export</Badge>
              <Badge tone="green">{plan.creates.length} new stories</Badge>
              <Badge>{plan.updates.length} updates</Badge>
              {bugs && plan.defects.length > 0 && <Badge tone="amber">{plan.defects.length} defects</Badge>}
              {plan.skipped.map((s) => <Badge key={s.reason}>{s.count} skipped: {s.reason}</Badge>)}
            </div>
            {plan.warnings.map((w) => <div key={w} className="readonly-note"><Icon name="triangle-alert" size={14} />{w}</div>)}
            <div>
              <div className="eyebrow mb8">Column mapping</div>
              <div className="chips">{Object.entries(plan.mapped).map(([k, v]) => <span key={k} className="badge">{humanize(k)} ← {v}</span>)}</div>
            </div>
            {plan.creates.length + plan.updates.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Key</th><th>Story</th><th>Status</th><th>Points</th><th /></tr></thead>
                  <tbody>
                    {plan.updates.slice(0, 5).map((u) => <tr key={u.id}><td className="mono small nowrap">{u.key}</td><td>{String(u.data.title ?? getGraph().get(u.id)?.title)}</td><td className="nowrap">{String(u.data.status ?? '—')}</td><td>{String(u.data.estimate ?? '')}</td><td><Badge>update</Badge></td></tr>)}
                    {plan.creates.slice(0, 8).map((c, i) => <tr key={i}><td className="mono small nowrap">{String(c.externalKey ?? '—')}</td><td>{String(c.title)}</td><td className="nowrap">{String(c.status)}</td><td>{String(c.estimate ?? '')}</td><td><Badge tone="green">new</Badge></td></tr>)}
                  </tbody>
                </table>
                {plan.creates.length > 8 && <div className="small muted mt8">…and {plan.creates.length - 8} more.</div>}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

/** Open stories as a CSV Jira or Azure DevOps can import. */
export function exportStoriesCsv(onlyNew: boolean) {
  const stories = getGraph().all('story').filter((s) => s.status !== 'done' && (!onlyNew || !s.externalKey));
  if (!stories.length) { toast(onlyNew ? 'Every open story already has a Jira / ADO key' : 'No open stories to export'); return; }
  downloadFile(`stories-${new Date().toISOString().slice(0, 10)}.csv`, storiesToCsv(stories), 'text/csv');
  toast(`Exported ${stories.length} stories`);
}
