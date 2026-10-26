import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SystemDB } from './system.ts';

// Slack and Microsoft Teams, both ways:
//  - out: chosen events post to a channel through an incoming webhook (Slack) or a
//    Workflows webhook (Teams), with a link back to the item;
//  - in: a Slack slash command or a Teams outgoing webhook captures a signal, request,
//    decision or risk. Requests are verified with Slack's signing secret or the Teams HMAC.
// Tested against local stand-ins, not against real Slack or Teams.

export type ChatKind = 'slack' | 'teams';
export const CHAT_EVENTS = ['requests', 'approvals', 'decisions', 'releases'] as const;
export type ChatEvent = (typeof CHAT_EVENTS)[number];

export interface ChatSecret { webhookUrl?: string; signingSecret?: string; securityToken?: string }

export function chatSecret(sys: SystemDB, workspaceId: string, kind: ChatKind): { events: string[]; secret: ChatSecret } | null {
  const i = sys.integration<{ events?: string[] }>(workspaceId, kind);
  if (!i?.secret) return null;
  try { return { events: i.config.events ?? [...CHAT_EVENTS], secret: JSON.parse(i.secret) as ChatSecret }; } catch { return null; }
}

export function slackPayload(title: string, text: string, link?: string) {
  return { text: `*${title}*${text ? `\n${text}` : ''}${link ? `\n<${link}|Open in Throughline>` : ''}` };
}

export function teamsPayload(title: string, text: string, link?: string) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
        body: [{ type: 'TextBlock', text: title, weight: 'Bolder', wrap: true }, ...(text ? [{ type: 'TextBlock', text, wrap: true }] : [])],
        actions: link ? [{ type: 'Action.OpenUrl', title: 'Open in Throughline', url: link }] : [],
      },
    }],
  };
}

/** Post to every chat channel configured for this event. Never throws; results go on the integration's status. */
export async function postToChat(sys: SystemDB, workspaceId: string, event: ChatEvent | 'test', msg: { title: string; text?: string; link?: string }): Promise<number> {
  let sent = 0;
  for (const kind of ['slack', 'teams'] as ChatKind[]) {
    const c = chatSecret(sys, workspaceId, kind);
    if (!c?.secret.webhookUrl || (event !== 'test' && !c.events.includes(event))) continue;
    const body = kind === 'slack' ? slackPayload(msg.title, msg.text ?? '', msg.link) : teamsPayload(msg.title, msg.text ?? '', msg.link);
    let status: Record<string, unknown>;
    try {
      const res = await fetch(c.secret.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
      status = res.ok ? { at: new Date().toISOString(), ok: true } : { at: new Date().toISOString(), ok: false, error: `The webhook answered ${res.status}` };
      if (res.ok) sent++;
    } catch (err) {
      status = { at: new Date().toISOString(), ok: false, error: `Could not reach the webhook: ${(err as Error).message}` };
    }
    sys.setIntegrationStatus(workspaceId, kind, { lastPost: status });
  }
  return sent;
}

/** Slack request signing: v0=HMAC-SHA256(signing secret, "v0:<timestamp>:<raw body>"), at most five minutes old. */
export function verifySlack(signingSecret: string, headers: Record<string, unknown>, raw: string, now = Date.now()): boolean {
  const ts = Number(headers['x-slack-request-timestamp']);
  const sig = String(headers['x-slack-signature'] ?? '');
  if (!ts || Math.abs(now / 1000 - ts) > 300 || !sig.startsWith('v0=')) return false;
  const want = `v0=${createHmac('sha256', signingSecret).update(`v0:${ts}:${raw}`).digest('hex')}`;
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

/** Teams outgoing webhooks: "HMAC <base64(HMAC-SHA256(base64-decoded security token, raw body))>". */
export function verifyTeams(securityToken: string, authorization: unknown, raw: string): boolean {
  const got = String(authorization ?? '').replace(/^HMAC\s+/i, '');
  if (!got) return false;
  const want = createHmac('sha256', Buffer.from(securityToken, 'base64')).update(raw, 'utf8').digest('base64');
  return want.length === got.length && timingSafeEqual(Buffer.from(want), Buffer.from(got));
}

/** Teams puts "<at>Bot name</at>" in front of the message; drop it and any markup. */
export const teamsText = (html: string) => html.replace(/<at>[^<]*<\/at>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
