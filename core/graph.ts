import { ENTITY_MAP, type Entity, type FieldDef } from './schema.ts';

export interface Link {
  from: Entity;
  field: FieldDef;
  to: Entity;
}

/**
 * The Intent Graph: an index over all entities whose edges are derived from
 * the typed `ref` / `refs` fields declared in the schema.
 */
export class Graph {
  readonly byId = new Map<string, Entity>();
  readonly byType = new Map<string, Entity[]>();
  private readonly out = new Map<string, Link[]>();
  private readonly back = new Map<string, Link[]>();
  readonly me: Entity | undefined;
  /** The signed-in account, when the graph was built for one. */
  readonly meUserId: string | undefined;

  constructor(entities: Iterable<Entity>, opts: { meUserId?: string } = {}) {
    for (const e of entities) {
      this.byId.set(e.id, e);
      const list = this.byType.get(e.type);
      if (list) list.push(e);
      else this.byType.set(e.type, [e]);
    }
    for (const e of this.byId.values()) {
      const def = ENTITY_MAP[e.type];
      if (!def) continue;
      for (const f of def.fields) {
        if (f.kind !== 'ref' && f.kind !== 'refs') continue;
        const v = e[f.key];
        const ids: string[] = f.kind === 'ref' ? (v ? [v] : []) : Array.isArray(v) ? v : [];
        for (const id of ids) {
          const to = this.byId.get(id);
          if (!to) continue;
          const link = { from: e, field: f, to };
          push(this.out, e.id, link);
          push(this.back, to.id, link);
        }
      }
    }
    // "Me" is the stakeholder record linked to the signed-in user.
    this.meUserId = opts.meUserId;
    this.me = opts.meUserId ? this.all('stakeholder').find((s) => s.userId === opts.meUserId) : undefined;
  }

  get(id: string | undefined | null): Entity | undefined {
    return id ? this.byId.get(id) : undefined;
  }

  all(type: string): Entity[] {
    return this.byType.get(type) ?? [];
  }

  /** Outgoing links (this entity references …). */
  linksFrom(id: string): Link[] {
    return this.out.get(id) ?? [];
  }

  /** Incoming links (… references this entity). */
  linksTo(id: string): Link[] {
    return this.back.get(id) ?? [];
  }

  /** Entities of `type` whose `field` references `id`. */
  referencing(id: string, type: string, field?: string): Entity[] {
    return this.linksTo(id)
      .filter((l) => l.from.type === type && (!field || l.field.key === field))
      .map((l) => l.from);
  }

  /** Resolve a ref/refs field to entities. */
  resolve(e: Entity, field: string): Entity[] {
    const v = e[field];
    const ids: string[] = Array.isArray(v) ? v : v ? [v] : [];
    return ids.map((id) => this.byId.get(id)).filter((x): x is Entity => !!x);
  }

  neighbors(id: string): Entity[] {
    const seen = new Map<string, Entity>();
    for (const l of this.linksFrom(id)) seen.set(l.to.id, l.to);
    for (const l of this.linksTo(id)) seen.set(l.from.id, l.from);
    return [...seen.values()];
  }

  /**
   * Breadth-first traversal in both directions. Returns each reachable entity
   * with its distance and the path of entities that led to it.
   */
  traverse(startId: string, maxDepth = 3, skipTypes: string[] = ['comment']): { entity: Entity; depth: number; via: Entity[] }[] {
    const start = this.byId.get(startId);
    if (!start) return [];
    const result: { entity: Entity; depth: number; via: Entity[] }[] = [];
    const visited = new Set([startId]);
    let frontier: { e: Entity; via: Entity[] }[] = [{ e: start, via: [] }];
    for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
      const next: { e: Entity; via: Entity[] }[] = [];
      for (const { e, via } of frontier) {
        for (const n of this.neighbors(e.id)) {
          if (visited.has(n.id) || skipTypes.includes(n.type)) continue;
          visited.add(n.id);
          const path = [...via, e];
          result.push({ entity: n, depth, via: path });
          // Do not expand through hub-like entities (stakeholders, teams) — they
          // connect to everything and would make impact analysis meaningless.
          if (!['stakeholder', 'team', 'persona'].includes(n.type)) next.push({ e: n, via: path });
        }
      }
      frontier = next;
    }
    return result;
  }
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
}
