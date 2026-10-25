import type { Entity } from '../../../core/schema.ts';

/** Canonical route for an entity: specialised module pages where they exist. */
export function hrefOf(e: Entity | { id: string; type: string }): string {
  const id = encodeURIComponent(e.id);
  switch (e.type) {
    case 'stakeholder': return `/stakeholders/p/${id}`;
    case 'spec': return `/define/specs/${id}`;
    case 'decisionTable': return `/define/decision-tables/${id}`;
    case 'processModel': return `/define/process/${id}`;
    case 'storyMap': return `/define/story-map/${id}`;
    case 'raci': return `/stakeholders/raci/${id}`;
    case 'release': return `/deliver/releases/${id}`;
    case 'bet': return `/discover/bets/${id}`;
    case 'experiment': return `/discover/experiments/${id}`;
    case 'journey': return `/discover/journeys/${id}`;
    case 'businessCase': return `/strategy/business-cases/${id}`;
    case 'stateModel': return `/define/states/${id}`;
    case 'baseline': return `/define/baselines/${id}`;
    case 'meeting': return `/workspace/meetings/${id}`;
    case 'rootCause': return `/define/root-cause/${id}`;
    case 'dataEntity': return `/define/data/${id}`;
    case 'requirement': return `/define/requirements/${id}`;
    case 'decision': return `/define/decisions/${id}`;
    case 'changeRequest': return `/define/changes/${id}`;
    case 'story': return `/define/stories/${id}`;
    case 'elicitation': return `/define/elicitation/${id}`;
    case 'comment': return `/e/comment/${id}`;
    default: return `/e/${e.type}/${id}`;
  }
}
