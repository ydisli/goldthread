import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Entity } from '../../../../core/schema.ts';
import { lint, lintSummary, RULE_LABELS, type LintIssue } from '../../../../core/engines/lint.ts';
import { completeness, completenessScore } from '../../../../core/engines/completeness.ts';
import { reviewSpec, ROLE_INFO, type ReviewRole } from '../../../../core/engines/review.ts';
import { extractRequirements } from '../../../../core/engines/extract.ts';
import { findContradictions } from '../../../../core/engines/contradictions.ts';
import { similar } from '../../../../core/engines/clustering.ts';
import { api, batch, createEntity, updateEntity, useEntity, useGraph, useStore } from '../../store.ts';
import { Link, setQuery, useRoute } from '../../router.tsx';
import { Badge, Card, Dropdown, Empty, Markdown, PageHead, StatusBadge, Tabs, downloadFile, errorToast, toast } from '../../ui/kit.tsx';
import { downloadDocx, printMarkdown } from '../../ui/export.ts';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { EntityTable, EntityHeader } from '../../entity/views.tsx';
import { RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { mergedMessage, saveText } from '../../entity/autosave.ts';

export function SpecsPage() {
  const g = useGraph();
  const glossary = g.all('glossaryTerm');
  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="specs" title="Writing with Spec Studio" steps={[
        <>Write or paste Markdown. Vague words (“fast”, “user-friendly”, “etc.”) are flagged as you type, with a suggestion.</>,
        <>The completeness check lists what a reviewer will ask about: non-functional needs, errors, permissions, data, rollout.</>,
        <>Run the review board to get the questions engineering, QA, security, legal and support would raise: before the meeting.</>,
      ]} />} title="Spec Studio" sub="Write PRDs that engineers, QA, security and support can't poke holes in: live ambiguity linting, completeness checks, a review board of role agents and one-click requirement extraction." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'spec', defaults: { body: TEMPLATE } })}><Icon name="plus" size={14} />New spec</button>} />
      <Card flush>
        <EntityTable type="spec" columns={[
          'title', 'betId', 'status', 'ownerId',
          { key: 'clarity', label: 'Clarity', render: (s) => { const b = s.body ?? ''; const sc = lintSummary(b, lint(b, { glossary })).score; return <Badge tone={sc >= 80 ? 'green' : sc >= 60 ? 'amber' : 'red'}>{sc}</Badge>; } },
          { key: 'complete', label: 'Completeness', render: (s) => { const sc = completenessScore(completeness(s.body ?? '')); return <Badge tone={sc >= 80 ? 'green' : sc >= 60 ? 'amber' : 'red'}>{sc}%</Badge>; } },
          { key: 'open', label: 'Open questions', render: (s) => g.referencing(s.id, 'reviewFinding', 'specId').filter((f) => f.status === 'open').length },
        ]} />
      </Card>
    </div>
  );
}

const TEMPLATE = `# Title

## Problem
Who has the problem, and what does it cost them today?

## Goals
- Metric, baseline → target.

## Non-goals
-

## Users

## Requirements
-

## Experience

## Rollout

## Open questions
-
`;

type Panel = 'quality' | 'review' | 'requirements' | 'preview';

export function SpecPage({ id }: { id: string }) {
  const spec = useEntity(id);
  const g = useGraph();
  const { query } = useRoute();
  const panel = (query.get('tab') ?? 'quality') as Panel;
  const [body, setBody] = useState<string>(spec?.body ?? '');
  const [saved, setSaved] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [focus, setFocus] = useState<LintIssue | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lastRemote = useRef(spec?.body ?? '');
  const bodyRef = useRef(body);
  bodyRef.current = body;

  // Pick up remote edits (another tab/device) when we have no local changes.
  useEffect(() => {
    if (spec && spec.body !== lastRemote.current && saved === 'saved') { setBody(spec.body ?? ''); lastRemote.current = spec.body ?? ''; }
  }, [spec?.body]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!spec || body === (spec.body ?? '')) return;
    setSaved('dirty');
    const t = setTimeout(async () => {
      setSaved('saving');
      try {
        const r = await saveText(spec.id, 'body', lastRemote.current, body);
        lastRemote.current = r.saved;
        if (r.merged) {
          if (bodyRef.current === body) setBody(r.saved);
          toast(mergedMessage(r.merged, 'spec'), r.merged.conflicts ? 'error' : 'info');
        }
        setSaved(bodyRef.current === body || bodyRef.current === r.saved ? 'saved' : 'dirty');
      } catch (err) { errorToast(err); setSaved('dirty'); }
    }, 900);
    return () => clearTimeout(t);
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  const glossary = g.all('glossaryTerm');
  const issues = useMemo(() => lint(body, { glossary }), [body, glossary]);
  const summary = lintSummary(body, issues);
  const comp = useMemo(() => completeness(body), [body]);
  const compScore = completenessScore(comp);

  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(560, ta.scrollHeight)}px`;
  }, [body]);

  if (!spec) return <div className="page"><Empty>Spec not found. <Link to="/define/specs">All specs</Link></Empty></div>;

  const jump = (i: LintIssue) => {
    setFocus(i);
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(i.start, i.end);
    const lineHeight = 13 * 1.65;
    const top = ta.getBoundingClientRect().top + window.scrollY + (i.line - 3) * lineHeight;
    document.querySelector('main')?.scrollTo({ top: Math.max(0, top - 200), behavior: 'smooth' });
  };

  return (
    <div className="page page-wide">
      <EntityHeader e={spec} sub={<span className="row-wrap">{spec.betId && <>Bet <RefChip id={spec.betId} /></>}<span className="muted small">{saved === 'saved' ? 'All changes saved' : saved === 'saving' ? 'Saving…' : 'Unsaved changes'}</span></span>}
        actions={<>
          <Link className="btn" to={`/workspace/docs?kind=prd&subject=${spec.id}`}><Icon name="file-text" size={14} />PRD</Link>
          <Dropdown align="right" width={220} trigger={(toggle) => <button className="btn" onClick={toggle}><Icon name="download" size={14} />Export</button>}>
            {(close) => <>
              <button className="menu-item" onClick={() => { downloadDocx(spec.title, body); close(); }}><Icon name="file-text" size={14} />Word document</button>
              <button className="menu-item" onClick={() => { printMarkdown(spec.title, body); close(); }}><Icon name="file-text" size={14} />Print or save as PDF</button>
              <button className="menu-item" onClick={() => { downloadFile(`${spec.title}.md`, body); close(); }}><Icon name="download" size={14} />Markdown</button>
            </>}
          </Dropdown>
          <button className="btn" onClick={() => openEditor({ type: 'approval', defaults: { title: `Approve ${spec.title}`, subjectId: spec.id, requestedById: g.me?.id, approvers: [] } })}><Icon name="clipboard-check" size={14} />Request approval</button>
        </>}
      />
      <div className="grid spec-grid">
        <div className="editor">
          <pre className="editor-backdrop" aria-hidden="true">{renderMarks(body, issues, focus)}</pre>
          <textarea ref={taRef} className="editor-text" value={body} spellCheck onChange={(e) => setBody(e.target.value)} aria-label="Spec body (Markdown)" />
        </div>
        <div className="spec-side">
          <div className="grid g2 mb12">
            <div className="card stat"><div className="stat-label">Clarity</div><div className="stat-value" style={{ color: summary.score >= 80 ? 'var(--green)' : summary.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{summary.score}</div><div className="stat-sub">{summary.errors} errors · {summary.warnings} warnings · {summary.words} words</div></div>
            <div className="card stat"><div className="stat-label">Completeness</div><div className="stat-value" style={{ color: compScore >= 80 ? 'var(--green)' : compScore >= 60 ? 'var(--amber)' : 'var(--red)' }}>{compScore}%</div><div className="stat-sub">{comp.filter((c) => c.relevant && !c.covered).length} relevant topics missing</div></div>
          </div>
          <div className="card">
            <div style={{ padding: '0 12px' }}>
              <Tabs value={panel} onChange={(t) => setQuery({ tab: t })} tabs={[
                { id: 'quality', label: 'Quality', count: issues.filter((i) => i.severity !== 'info').length },
                { id: 'review', label: 'Review board', count: g.referencing(spec.id, 'reviewFinding', 'specId').filter((f) => f.status === 'open').length },
                { id: 'requirements', label: 'Requirements' },
                { id: 'preview', label: 'Preview' },
              ]} />
            </div>
            <div style={{ maxHeight: 'calc(100vh - 290px)', overflowY: 'auto', padding: '0 12px 12px' }}>
              {panel === 'quality' && <QualityPanel issues={issues} comp={comp} onJump={jump} />}
              {panel === 'review' && <ReviewPanel spec={spec} body={body} />}
              {panel === 'requirements' && <RequirementsPanel spec={spec} body={body} />}
              {panel === 'preview' && <Markdown text={body} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderMarks(text: string, issues: LintIssue[], focus: LintIssue | null) {
  const out: ReactNode[] = [];
  let pos = 0;
  const sorted = [...issues].sort((a, b) => a.start - b.start);
  sorted.forEach((i, k) => {
    if (i.start < pos) return;
    out.push(text.slice(pos, i.start));
    const isFocus = focus && focus.start === i.start && focus.rule === i.rule;
    out.push(<mark key={k} className={`${i.severity}${isFocus ? ' focus' : ''}`}>{text.slice(i.start, i.end)}</mark>);
    pos = i.end;
  });
  out.push(text.slice(pos));
  out.push('\n');
  return out;
}

function QualityPanel({ issues, comp, onJump }: { issues: LintIssue[]; comp: ReturnType<typeof completeness>; onJump: (i: LintIssue) => void }) {
  const [showInfo, setShowInfo] = useState(false);
  const visible = issues.filter((i) => showInfo || i.severity !== 'info');
  const missing = comp.filter((c) => c.relevant && !c.covered);
  return (
    <div className="col" style={{ gap: 14 }}>
      <div>
        <div className="row mb8"><span className="label">Ambiguity & testability</span><span className="spacer" /><label className="check small"><input type="checkbox" checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)} />show hints ({issues.filter((i) => i.severity === 'info').length})</label></div>
        {visible.length === 0 ? <div className="small muted">No issues found. Nice.</div> : (
          <div className="col" style={{ gap: 6 }}>
            {visible.map((i, k) => (
              <button key={k} className="card pad" style={{ textAlign: 'left', cursor: 'pointer', padding: '8px 10px' }} onClick={() => onJump(i)}>
                <div className="row"><Badge tone={i.severity === 'error' ? 'red' : i.severity === 'warning' ? 'amber' : 'blue'}>{RULE_LABELS[i.rule] ?? i.rule}</Badge><span className="small muted">line {i.line}</span></div>
                <div className="small mt8">{i.message}</div>
                {i.suggestion && <div className="small muted">{i.suggestion}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="label mb8">Commonly forgotten topics</div>
        <div className="col" style={{ gap: 6 }}>
          {missing.map((c) => (
            <div key={c.id} className="row small" style={{ alignItems: 'flex-start' }}>
              <Icon name="circle-alert" size={14} className="err" />
              <div><strong>{c.label}</strong>: {c.question}{c.triggeredBy.length > 0 && <span className="muted"> (because the spec mentions {c.triggeredBy.slice(0, 3).join(', ')})</span>}</div>
            </div>
          ))}
          {comp.filter((c) => c.relevant && c.covered).map((c) => <div key={c.id} className="row small muted"><Icon name="circle-check" size={14} />{c.label}</div>)}
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ spec, body }: { spec: Entity; body: string }) {
  const g = useGraph();
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const findings = g.referencing(spec.id, 'reviewFinding', 'specId').sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || ['critical', 'major', 'minor', 'info'].indexOf(a.severity) - ['critical', 'major', 'minor', 'info'].indexOf(b.severity));
  const run = async () => {
    const qs = reviewSpec(body);
    const existing = new Set(findings.map((f) => f.title));
    const fresh = qs.filter((q) => !existing.has(q.title));
    if (!fresh.length) { toast('No new questions: the board is satisfied with what changed'); return; }
    try {
      await batch(fresh.map((q) => ({ op: 'create' as const, type: 'reviewFinding', data: { specId: spec.id, role: q.role, severity: q.severity, title: q.title, detail: q.detail, anchor: q.anchor, status: 'open', source: 'engine' } })));
      toast(`${fresh.length} new review questions`);
    } catch (err) { errorToast(err); }
  };
  const runClaude = async () => {
    setBusy(true);
    try {
      const out = await api<{ findings: { role: string; severity: string; title: string; detail: string; anchor?: string }[] }>('/api/ai/review', { method: 'POST', json: { specId: spec.id, body } });
      const existing = new Set(findings.map((f) => f.title.toLowerCase()));
      const fresh = out.findings.filter((f) => !existing.has(f.title.toLowerCase()));
      if (fresh.length) await batch(fresh.map((q) => ({ op: 'create' as const, type: 'reviewFinding', data: { specId: spec.id, ...q, status: 'open', source: 'claude' } })));
      toast(`Claude reviewers raised ${fresh.length} new questions`);
    } catch (err) { errorToast(err); } finally { setBusy(false); }
  };
  const resolve = async (f: Entity, status: string) => {
    const resolution = prompt(status === 'resolved' ? 'How was it resolved?' : 'Why will this not be addressed?') ?? undefined;
    if (!resolution) return;
    try { await updateEntity(f.id, { status, resolution }); } catch (err) { errorToast(err); }
  };
  const convert = (f: Entity) => openEditor({
    type: 'requirement', defaults: { title: f.title.replace(/\?$/, ''), statement: '', specId: spec.id, betId: spec.betId, rationale: `Raised by the ${f.role} reviewer: ${f.detail ?? ''}`, status: 'draft' },
    onSaved: (r) => void updateEntity(f.id, { status: 'converted', resolution: `Converted to ${r.key}` }),
  });
  const byRole = new Map<string, Entity[]>();
  for (const f of findings) byRole.set(f.role, [...(byRole.get(f.role) ?? []), f]);
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="small muted">Ten reviewer roles read the spec and ask what they would ask in refinement. Answer here, answers become requirements or decisions, so the meeting is spent on judgement, not discovery.</div>
      <div className="row-wrap">
        <button className="btn btn-primary btn-sm" onClick={run}><Icon name="bot" size={13} />Run review board</button>
        {store.ai.enabled && <button className="btn btn-sm" onClick={runClaude} disabled={busy}><Icon name="sparkles" size={13} />{busy ? 'Claude is reading…' : 'Deep review with Claude'}</button>}
      </div>
      {findings.length === 0 && <div className="empty">No review yet. Run the board.</div>}
      {[...byRole.entries()].map(([role, list]) => (
        <div key={role}>
          <div className="row mb8"><span className="strong small">{ROLE_INFO[role as ReviewRole]?.name ?? role}</span><span className="small muted ellipsis">{ROLE_INFO[role as ReviewRole]?.focus}</span></div>
          <div className="col" style={{ gap: 6 }}>
            {list.map((f) => (
              <div key={f.id} className="card" style={{ padding: '8px 10px', opacity: f.status === 'open' ? 1 : 0.6 }}>
                <div className="row"><Badge tone={f.severity === 'critical' ? 'red' : f.severity === 'major' ? 'amber' : ''}>{f.severity}</Badge><span className="strong small grow">{f.title}</span>{f.source === 'claude' && <Badge tone="violet">Claude</Badge>}{f.status !== 'open' && <StatusBadge value={f.status} />}</div>
                {f.detail && <div className="small mt8">{f.detail}</div>}
                {f.anchor && <div className="small muted mt8" style={{ borderLeft: '2px solid var(--border-strong)', paddingLeft: 8 }}>{f.anchor}</div>}
                {f.resolution && <div className="small mt8"><strong>Answer:</strong> {f.resolution}</div>}
                {f.status === 'open' && (
                  <div className="row mt8">
                    <button className="btn btn-sm" onClick={() => resolve(f, 'resolved')}>Answer</button>
                    <button className="btn btn-sm" onClick={() => convert(f)}>→ Requirement</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => resolve(f, 'wont-fix')}>Won't fix</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RequirementsPanel({ spec, body }: { spec: Entity; body: string }) {
  const g = useGraph();
  const linked = g.referencing(spec.id, 'requirement', 'specId');
  const candidates = extractRequirements(body).map((c) => ({ ...c, match: similar(c.statement, linked, 'statement', 1)[0] }));
  const fresh = candidates.filter((c) => !c.match || c.match.similarity < 0.55);
  const contradictions = findContradictions([...linked, ...g.all('requirement').filter((r) => r.betId === spec.betId && r.specId !== spec.id)]);
  const createAll = async () => {
    try {
      await batch(fresh.map((c) => ({ op: 'create' as const, type: 'requirement', data: { title: c.title, statement: c.statement, specId: spec.id, betId: spec.betId, status: 'draft', kind: /shall be|within|p95|up to|seconds/i.test(c.statement) ? 'non-functional' : 'functional' } })));
      toast(`${fresh.length} requirements created`);
    } catch (err) { errorToast(err); }
  };
  return (
    <div className="col" style={{ gap: 14 }}>
      <div>
        <div className="row mb8"><span className="label">Found in the text · {candidates.length}</span><span className="spacer" />{fresh.length > 0 && <button className="btn btn-sm btn-primary" onClick={createAll}>Create {fresh.length} new</button>}</div>
        <div className="col" style={{ gap: 6 }}>
          {candidates.map((c, i) => (
            <div key={i} className="small row" style={{ alignItems: 'flex-start' }}>
              <Icon name={c.match && c.match.similarity >= 0.55 ? 'circle-check' : 'circle-dot'} size={14} className="muted" />
              <div className="grow">{c.statement}{c.match && c.match.similarity >= 0.55 && <div className="muted">already managed as <RefChip e={c.match.entity} /></div>}</div>
            </div>
          ))}
          {!candidates.length && <span className="small muted">Write bullets under “Requirements”, or sentences with “shall/must”.</span>}
        </div>
      </div>
      <div>
        <div className="label mb8">Contradictions · {contradictions.length}</div>
        {contradictions.length === 0 ? <span className="small muted">None detected.</span> : contradictions.map((c, i) => (
          <div key={i} className="card" style={{ padding: '8px 10px', marginBottom: 6 }}>
            <div className="row"><Badge tone="red">{c.kind}</Badge><span className="small">{c.reason}</span></div>
            <div className="chips mt8"><RefChip id={c.aId} /><span className="muted">vs</span><RefChip id={c.bId} /></div>
          </div>
        ))}
      </div>
      <div>
        <div className="row mb8"><span className="label">Managed requirements · {linked.length}</span><span className="spacer" /><Link to="/define/requirements" className="small">Open requirements →</Link></div>
        <div className="col" style={{ gap: 4 }}>{linked.map((r) => <Link key={r.id} to={hrefOf(r)} className="row small" style={{ color: 'inherit' }}><span className="key">{r.key}</span><span className="grow ellipsis">{r.title}</span><StatusBadge value={r.status} /></Link>)}</div>
      </div>
      <button className="btn btn-sm" onClick={() => void createEntity('requirement', { title: 'New requirement', specId: spec.id, betId: spec.betId, status: 'draft' }).then((r) => openEditor({ type: 'requirement', id: r.id }))}><Icon name="plus" size={13} />Add requirement manually</button>
    </div>
  );
}
