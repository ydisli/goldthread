import { connect as netConnect, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import type { IncomingMessage } from 'node:http';
import type { SystemDB } from './system.ts';

// Email is optional. With TL_SMTP_URL set (smtp://user:pass@host:587, or smtps:// for port 465)
// Throughline sends invites, mention and approval notices, password reset links and a weekly
// digest through a queue that retries. Without it, nothing is sent and links are shared by hand.

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  /** Allow sending without STARTTLS on servers that don't offer it (local relays). */
  insecure: boolean;
}

export function mailConfig(env = process.env): MailConfig | null {
  if (!env.TL_SMTP_URL) return null;
  const u = new URL(env.TL_SMTP_URL);
  const secure = u.protocol === 'smtps:';
  return {
    host: u.hostname,
    port: Number(u.port || (secure ? 465 : 587)),
    secure,
    user: u.username ? decodeURIComponent(u.username) : undefined,
    pass: u.password ? decodeURIComponent(u.password) : undefined,
    from: env.TL_MAIL_FROM ?? `Throughline <throughline@${u.hostname}>`,
    insecure: env.TL_SMTP_INSECURE === '1',
  };
}

export const mailEnabled = () => !!process.env.TL_SMTP_URL;

/** Public base URL for links in emails and SSO redirects, without a trailing slash. */
export function publicUrl(fallbackHost?: string): string {
  return (process.env.TL_PUBLIC_URL ?? (fallbackHost ? `http://${fallbackHost}` : 'http://localhost:4300')).replace(/\/$/, '');
}

/** The base URL for links, from TL_PUBLIC_URL or else the request that triggered the email. */
export function baseUrl(req?: IncomingMessage): string {
  if (process.env.TL_PUBLIC_URL || !req) return publicUrl();
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${req.headers.host}`;
}

export interface Message { to: string; subject: string; text: string }

const addressOf = (s: string) => /<([^>]+)>/.exec(s)?.[1] ?? s.trim();
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`);

/** RFC 5322 message with a UTF-8 plain-text body (base64, so any line length or character is safe). */
export function formatMessage(cfg: Pick<MailConfig, 'from'>, m: Message, date = new Date()): string {
  const domain = addressOf(cfg.from).split('@')[1] ?? 'localhost';
  const body = Buffer.from(m.text.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: ${cfg.from}`,
    `To: ${m.to}`,
    `Subject: ${encodeHeader(m.subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <${randomBytes(12).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    'Auto-Submitted: auto-generated',
    '',
    body,
  ].join('\r\n');
}

/** A minimal SMTP client: EHLO, STARTTLS when offered, AUTH PLAIN/LOGIN, one message. */
export async function sendSmtp(cfg: MailConfig, m: Message): Promise<void> {
  let socket: Socket | TLSSocket = cfg.secure
    ? tlsConnect({ host: cfg.host, port: cfg.port, servername: cfg.host })
    : netConnect({ host: cfg.host, port: cfg.port });
  socket.setTimeout(30_000);
  let buffer = '';
  let waiter: ((lines: string[]) => void) | null = null;
  let failure: Error | null = null;
  const attach = (s: Socket | TLSSocket) => {
    s.on('data', (d) => {
      buffer += d.toString('utf8');
      // A reply is complete when its last line has a space after the code ("250 OK", not "250-...").
      const lines = buffer.split('\r\n');
      const done = lines.findIndex((l) => /^\d{3} /.test(l));
      if (done >= 0 && waiter) {
        const reply = lines.slice(0, done + 1);
        buffer = lines.slice(done + 1).join('\r\n');
        const w = waiter; waiter = null; w(reply);
      }
    });
    s.on('timeout', () => { failure = new Error('SMTP server timed out'); s.destroy(); });
    s.on('error', (err) => { failure = err; waiter?.([`599 ${err.message}`]); });
  };
  attach(socket);
  const read = () => new Promise<string[]>((resolve) => { waiter = resolve; });
  const expect = async (codes: number[], what: string) => {
    const reply = await read();
    if (failure) throw failure;
    const code = Number(reply.at(-1)!.slice(0, 3));
    if (!codes.includes(code)) throw new Error(`SMTP ${what} failed: ${reply.join(' ')}`);
    return reply;
  };
  const send = (line: string) => socket.write(`${line}\r\n`);
  const helloName = hostname() || 'throughline';

  try {
    await converse();
  } catch (err) {
    socket.destroy();
    throw err;
  }

  async function converse() {
    await expect([220], 'greeting');
    send(`EHLO ${helloName}`);
    let caps = await expect([250], 'EHLO');
    if (!cfg.secure && caps.some((l) => /STARTTLS/i.test(l))) {
      send('STARTTLS');
      await expect([220], 'STARTTLS');
      socket.removeAllListeners('data');
      socket = tlsConnect({ socket, servername: cfg.host });
      attach(socket);
      await new Promise<void>((resolve, reject) => { (socket as TLSSocket).once('secureConnect', resolve); socket.once('error', reject); });
      send(`EHLO ${helloName}`);
      caps = await expect([250], 'EHLO after STARTTLS');
    } else if (!cfg.secure && !cfg.insecure && cfg.user) {
      socket.destroy();
      throw new Error('The SMTP server does not offer STARTTLS; refusing to send the password in clear text. Set TL_SMTP_INSECURE=1 for a trusted local relay.');
    }
    if (cfg.user) {
      if (caps.some((l) => /AUTH.*PLAIN/i.test(l))) {
        send(`AUTH PLAIN ${Buffer.from(`\0${cfg.user}\0${cfg.pass ?? ''}`).toString('base64')}`);
        await expect([235], 'AUTH');
      } else {
        send('AUTH LOGIN');
        await expect([334], 'AUTH LOGIN');
        send(Buffer.from(cfg.user).toString('base64'));
        await expect([334], 'AUTH LOGIN user');
        send(Buffer.from(cfg.pass ?? '').toString('base64'));
        await expect([235], 'AUTH LOGIN password');
      }
    }
    send(`MAIL FROM:<${addressOf(cfg.from)}>`);
    await expect([250], 'MAIL FROM');
    send(`RCPT TO:<${addressOf(m.to)}>`);
    await expect([250, 251], 'RCPT TO');
    send('DATA');
    await expect([354], 'DATA');
    // Dot-stuffing: a line starting with "." gets a second one.
    socket.write(`${formatMessage(cfg, m).replace(/\r\n\./g, '\r\n..')}\r\n.\r\n`);
    await expect([250], 'message');
    send('QUIT');
    socket.end();
  }
}

/** Queue a message; it goes out on the next flush. Returns false when email isn't set up. */
export function queueMail(sys: SystemDB, m: Message): boolean {
  if (!mailEnabled()) return false;
  sys.queueMail(m);
  setImmediate(() => { void flushOutbox(sys); });
  return true;
}

let flushing: Promise<number> | null = null;

/** Send what's due. Failures retry with backoff (1, 4, 9, 16 minutes), then give up after 5 tries. */
export function flushOutbox(sys: SystemDB, now = Date.now()): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const cfg = mailConfig();
    if (!cfg) return 0;
    let sent = 0;
    for (const item of sys.dueMail(now)) {
      try {
        await sendSmtp(cfg, item);
        sys.markMailSent(item.id);
        sent++;
      } catch (err) {
        sys.markMailFailed(item.id, (err as Error).message, now + (item.attempts + 1) ** 2 * 60_000);
      }
    }
    return sent;
  })().finally(() => { flushing = null; });
  return flushing;
}
