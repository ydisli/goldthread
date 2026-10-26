import { capture, guessSource } from './shared.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'gt-evidence', title: 'Send to Goldthread as signal', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'gt-request', title: 'Send to Goldthread as request', contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = (info.selectionText || '').trim();
  if (!text) return;
  const kind = info.menuItemId === 'gt-request' ? 'request' : 'evidence';
  try {
    await capture({ kind, text, url: tab?.url, source: guessSource(tab?.url || '') });
    chrome.action.setBadgeBackgroundColor({ color: '#0ca30c' });
    chrome.action.setBadgeText({ text: '✓', tabId: tab?.id });
  } catch (err) {
    chrome.action.setBadgeBackgroundColor({ color: '#d03b3b' });
    chrome.action.setBadgeText({ text: '!', tabId: tab?.id });
    chrome.notifications?.create({ type: 'basic', iconUrl: 'icon-48.png', title: 'Goldthread capture failed', message: String(err.message || err) });
  }
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab?.id }), 2500);
});
