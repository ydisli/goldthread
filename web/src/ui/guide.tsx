import type { ReactNode } from 'react';
import { updateMe, useMe } from '../store.ts';
import { Guide, errorToast } from './kit.tsx';
import { Link } from '../router.tsx';
import { Icon } from './icons.tsx';

/** Field Guide chapter that teaches the craft behind each tool's guide panel. */
const CRAFT: Record<string, string> = {
  stakeholders: 'stakeholders', maps: 'stakeholders', raci: 'governance', prioritize: 'prioritisation', forecast: 'forecasting',
  trace: 'governance', specs: 'specs-and-reviews', requirements: 'requirements', 'decision-tables': 'modelling', 'process-canvas': 'modelling',
};

/** A dismissible "how this works" panel; remembered per person in their account. */
export function ToolGuide({ id, title, steps }: { id: string; title: string; steps: ReactNode[] }) {
  const me = useMe();
  const dismissed = me?.prefs.dismissedGuides ?? [];
  return (
    <Guide
      id={id}
      title={title}
      steps={steps}
      dismissed={!me || dismissed.includes(id)}
      onDismiss={(g) => updateMe({ prefs: { dismissedGuides: [...dismissed, g] } }).catch(errorToast)}
      more={CRAFT[id] && <Link to={`/guide/${CRAFT[id]}`}><Icon name="graduation-cap" size={13} />The craft behind this, in the Field Guide</Link>}
    />
  );
}
