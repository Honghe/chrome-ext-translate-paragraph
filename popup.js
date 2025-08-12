// key used in chrome.storage
const STORAGE_KEY = 'triggerKey';

// DOM refs
const select = document.getElementById('triggerKey');

// initialize UI from storage
async function loadSetting() {
  // chrome.storage API returns via callback or promise depending on environment;
  // using promise-friendly form
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const value = result[STORAGE_KEY] ?? 'Control'; // default to 'Control'
  select.value = value;
}

// save selection when changed
select.addEventListener('change', async () => {
  const value = select.value;
  await chrome.storage.sync.set({ [STORAGE_KEY]: value });
  console.log('Trigger key changed to:', value);
});

// run on popup open
loadSetting().catch(err => console.error('Failed to load setting', err));
