import { Graph } from '../core/graph.ts';
import { nameOf, type Entity } from '../core/schema.ts';
import { dailyBrief, openMentions } from '../core/engines/brief.ts';
import { hubSummary, pendingApprovalsFor } from '../core/engines/stakeholders.ts';
import { mailEnabled, publicUrl, queueMail } from './mail.ts';
import type { Prefs, SystemDB, User } from './system.ts';
import type { Workspaces } from './workspaces.ts';

// Who gets emailed about what. Everything here is a no-op when email isn't set up.

export interface NotifyPrefs { mentions?: boolean; approvals?: boolean; digest?: boolean }
const wants = (u: User, what: keyof NotifyPrefs) => {
  const n = (u.prefs as Prefs & { notify?: NotifyPrefs }).notify ?? {};
  return what === 'digest' ? n.digest === true : n[what] !== false;
};

const itemLink = (base: string, e: Entity) => `${base}/#/e/${e.type}/${e.id}`;
const footer = (base: string) => `\n\n—\nThroughline · ${base}\nChange which emails you get under Settings → Profile → Notifications.`;

export function notifyInvite(sys: SystemDB, input: { email: string; token: string; workspace: string; role: string; by: string; base: string }): boolean {
  return queueMail(sys, {
    to: input.email,
    subject: `${input.by} invited you to ${input.workspace} on Throughline`,
    text: `${input.by} invited you to join “${input.workspace}” as ${input.role}.\n\nAccept the invite:\n${input.base}/#/join/${input.token}\n\nThe link works once, for this email address, for 14 days.` + footer(input.base),
  });
}

export function notifyReset(sys: SystemDB, user: User, token: string, base: string): boolean {
  return queueMail(sys, {
    to: user.email,
    subject: 'Reset your Throughline password',
    text: `Someone asked to reset the password for ${user.email}. If it was you, choose a new password here:\n${base}/#/reset/${token}\n\nThe link works once, for 24 hours. If it wasn't you, ignore this email; your password stays as it is.` + footer(base),
  });
}

export function notifyMentions(sys: SystemDB, comment: Entity, on: Entity | undefined, workspace: string, base: string): number {
  if (!mailEnabled() || !on) return 0;
  let n = 0;
  for (const id of (comment.mentions ?? []) as string[]) {
    const u = sys.user(id);
    if (!u || u.demo || !wants(u, 'mentions')) continue;
    queueMail(sys, {
      to: u.email,
      subject: `${comment.author} mentioned you on “${nameOf(on)}”`,
      text: `${comment.author} mentioned you in ${workspace}:\n\n${String(comment.body).split('\n').map((l) => `> ${l}`).join('\n')}\n\nOpen it:\n${itemLink(base, on)}` + footer(base),
    });
    n++;
  }
  return n;
}

export function notifyApproval(sys: SystemDB, approval: Entity, g: Graph, workspace: string, base: string): number {
  if (!mailEnabled()) return 0;
  let n = 0;
  for (const a of (approval.approvers ?? []) as { stakeholderId: string; status: string }[]) {
    if (a.status !== 'pending') continue;
    const u = sys.user(g.get(a.stakeholderId)?.userId);
    if (!u || u.demo || !wants(u, 'approvals')) continue;
    const subject = g.get(approval.subjectId);
    queueMail(sys, {
      to: u.email,
      subject: `Your sign-off is requested: ${approval.title}`,
      text: `You're asked to approve “${approval.title}” in ${workspace}${subject ? ` (${nameOf(subject)})` : ''}${approval.dueDate ? `, by ${approval.dueDate}` : ''}.\n\nReview and respond:\n${base}/#/stakeholders/approvals?focus=${approval.id}` + footer(base),
    });
    n++;
  }
  return n;
}

/**
 * The weekly digest, for people who switched it on: what is waiting on them in each workspace.
 * Sent on Mondays from 08:00 server time, at most once every six days.
 */
export function sendDigests(sys: SystemDB, workspaces: Workspaces, now = new Date()): number {
  if (!mailEnabled() || now.getDay() !== 1 || now.getHours() < 8) return 0;
  const base = publicUrl();
  let sent = 0;
  for (const u of sys.allUsers()) {
    if (u.demo || u.status !== 'active' || !wants(u, 'digest')) continue;
    const last = (u.prefs as { lastDigestAt?: string }).lastDigestAt;
    if (last && now.getTime() - Date.parse(last) < 6 * 86_400_000) continue;
    const sections: string[] = [];
    for (const w of sys.workspacesOf(u.id)) {
      const g = new Graph(workspaces.store(w.id).all(), { meUserId: u.id });
      const lines: string[] = [];
      const mentions = openMentions(g, u.id, (u.prefs as { seenMentions?: string[] }).seenMentions);
      if (mentions.length) lines.push(`- ${mentions.length} mention${mentions.length === 1 ? '' : 's'} waiting`);
      const approvals = g.me ? pendingApprovalsFor(g.me.id, g.all('approval')) : [];
      for (const a of approvals.slice(0, 5)) lines.push(`- Sign-off: ${a.title}${a.dueDate ? ` (due ${a.dueDate})` : ''}`);
      const hub = hubSummary(g, now);
      for (const x of hub.riskyCommitments.slice(0, 3)) lines.push(`- Promise at risk: ${x.c.title}`);
      const covered = new Set([...approvals.map((a) => a.id), ...hub.riskyCommitments.map((x) => x.c.id)]);
      for (const i of dailyBrief(g, now).filter((x) => (x.severity === 'critical' || x.severity === 'high') && !covered.has(x.refId ?? '')).slice(0, 5)) lines.push(`- ${i.title}`);
      if (lines.length) sections.push(`${w.name}\n${[...new Set(lines)].join('\n')}\n${base}/#/today`);
    }
    if (!sections.length) continue;
    queueMail(sys, { to: u.email, subject: 'Your week in Throughline', text: `Good morning, ${u.name.split(' ')[0]}. Here is what is waiting on you.\n\n${sections.join('\n\n')}` + footer(base) });
    sys.updateUser(u.id, { prefs: { lastDigestAt: now.toISOString() } });
    sent++;
  }
  return sent;
}
