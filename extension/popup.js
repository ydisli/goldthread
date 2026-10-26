import { capture, guessSource } from './shared.js';

const $ = (id) => document.getElementById(id);
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

$('send').addEventListener('click', async () => {
  const text = $('text').value.trim();
  if (!text) return;
  $('send').disabled = true;
  $('msg').textContent = 'Sending…';
  try {
    const out = await capture({ kind: $('kind').value, text, account: $('account').value || undefined, from: $('from').value || undefined, url: tab?.url, source: guessSource(tab?.url || '') });
    $('msg').innerHTML = '';
    const a = document.createElement('a');
    a.href = out.link;
    a.target = '_blank';
    a.textContent = 'Captured — open in Goldthread';
    $('msg').append('✓ ', a);
    if (out.similar?.length) {
      const p = document.createElement('div');
      p.textContent = `Similar already captured: ${out.similar.map((s) => s.title).join('; ')}`;
      p.style.opacity = '0.7';
      $('msg').append(p);
    }
    $('text').value = '';
  } catch (err) {
    $('msg').textContent = `✗ ${err.message}`;
  } finally {
    $('send').disabled = false;
  }
});
