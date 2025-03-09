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
  updateStatus('Connecting...', 'connecting')
  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    updateStatus('Connected', 'connected')

    // Store connection timestamp
    const currentTime = new Date().toISOString()
    document.getElementById('connectedTime').textContent = currentTime

    // Reset session timer
    elapsedTime = 0
    updateSessionTimer()
    startSessionTimer()

    // Start heartbeat
    startHeartbeat()

    // Handle auto-disconnect if enabled
    handleAutoDisconnect()
  }

  socket.onmessage = event => {
    console.log('Message Received:', event.data)
    const data = JSON.parse(event.data)

    // Ignore "pong" messages
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
