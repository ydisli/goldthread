import type { ReactNode } from 'react';
import { updateMe, useMe } from '../store.ts';
import { Guide, errorToast } from './kit.tsx';

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
    />
  );
}
