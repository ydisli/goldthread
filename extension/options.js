import { settings } from './shared.js';

const s = await settings();
document.getElementById('url').value = s.url;
document.getElementById('token').value = s.token;
document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({ url: document.getElementById('url').value.trim(), token: document.getElementById('token').value.trim() });
  document.getElementById('msg').textContent = ' Saved ✓';
});
