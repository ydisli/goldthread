import { useMemo } from 'react';
import { DEFAULT_PINS, type Section, type Tool } from '../../nav.ts';
import { now, updateMe, useGraph, useMe } from '../../store.ts';
import { Link } from '../../router.tsx';
import { usePins, useSections } from '../../shell.tsx';
import { Empty, PageHead, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';

function ToolCard({ tool, pinned, onPin, count }: { tool: Tool; pinned: boolean; onPin: () => void; count?: { n: number; alert?: boolean } | null }) {
  return (
    <Link to={tool.to} className="tool-card">
      <Icon name={tool.icon} size={18} className="lead" />
      <div style={{ minWidth: 0, paddingRight: 28 }}>
        <div className="t">{tool.label}{count && <span className={`nav-count ${count.alert ? 'alert' : ''}`} style={{ marginLeft: 8 }}>{count.n}</span>}</div>
        <div className="d">{tool.blurb}</div>
      </div>
      <button
        className="btn btn-ghost btn-sm btn-icon pin-btn"
        title={pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
        aria-label={pinned ? `Unpin ${tool.label}` : `Pin ${tool.label}`}
        aria-pressed={pinned}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(); }}
      >
        <Icon name={pinned ? 'pin-off' : 'pin'} size={14} className={pinned ? '' : 'muted'} />
      </button>
    </Link>
  );
}

function SectionBlock({ section, pins, toggle, counts }: { section: Section; pins: string[]; toggle: (id: string) => void; counts: Map<string, { n: number; alert?: boolean } | null> }) {
  return (
    <div className="col" style={{ gap: 10 }}>
      <div>
        <h2><Link to={`/s/${section.id}`} style={{ color: 'inherit' }}>{section.label}</Link></h2>
        <div className="small muted">{section.blurb}</div>
      </div>
      <div className="tool-grid">
        {section.tools.map((t) => <ToolCard key={t.id} tool={t} pinned={pins.includes(t.id)} onPin={() => toggle(t.id)} count={counts.get(t.id)} />)}
      </div>
    </div>
  );
}

function useToolCounts(sections: Section[]) {
  const g = useGraph();
  return useMemo(() => {
    const today = now();
    const m = new Map<string, { n: number; alert?: boolean } | null>();
    for (const s of sections) for (const t of s.tools) m.set(t.id, t.count ? t.count(g, today) : null);
    return m;
  }, [g, sections]);
}

export function ToolsPage() {
  const [pins, toggle] = usePins();
  const me = useMe();
  const { sections } = useSections();
  const counts = useToolCounts(sections);
  const persona = me?.prefs.persona ?? 'both';
  const reset = (p: 'po' | 'ba' | 'both') => {
    updateMe({ prefs: { persona: p, pinned: DEFAULT_PINS[p] } }).then(() => toast('Sidebar updated')).catch(errorToast);
  };
  return (
    <div className="page">
      <PageHead
        title="All tools"
        sub="Everything Goldthread can do, grouped by the kind of work. Pin the ones you use every week — they show at the top of your sidebar."
        actions={
          <div className="row small muted" style={{ gap: 6 }}>
            Start from
            <button className={`btn btn-sm ${persona === 'po' ? '' : 'btn-ghost'}`} onClick={() => reset('po')}>PO set</button>
            <button className={`btn btn-sm ${persona === 'ba' ? '' : 'btn-ghost'}`} onClick={() => reset('ba')}>BA set</button>
            <button className={`btn btn-sm ${persona === 'both' ? '' : 'btn-ghost'}`} onClick={() => reset('both')}>Mixed</button>
          </div>
        }
      />
      <div className="col" style={{ gap: 32 }}>
        {sections.map((s) => <SectionBlock key={s.id} section={s} pins={pins} toggle={toggle} counts={counts} />)}
      </div>
    </div>
  );
}

export function SectionPage({ id }: { id: string }) {
  const [pins, toggle] = usePins();
  const { sections } = useSections();
  const counts = useToolCounts(sections);
  const section = sections.find((s) => s.id === id);
  if (!section) return <div className="page"><Empty icon="search">No such section. <Link to="/tools">See all tools</Link></Empty></div>;
  return (
    <div className="page">
      <PageHead title={section.label} sub={section.blurb} crumbs={<Link to="/tools">All tools</Link>} />
      <div className="tool-grid">
        {section.tools.map((t) => <ToolCard key={t.id} tool={t} pinned={pins.includes(t.id)} onPin={() => toggle(t.id)} count={counts.get(t.id)} />)}
      </div>
    </div>
  );
}
