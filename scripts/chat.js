let socket = null
let heartbeatInterval = null
let sessionTimer = null
let elapsedTime = 0
let autoDisconnectTimeout = null

document.addEventListener('DOMContentLoaded', () => {
  const storedWsUrl = localStorage.getItem('wsUrl')
  if (storedWsUrl) {
    document.getElementById('wsUrl').value = storedWsUrl
    connectWebSocket(storedWsUrl)
  }
})

document.getElementById('connectBtn').addEventListener('click', () => {
  const wsUrl = document.getElementById('wsUrl').value.trim()

  if (!wsUrl) {
    alert('Please enter a valid WebSocket address.')
    return
  }

  localStorage.setItem('wsUrl', wsUrl)
  connectWebSocket(wsUrl)
})

function connectWebSocket(wsUrl) {
  const token = localStorage.getItem('authToken')
  let fullWsUrl = wsUrl

  if (token) {
    const encodedToken = encodeURIComponent(`Bearer ${token}`)
    const separator = wsUrl.includes('?') ? '&' : '?'
    fullWsUrl = `${wsUrl}${separator}Authorization=${encodedToken}`
    console.log('Attempting WebSocket connection with token.')
  } else {
    console.log('Attempting WebSocket connection without token.')
  }

  updateStatus('Connecting...', 'connecting')
  socket = new WebSocket(fullWsUrl)

  socket.onopen = () => {
    updateStatus('Connected', 'connected')

    const currentTime = new Date().toISOString()
    document.getElementById('connectedTime').textContent = currentTime

    elapsedTime = 0
    updateSessionTimer()
    startSessionTimer()
    startHeartbeat()
    handleAutoDisconnect()
  }

  socket.onmessage = event => {
    console.log('Message Received:', event.data)
    const data = JSON.parse(event.data)

    if (data.message && data.message.toLowerCase() !== 'pong') {
      addMessageToChat(data.message)
    }
  }

  socket.onclose = () => {
    updateStatus('Disconnected', 'disconnected')
    addMessageToChat('You have been disconnected.')
    stopHeartbeat()
    stopSessionTimer()
    clearTimeout(autoDisconnectTimeout)
  }

  socket.onerror = () => {
    updateStatus('Connection error', 'disconnected')
    addMessageToChat('An error occurred with the connection.')
    stopHeartbeat()
    stopSessionTimer()
    clearTimeout(autoDisconnectTimeout)
  }
}

// Send message logic
document.getElementById('sendBtn').addEventListener('click', sendMessage)
document.getElementById('messageInput').addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    sendMessage()
  }
})

function sendMessage() {
  const messageInput = document.getElementById('messageInput')
  const message = messageInput.value.trim()

  if (message === '' || !socket || socket.readyState !== WebSocket.OPEN) {
    return
  }

  const chatMessage = {
    action: 'sendmessage',
    message: message
  }

  socket.send(JSON.stringify(chatMessage))
  messageInput.value = ''
}

function updateStatus(text, statusClass) {
  document.getElementById('statusText').textContent = text
  document.getElementById('statusIcon').className = `status ${statusClass}`
}

function addMessageToChat(message) {
  const chatLog = document.getElementById('chatLog')
  chatLog.value += message + '\n'
  chatLog.scrollTop = chatLog.scrollHeight
}

// Heartbeat every 30 seconds
function startHeartbeat() {
  if (heartbeatInterval) return

  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const heartbeatMessage = {
        action: 'sendmessage',
        message: 'ping'
      }
      socket.send(JSON.stringify(heartbeatMessage))
      console.log('Sent heartbeat (ping) to keep WebSocket alive')
    }
  }, 30000) // 30 seconds
}

function stopHeartbeat() {
  clearInterval(heartbeatInterval)
  heartbeatInterval = null
}

// Session timer
function startSessionTimer() {
  sessionTimer = setInterval(() => {
    elapsedTime++
    updateSessionTimer()
  }, 1000)
}

function stopSessionTimer() {
  clearInterval(sessionTimer)
  sessionTimer = null
}

function updateSessionTimer() {
  document.getElementById('sessionDuration').textContent = elapsedTime
}

// Auto-disconnect handling
document
  .getElementById('autoDisconnectCheck')
  .addEventListener('change', function () {
    const autoDisconnectTimeInput =
      document.getElementById('autoDisconnectTime')
    autoDisconnectTimeInput.disabled = !this.checked
    handleAutoDisconnect()
  })

document
  .getElementById('autoDisconnectTime')
  .addEventListener('input', handleAutoDisconnect)

function handleAutoDisconnect() {
  clearTimeout(autoDisconnectTimeout)

  if (document.getElementById('autoDisconnectCheck').checked) {
    const time =
      parseInt(document.getElementById('autoDisconnectTime').value) * 1000
    autoDisconnectTimeout = setTimeout(() => {
      if (socket) socket.close()
      addMessageToChat('Auto-disconnected due to session timeout.')
    }, time)
  }
}

// Logout Button
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear()
  window.location.href = 'index.html'
})

// Check login status
function updateLoginStatus() {
  const loginStateElement = document.getElementById('loginState')
  const token = localStorage.getItem('authToken')

  if (token) {
    loginStateElement.textContent = 'Logged in'
  } else {
    loginStateElement.textContent = 'Not logged in'
  }
}

// Token countdown logic
function updateTokenCountdown() {
  const countdownElement = document.getElementById('tokenCountdown')
  const exp = parseInt(localStorage.getItem('exp'), 10)

  if (!exp || isNaN(exp)) {
    countdownElement.textContent = 'No token information available'
    return
  }

  const now = Math.floor(Date.now() / 1000)
  const remaining = exp - now

  if (remaining > 0) {
    countdownElement.textContent = `${remaining} seconds remaining`
  } else {
    countdownElement.textContent = 'Token is no longer valid'
  }
}

// Start interval for login status and token countdown
document.addEventListener('DOMContentLoaded', () => {
  updateLoginStatus()
  updateTokenCountdown()
  setInterval(updateTokenCountdown, 1000)
})
