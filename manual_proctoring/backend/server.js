console.error(
  [
    'This legacy manual_proctoring backend has been archived.',
    'Do not run manual_proctoring/backend/server.js.',
    'Start the unified backend instead:',
    '  cd backend',
    '  npm run dev',
    '',
    'The archived implementation is preserved in manual_proctoring/backend/server.legacy.js.'
  ].join('\n')
)

process.exit(1)
