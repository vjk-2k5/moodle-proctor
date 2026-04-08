let uploadSession = null
let countdownTimerId = null

function escapeHtml (value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateTime (value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString()
}

function formatCountdown (expiresAt) {
  const remainingMs = Math.max(0, Number(expiresAt || 0) - Date.now())
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (totalSeconds <= 0) {
    return 'Expired'
  }

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function setStatusBadge (status) {
  const badge = document.getElementById('uploadSessionStatusBadge')

  if (!badge) {
    return
  }

  const normalizedStatus = String(status || 'awaiting_upload')
  const labelMap = {
    awaiting_upload: 'Awaiting upload',
    upload_in_progress: 'Upload in progress',
    uploaded: 'Uploaded',
    expired: 'Expired'
  }

  badge.textContent = labelMap[normalizedStatus] || 'Awaiting upload'
  badge.className = `upload-session-badge upload-session-badge-${normalizedStatus}`
}

function renderUploadSession (session) {
  uploadSession = session
  setStatusBadge(session.status)

  const qrImage = document.getElementById('uploadSessionQrImage')
  const qrFallback = document.getElementById('uploadSessionQrFallback')
  const mobileLink = document.getElementById('uploadSessionMobileLink')
  const student = document.getElementById('uploadSessionStudent')
  const exam = document.getElementById('uploadSessionExam')
  const attempt = document.getElementById('uploadSessionAttempt')
  const token = document.getElementById('uploadSessionToken')
  const windowNode = document.getElementById('uploadSessionWindow')
  const countdown = document.getElementById('uploadSessionCountdown')
  const acceptedFiles = document.getElementById('uploadSessionAcceptedFiles')

  if (qrImage && session.qrCodeDataUrl) {
    qrImage.src = session.qrCodeDataUrl
    qrImage.hidden = false
    if (qrFallback) {
      qrFallback.hidden = true
    }
  } else if (qrFallback) {
    qrFallback.hidden = false
  }

  if (mobileLink) {
    mobileLink.href = session.mobileEntryUrl || '#'
    mobileLink.textContent = session.mobileEntryUrl || 'Mobile upload link unavailable'
  }

  if (student) {
    student.innerHTML = `${escapeHtml(session.student?.name || 'Student')}<br><span>${escapeHtml(session.student?.email || '')}</span>`
  }

  if (exam) {
    const examName = escapeHtml(session.exam?.name || 'Exam')
    const courseName = escapeHtml(session.exam?.courseName || '')
    exam.innerHTML = courseName ? `${examName}<br><span>${courseName}</span>` : examName
  }

  if (attempt) {
    const attemptId = session.attempt?.id ? `#${escapeHtml(session.attempt.id)}` : 'Not available'
    const submittedAt = formatDateTime(session.attempt?.submittedAt)
    attempt.innerHTML = `${attemptId}<br><span>${escapeHtml(submittedAt)}</span>`
  }

  if (token) {
    token.textContent = session.token || 'Unavailable'
  }

  if (windowNode) {
    windowNode.textContent = `${session.uploadWindowMinutes || 0} minutes`
  }

  if (acceptedFiles) {
    acceptedFiles.textContent = (session.acceptedFileTypes || ['application/pdf']).join(', ')
  }

  if (countdown) {
    countdown.textContent = formatCountdown(session.expiresAt)
  }

  if (countdownTimerId) {
    clearInterval(countdownTimerId)
  }

  countdownTimerId = window.setInterval(() => {
    if (!uploadSession) {
      return
    }

    const countdownNode = document.getElementById('uploadSessionCountdown')
    if (countdownNode) {
      countdownNode.textContent = formatCountdown(uploadSession.expiresAt)
    }

    if (Date.now() >= Number(uploadSession.expiresAt || 0)) {
      uploadSession.status = 'expired'
      setStatusBadge('expired')
      clearInterval(countdownTimerId)
      countdownTimerId = null
    }
  }, 1000)
}

function renderMissingSession () {
  setStatusBadge('expired')

  const fallback = document.getElementById('uploadSessionQrFallback')
  const card = document.querySelector('.upload-session-card-copy')

  if (fallback) {
    fallback.textContent = 'No active upload session'
    fallback.hidden = false
  }

  if (card) {
    card.textContent = 'The upload session was not available. Return to the dashboard and submit the exam again if you need to recreate it.'
  }
}

async function initializeUploadSessionPage () {
  const backButton = document.getElementById('uploadSessionBackButton')
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location = 'dashboard.html'
    })
  }

  try {
    const session = await window.electronAPI?.getScanSession?.()

    if (!session) {
      renderMissingSession()
      return
    }

    renderUploadSession(session)
  } catch (error) {
    console.error('Failed to load upload session:', error)
    renderMissingSession()
  }
}

window.addEventListener('beforeunload', () => {
  if (countdownTimerId) {
    clearInterval(countdownTimerId)
  }
})

document.addEventListener('DOMContentLoaded', initializeUploadSessionPage)
