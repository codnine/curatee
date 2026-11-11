export function hasSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  try {
    return new URL(origin).host === requestHost
  } catch {
    return false
  }
}

export function honeypotTriggered(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}
