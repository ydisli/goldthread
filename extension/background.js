import { capture, guessSource } from './shared.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'tl-evidence', title: 'Send to Throughline as signal', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'tl-request', title: 'Send to Throughline as request', contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = (info.selectionText || '').trim();
  if (!text) return;
  const kind = info.menuItemId === 'tl-request' ? 'request' : 'evidence';
  try {
    await capture({ kind, text, url: tab?.url, source: guessSource(tab?.url || '') });
    chrome.action.setBadgeBackgroundColor({ color: '#0ca30c' });
    chrome.action.setBadgeText({ text: '✓', tabId: tab?.id });
  } catch (err) {
    chrome.action.setBadgeBackgroundColor({ color: '#d03b3b' });
    chrome.action.setBadgeText({ text: '!', tabId: tab?.id });
    chrome.notifications?.create({ type: 'basic', iconUrl: 'icon-48.png', title: 'Throughline capture failed', message: String(err.message || err) });
  }
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab?.id }), 2500);
});
