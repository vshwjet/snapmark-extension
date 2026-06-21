const input = document.getElementById('api-key')
const showBtn = document.getElementById('show-btn')
const saveBtn = document.getElementById('save-btn')
const clearBtn = document.getElementById('clear-btn')
const statusMsg = document.getElementById('status-msg')

let statusTimer = null

function showStatus(msg, color = '#34C759') {
  statusMsg.textContent = msg
  statusMsg.style.color = color
  statusMsg.classList.add('visible')
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => statusMsg.classList.remove('visible'), 2000)
}

// Load saved key on open
chrome.storage.sync.get('imgbbApiKey', (result) => {
  if (result.imgbbApiKey) {
    input.value = result.imgbbApiKey
  }
})

// Toggle show/hide
showBtn.addEventListener('click', () => {
  const isHidden = input.type === 'password'
  input.type = isHidden ? 'text' : 'password'
  showBtn.textContent = isHidden ? 'Hide' : 'Show'
})

// Save
saveBtn.addEventListener('click', () => {
  const key = input.value.trim()
  if (!key) {
    showStatus('Enter a key first', '#FF383C')
    return
  }
  chrome.storage.sync.set({ imgbbApiKey: key }, () => {
    showStatus('Saved!')
  })
})

// Clear
clearBtn.addEventListener('click', () => {
  input.value = ''
  chrome.storage.sync.remove('imgbbApiKey', () => {
    showStatus('Cleared', 'rgba(255,255,255,0.5)')
  })
})
