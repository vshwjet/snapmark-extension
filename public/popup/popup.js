document.getElementById('activate-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'SNAPMARK_ACTIVATE' })
  }
  window.close()
})

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
  window.close()
})
