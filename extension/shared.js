// Shared helpers for the popup, options page and background worker.
export async function settings() {
  const s = await chrome.storage.sync.get({ url: 'http://127.0.0.1:4300', token: '' });
  return { url: s.url.replace(/\/$/, ''), token: s.token };
}

/** Guess the signal source from the page the text came from. */
export function guessSource(pageUrl) {
  try {
    const host = new URL(pageUrl).hostname;
    if (/zendesk|intercom|freshdesk|helpscout|servicenow|jira/.test(host)) return 'support';
    if (/g2\.com|capterra|trustpilot|apps\.apple|play\.google/.test(host)) return 'app-review';
    if (/gong|chorus|salesforce|hubspot/.test(host)) return 'sales-call';
    if (/linkedin|twitter|x\.com|reddit/.test(host)) return 'social';
    if (/typeform|surveymonkey|qualtrics/.test(host)) return 'survey';
    return 'internal';
  } catch {
    return 'internal';
  }
}

export async function capture(payload) {
  const { url, token } = await settings();
  if (!token) throw new Error('Paste an access token in the extension options first.');
  const res = await fetch(`${url}/api/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-GT-Actor': 'extension' },
    body: JSON.stringify({ actor: 'extension', ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return { ...body, link: `${url}/#/e/${body.entity.type}/${body.entity.id}` };
}
