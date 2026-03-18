const APP_CONFIG = {
  apiBaseUrl: 'http://localhost:5000'
}

const API_BASE_URL = APP_CONFIG.apiBaseUrl

function getStoredSession() {
  const rawSession = localStorage.getItem('authSession')

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession)
  } catch (error) {
    clearSession()
    return null
  }
}

function storeSession(session) {
  localStorage.setItem('authSession', JSON.stringify(session))

  if (session?.token) {
    localStorage.setItem('token', session.token)
  }
}

function clearSession() {
  localStorage.removeItem('authSession')
  localStorage.removeItem('token')
}

function setRedirectMessage(message) {
  if (message) {
    sessionStorage.setItem('authRedirectMessage', message)
  }
}

function consumeRedirectMessage() {
  const redirectMessage = sessionStorage.getItem('authRedirectMessage')

  if (!redirectMessage) {
    return null
  }

  sessionStorage.removeItem('authRedirectMessage')
  return redirectMessage
}

function redirectToLogin(message) {
  setRedirectMessage(message)
  window.location = 'login.html'
}

async function fetchWithSession(url, options = {}) {
  const session = getStoredSession()

  if (!session || !session.token) {
    redirectToLogin('Please sign in to continue.')
    return null
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.token}`
    }
  })

  if (response.status === 401) {
    clearSession()
    redirectToLogin('Your session expired. Please sign in again.')
    return null
  }

  return response
}
