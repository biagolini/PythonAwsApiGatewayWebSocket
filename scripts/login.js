// scripts/login.js

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken')
  const isAnonymous = localStorage.getItem('anonymousUser') === 'true'

  if (token && isTokenValid(token)) {
    storeJwtPayloadFields(token) // <-- Extra: parse and store payload fields
    showLoggedInSection()
    startRedirectCountdown()
  } else if (isAnonymous) {
    showLoggedInSection()
    startRedirectCountdown()
  } else {
    showLoginSection()
  }
})

// UI Sections
function showLoginSection() {
  document.getElementById('login-section').classList.remove('hidden')
  document.getElementById('loggedin-section').classList.add('hidden')
}

function showLoggedInSection() {
  document.getElementById('login-section').classList.add('hidden')
  document.getElementById('loggedin-section').classList.remove('hidden')
}

// Validate JWT Expiration
function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch (e) {
    return false
  }
}

// Store all payload fields in localStorage
function storeJwtPayloadFields(token) {
  try {
    const payloadBase64 = token.split('.')[1]
    const decodedPayload = JSON.parse(atob(payloadBase64))

    for (const [key, value] of Object.entries(decodedPayload)) {
      localStorage.setItem(key, String(value))
    }
  } catch (e) {
    console.error('Failed to parse and store JWT payload:', e)
  }
}

// Login Button Handler
document.getElementById('loginButton').addEventListener('click', async () => {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  const user = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value

  const errorDiv = document.getElementById('loginError')
  errorDiv.textContent = ''

  if (!apiUrl || !user || !password) {
    errorDiv.textContent = 'Please fill in all fields.'
    return
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user,
        password: password
      })
    })

    const result = await response.json()

    if (result.statusCode === 200 && result.body) {
      const body = JSON.parse(result.body)
      const token = body.token

      if (token) {
        localStorage.setItem('authToken', token)
        localStorage.removeItem('anonymousUser')

        // Parse and store payload fields
        storeJwtPayloadFields(token)

        showLoggedInSection()
        startRedirectCountdown()
      } else {
        errorDiv.textContent = 'Login failed: Token not found in response.'
      }
    } else {
      const message = result.body
        ? JSON.parse(result.body).message
        : 'Unknown error'
      errorDiv.textContent = `Login failed: ${message}`
    }
  } catch (error) {
    errorDiv.textContent = 'Network error. Please verify the API URL.'
    console.error('Login error:', error)
  }
})

// Guest Access
document.getElementById('guestButton').addEventListener('click', () => {
  localStorage.setItem('anonymousUser', 'true')
  localStorage.removeItem('authToken')
  showLoggedInSection()
  startRedirectCountdown()
})

// Logout Button
document.getElementById('logoutButton').addEventListener('click', () => {
  localStorage.clear()
  location.reload()
})

// Immediate Go Button
document.getElementById('goNowButton').addEventListener('click', () => {
  window.location.href = 'chat.html'
})

// Countdown Redirect
let countdown = 5
function startRedirectCountdown() {
  const countdownElement = document.getElementById('countdown')
  const interval = setInterval(() => {
    countdown--
    countdownElement.textContent = countdown
    if (countdown <= 0) {
      clearInterval(interval)
      window.location.href = 'chat.html'
    }
  }, 1000)
}
