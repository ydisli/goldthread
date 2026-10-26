import { useState, type ReactNode, type MouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';

// ---------------- tooltip ----------------

export function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const show = (e: MouseEvent | RPointerEvent, content: ReactNode) => setTip({ x: e.clientX, y: e.clientY, content });
  const hide = () => setTip(null);
  const node = tip ? createPortal(
    <div className="tooltip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 290), top: Math.min(tip.y + 14, window.innerHeight - 120) }}>{tip.content}</div>,
    document.body,
  ) : null;
  return { show, hide, node };
}

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

export function Legend({ items }: { items: { label: string; color: string; shape?: 'dot' | 'line' }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          {i.shape === 'line' ? <span style={{ width: 14, height: 2, background: i.color, display: 'inline-block', borderRadius: 1 }} /> : <span className="swatch" style={{ background: i.color, borderRadius: i.shape === 'dot' ? '50%' : 3 }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

const niceTicks = (min: number, max: number, count = 5): number[] => {
  if (max === min) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? step0;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
};

const compact = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}K` : String(Math.round(v * 100) / 100));

// ---------------- quadrant scatter (power/interest, assumption map) ----------------

export interface QPoint { id: string; x: number; y: number; label: string; color: string; r?: number; tip: ReactNode }

/**
 * Scatter on a discrete 1–5 grid split into four labelled quadrants. Points
 * sharing a cell are fanned out so none hide each other.
 */
export function QuadrantScatter({ points, xLabel, yLabel, quadrants, min = 1, max = 5, split = 3.5, onClick, height = 420, labels = true }: {
  points: QPoint[]; xLabel: string; yLabel: string; quadrants: [string, string, string, string]; min?: number; max?: number; split?: number;
  onClick?: (id: string) => void; height?: number; labels?: boolean;
}) {
  const tt = useTooltip();
  const W = 640, H = height, m = { l: 44, r: 16, t: 16, b: 40 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const sx = (v: number) => m.l + ((v - (min - 0.5)) / (max - min + 1)) * pw;
  const sy = (v: number) => m.t + ph - ((v - (min - 0.5)) / (max - min + 1)) * ph;
  const cells = new Map<string, QPoint[]>();
  for (const p of points) {
    const k = `${p.x}|${p.y}`;
    cells.set(k, [...(cells.get(k) ?? []), p]);
  }
  const placed: (QPoint & { px: number; py: number })[] = [];
  for (const list of cells.values()) {
    list.forEach((p, i) => {
      const n = list.length;
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rad = n === 1 ? 0 : Math.min(26, 10 + n * 4);
      placed.push({ ...p, px: sx(p.x) + Math.cos(ang) * rad, py: sy(p.y) + Math.sin(ang) * rad });
    });
  }
  const ticks: number[] = [];
  for (let v = min; v <= max; v++) ticks.push(v);
  const qx = sx(split), qy = sy(split);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} by ${xLabel}`}>
        <rect x={qx} y={m.t} width={m.l + pw - qx} height={qy - m.t} fill="var(--accent-soft)" opacity={0.55} />
        {ticks.map((t) => <line key={`gx${t}`} className="grid-line" x1={sx(t)} x2={sx(t)} y1={m.t} y2={m.t + ph} />)}
        {ticks.map((t) => <line key={`gy${t}`} className="grid-line" y1={sy(t)} y2={sy(t)} x1={m.l} x2={m.l + pw} />)}
        <line className="axis-line" x1={qx} x2={qx} y1={m.t} y2={m.t + ph} strokeDasharray="0" />
        <line className="axis-line" y1={qy} y2={qy} x1={m.l} x2={m.l + pw} />
        {ticks.map((t) => <text key={`tx${t}`} x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="axis-label">{t}</text>)}
        {ticks.map((t) => <text key={`ty${t}`} x={m.l - 10} y={sy(t) + 4} textAnchor="end" className="axis-label">{t}</text>)}
        <text x={m.l + pw / 2} y={H - 6} textAnchor="middle" className="axis-label">{xLabel} →</text>
        <text transform={`translate(12 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">{yLabel} →</text>
        <text x={m.l + 8} y={m.t + 14} className="axis-label" style={{ fontWeight: 600 }}>{quadrants[0]}</text>
        <text x={m.l + pw - 8} y={m.t + 14} textAnchor="end" className="axis-label" style={{ fontWeight: 600 }}>{quadrants[1]}</text>
        <text x={m.l + 8} y={m.t + ph - 8} className="axis-label" style={{ fontWeight: 600 }}>{quadrants[2]}</text>
        <text x={m.l + pw - 8} y={m.t + ph - 8} textAnchor="end" className="axis-label" style={{ fontWeight: 600 }}>{quadrants[3]}</text>
        {placed.map((p) => (
          <g key={p.id} className="hit" onPointerMove={(e) => tt.show(e, p.tip)} onPointerLeave={tt.hide} onClick={() => onClick?.(p.id)}>
            <circle cx={p.px} cy={p.py} r={14} fill="transparent" />
            <circle cx={p.px} cy={p.py} r={p.r ?? 6} fill={p.color} stroke="var(--chart-surface)" strokeWidth={2} />
            {labels && <text x={p.px + (p.r ?? 6) + 4} y={p.py + 4} style={{ fill: 'var(--text)', fontSize: 11 }}>{p.label}</text>}
          </g>
        ))}
      </svg>
      {tt.node}
    </div>
  );
}

// ---------------- histogram with percentile markers ----------------

export function Histogram({ bins, markers, xLabel, format = (v) => String(v), height = 200 }: {
  bins: { x: number; count: number }[]; markers?: { x: number; label: string }[]; xLabel: string; format?: (v: number) => string; height?: number;
}) {
  const tt = useTooltip();
  if (!bins.length) return null;
  const W = 640, H = height, m = { l: 36, r: 12, t: 22, b: 34 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const xs = bins.map((b) => b.x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const n = x1 - x0 + 1;
  const bw = pw / n;
  const maxC = Math.max(...bins.map((b) => b.count));
  const total = bins.reduce((s, b) => s + b.count, 0);
  const sx = (x: number) => m.l + (x - x0) * bw;
  const sy = (c: number) => m.t + ph - (c / maxC) * ph;
  const barW = Math.min(24, bw - 2);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distribution">
        <line className="axis-line" x1={m.l} x2={m.l + pw} y1={m.t + ph} y2={m.t + ph} />
        {bins.map((b) => {
          const x = sx(b.x) + (bw - barW) / 2;
          const y = sy(b.count);
          const h = m.t + ph - y;
          return (
            <g key={b.x} onPointerMove={(e) => tt.show(e, <><div className="t-title">{format(b.x)}</div>{((b.count / total) * 100).toFixed(1)}% of simulations</>)} onPointerLeave={tt.hide}>
              <rect x={sx(b.x)} y={m.t} width={bw} height={ph} fill="transparent" />
              <path d={roundedTop(x, y, barW, h, 4)} fill="var(--s1)" />
            </g>
          );
        })}
        {markers?.map((mk, i) => (
          <g key={mk.label}>
            <line x1={sx(mk.x) + bw / 2} x2={sx(mk.x) + bw / 2} y1={m.t - 4} y2={m.t + ph} stroke="var(--text-2)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={sx(mk.x) + bw / 2 + 4} y={m.t + 6 + i * 12} style={{ fill: 'var(--text)', fontSize: 11, fontWeight: 600 }}>{mk.label}</text>
          </g>
        ))}
        {bins.filter((_, i) => n <= 16 || i % Math.ceil(n / 12) === 0).map((b) => (
          <text key={b.x} x={sx(b.x) + bw / 2} y={H - m.b + 15} textAnchor="middle" className="axis-label">{b.x}</text>
        ))}
        <text x={m.l + pw / 2} y={H - 4} textAnchor="middle" className="axis-label">{xLabel}</text>
      </svg>
      {tt.node}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function roundedRight(x: number, y: number, w: number, h: number, r: number): string {
  if (w <= 0) return '';
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

// ---------------- horizontal bars ----------------

export function HBars({ rows, format = compact, color = 'var(--s1)', max: maxIn }: { rows: { label: ReactNode; value: number; tip?: ReactNode; color?: string; onClick?: () => void }[]; format?: (v: number) => string; color?: string; max?: number }) {
  const tt = useTooltip();
  const max = maxIn ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="col" style={{ gap: 8 }}>
      {rows.map((r, i) => (
        <div key={i} className="row" style={{ gap: 10, cursor: r.onClick ? 'pointer' : undefined }} onClick={r.onClick} onPointerMove={(e) => r.tip && tt.show(e, r.tip)} onPointerLeave={tt.hide}>
          <div className="ellipsis small" style={{ width: '38%', minWidth: 0 }}>{r.label}</div>
          <svg viewBox="0 0 100 14" preserveAspectRatio="none" style={{ flex: 1, height: 14 }} aria-hidden="true">
            <path d={roundedRight(0, 1, Math.max(0.5, (r.value / max) * 100), 12, 3)} fill={r.color ?? color} vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="small num" style={{ width: 56, textAlign: 'right' }}>{format(r.value)}</div>
        </div>
      ))}
      {tt.node}
    </div>
  );
}

// ---------------- 100% stacked bar ----------------

export function StackBar({ parts, height = 14 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const tt = useTooltip();
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let x = 0;
  const gap = 0.6;
  return (
    <>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block', borderRadius: 4 }} role="img">
        {parts.filter((p) => p.value > 0).map((p) => {
          const w = (p.value / total) * 100;
          const el = <rect key={p.label} x={x} y={0} width={Math.max(0, w - gap)} height={height} fill={p.color} onPointerMove={(e) => tt.show(e, <><div className="t-title">{p.label}</div>{Math.round((p.value / total) * 100)}% ({compact(p.value)})</>)} onPointerLeave={tt.hide} />;
          x += w;
          return el;
        })}
      </svg>
      {tt.node}
    </>
  );
}

// ---------------- sparkline (sentiment) ----------------

export function Sparkline({ values, min = -2, max = 2, width = 120, height = 28, color = 'var(--s1)', zero = true }: { values: number[]; min?: number; max?: number; width?: number; height?: number; color?: string; zero?: boolean }) {
  if (!values.length) return <span className="muted small">–</span>;
  const p = 4;
  const sx = (i: number) => p + (values.length === 1 ? (width - 2 * p) / 2 : (i / (values.length - 1)) * (width - 2 * p));
  const sy = (v: number) => p + (1 - (v - min) / (max - min)) * (height - 2 * p);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(v)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={`Trend: ${values.join(', ')}`} role="img">
      {zero && min < 0 && max > 0 && <line x1={p} x2={width - p} y1={sy(0)} y2={sy(0)} stroke="var(--grid)" strokeWidth={1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={sx(values.length - 1)} cy={sy(values[values.length - 1])} r={3.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

// ---------------- 5×5 heatmap (RAID exposure) ----------------

export function RiskMatrix({ items, onCell, selected }: { items: { id: string; p: number; i: number; label: string }[]; onCell?: (p: number, i: number) => void; selected?: [number, number] | null }) {
  const tt = useTooltip();
  const W = 340, H = 300, m = { l: 40, b: 34, t: 8, r: 8 };
  const cw = (W - m.l - m.r) / 5, ch = (H - m.t - m.b) / 5;
  const color = (score: number) => (score >= 20 ? 'var(--critical)' : score >= 12 ? 'var(--serious)' : score >= 6 ? 'var(--warning)' : 'var(--surface-3)');
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Risk matrix: probability by impact">
        {[1, 2, 3, 4, 5].map((p) => [1, 2, 3, 4, 5].map((i) => {
          const list = items.filter((x) => x.p === p && x.i === i);
          const x = m.l + (i - 1) * cw, y = m.t + (5 - p) * ch;
          const sel = selected && selected[0] === p && selected[1] === i;
          return (
            <g key={`${p}${i}`} className="hit" onClick={() => onCell?.(p, i)} onPointerMove={(e) => list.length && tt.show(e, <><div className="t-title">P{p} × I{i} = {p * i}</div>{list.map((l) => <div key={l.id}>• {l.label}</div>)}</>)} onPointerLeave={tt.hide}>
              <rect x={x + 1} y={y + 1} width={cw - 2} height={ch - 2} rx={4} fill={color(p * i)} opacity={list.length ? 0.95 : 0.25} stroke={sel ? 'var(--text)' : 'none'} strokeWidth={2} />
              {list.length > 0 && <text x={x + cw / 2} y={y + ch / 2 + 5} textAnchor="middle" style={{ fill: p * i >= 12 ? '#fff' : '#1a1a19', fontWeight: 700, fontSize: 14 }}>{list.length}</text>}
            </g>
          );
        }))}
        {[1, 2, 3, 4, 5].map((v) => <text key={`i${v}`} x={m.l + (v - 0.5) * cw} y={H - m.b + 15} textAnchor="middle" className="axis-label">{v}</text>)}
        {[1, 2, 3, 4, 5].map((v) => <text key={`p${v}`} x={m.l - 8} y={m.t + (5 - v + 0.5) * ch + 4} textAnchor="end" className="axis-label">{v}</text>)}
        <text x={m.l + (W - m.l - m.r) / 2} y={H - 4} textAnchor="middle" className="axis-label">Impact →</text>
        <text transform={`translate(10 ${m.t + (H - m.t - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">Probability →</text>
      </svg>
      {tt.node}
    </div>
  );
}

// ---------------- network (influence) ----------------

export interface NetNode { id: string; label: string; color: string; r: number; tip: ReactNode }
export interface NetEdge { from: string; to: string }

/** Circular layout, grouped by colour; arrows point from influencer to influenced. */
export function Network({ nodes, edges, onClick, highlight }: { nodes: NetNode[]; edges: NetEdge[]; onClick?: (id: string) => void; highlight?: string | null }) {
  const tt = useTooltip();
  const [hover, setHover] = useState<string | null>(null);
  const focus = hover ?? highlight ?? null;
  const W = 640, H = 520, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 70;
  const pos = new Map(nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return [n.id, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, a }];
  }));
  const connected = (id: string) => !focus || id === focus || edges.some((e) => (e.from === focus && e.to === id) || (e.to === focus && e.from === id));
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Influence network">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || b === undefined) return null;
          const nb = nodes.find((n) => n.id === e.to)!;
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const ex = b.x - (dx / len) * (nb.r + 5), ey = b.y - (dy / len) * (nb.r + 5);
          const mx = (a.x + ex) / 2 + (cy - (a.y + ey) / 2) * 0.18, my = (a.y + ey) / 2 - (cx - (a.x + ex) / 2) * 0.18;
          const on = !focus || e.from === focus || e.to === focus;
          return <path key={i} d={`M${a.x},${a.y} Q${mx},${my} ${ex},${ey}`} fill="none" stroke={on ? 'var(--text-3)' : 'var(--grid)'} strokeWidth={on && focus ? 2 : 1.2} markerEnd="url(#arrow)" opacity={on ? 1 : 0.5} />;
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const right = Math.cos(p.a) >= 0;
          return (
            <g key={n.id} className="hit" opacity={connected(n.id) ? 1 : 0.3} onPointerEnter={() => setHover(n.id)} onPointerMove={(e) => tt.show(e, n.tip)} onPointerLeave={() => { setHover(null); tt.hide(); }} onClick={() => onClick?.(n.id)}>
              <circle cx={p.x} cy={p.y} r={n.r + 8} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={n.r} fill={n.color} stroke="var(--chart-surface)" strokeWidth={2} />
              <text x={p.x + (right ? n.r + 6 : -n.r - 6)} y={p.y + 4} textAnchor={right ? 'start' : 'end'} style={{ fill: 'var(--text)', fontSize: 11.5 }}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      {tt.node}
    </div>
  );
}

// ---------------- line chart (multi-series over x) ----------------

export function LineChart({ series, xLabels, height = 220, yFormat = compact, yMin }: { series: { label: string; values: (number | null)[]; color: string }[]; xLabels: string[]; height?: number; yFormat?: (v: number) => string; yMin?: number }) {
  const tt = useTooltip();
  const [hx, setHx] = useState<number | null>(null);
  const W = 640, H = height, m = { l: 44, r: 16, t: 12, b: 28 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const lo = yMin ?? Math.min(0, ...all), hi = Math.max(1, ...all);
  const ticks = niceTicks(lo, hi, 4);
  const top = Math.max(hi, ticks[ticks.length - 1]);
  const sx = (i: number) => m.l + (xLabels.length === 1 ? pw / 2 : (i / (xLabels.length - 1)) * pw);
  const sy = (v: number) => m.t + ph - ((v - lo) / (top - lo || 1)) * ph;
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(xLabels.length - 1, Math.round(((x - m.l) / pw) * (xLabels.length - 1))));
    setHx(i);
    tt.show(e, <><div className="t-title">{xLabels[i]}</div>{series.map((s) => <div key={s.label} className="row"><span className="swatch" style={{ background: s.color }} />{s.label}: {s.values[i] === null ? '–' : yFormat(s.values[i]!)}</div>)}</>);
  };
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" onPointerMove={onMove} onPointerLeave={() => { setHx(null); tt.hide(); }}>
        {ticks.map((t) => <g key={t}><line className="grid-line" x1={m.l} x2={m.l + pw} y1={sy(t)} y2={sy(t)} /><text x={m.l - 8} y={sy(t) + 4} textAnchor="end" className="axis-label">{yFormat(t)}</text></g>)}
        {xLabels.map((l, i) => (xLabels.length <= 12 || i % Math.ceil(xLabels.length / 8) === 0) && <text key={i} x={sx(i)} y={H - 8} textAnchor="middle" className="axis-label">{l}</text>)}
        {hx !== null && <line x1={sx(hx)} x2={sx(hx)} y1={m.t} y2={m.t + ph} stroke="var(--axis)" />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : [sx(i), sy(v)] as const));
          let d = '';
          pts.forEach((p, i) => { if (p) d += `${d && pts[i - 1] ? 'L' : 'M'}${p[0]},${p[1]} `; });
          const last = [...pts].reverse().find(Boolean);
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {last && <circle cx={last[0]} cy={last[1]} r={4} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />}
              {hx !== null && pts[hx] && <circle cx={pts[hx]![0]} cy={pts[hx]![1]} r={4} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />}
            </g>
          );
        })}
      </svg>
      {tt.node}
    </div>
  );
}

// ---------------- calibration ----------------

export function CalibrationChart({ buckets }: { buckets: { range: string; predicted: number; actual: number; n: number }[] }) {
  const tt = useTooltip();
  const W = 320, H = 280, m = { l: 40, r: 12, t: 12, b: 36 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const sx = (v: number) => m.l + v * pw, sy = (v: number) => m.t + ph - v * ph;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calibration: predicted confidence vs actual success">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line className="grid-line" x1={m.l} x2={m.l + pw} y1={sy(t)} y2={sy(t)} /><text x={m.l - 6} y={sy(t) + 4} textAnchor="end" className="axis-label">{t * 100}%</text><text x={sx(t)} y={H - m.b + 15} textAnchor="middle" className="axis-label">{t * 100}%</text></g>)}
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="var(--axis)" strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={sx(0.62)} y={sy(0.7)} className="axis-label" transform={`rotate(-40 ${sx(0.62)} ${sy(0.7)})`}>perfect calibration</text>
        {buckets.map((b) => (
          <g key={b.range} className="hit" onPointerMove={(e) => tt.show(e, <><div className="t-title">Confidence {b.range}</div>Predicted {Math.round(b.predicted * 100)}% · actual {Math.round(b.actual * 100)}% · {b.n} bets</>)} onPointerLeave={tt.hide}>
            <circle cx={sx(b.predicted)} cy={sy(b.actual)} r={14} fill="transparent" />
            <circle cx={sx(b.predicted)} cy={sy(b.actual)} r={4 + Math.min(6, b.n * 1.5)} fill="var(--s1)" stroke="var(--chart-surface)" strokeWidth={2} />
          </g>
        ))}
        <text x={m.l + pw / 2} y={H - 4} textAnchor="middle" className="axis-label">Predicted confidence</text>
        <text transform={`translate(10 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">Actual success</text>
      </svg>
      {tt.node}
    </div>
  );
}
