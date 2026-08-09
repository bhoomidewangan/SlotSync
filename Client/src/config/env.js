function requiredUrl(name, value) {
  if (!value || !value.trim()) throw new Error(`${name} is required.`)
  if (/YOUR-|REPLACE_/i.test(value)) throw new Error(`${name} still contains a placeholder value.`)
  try {
    return new URL(value).toString().replace(/\/+$/, '')
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`)
  }
}

function positiveInteger(name, value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return parsed
}

export const clientEnv = Object.freeze({
  apiUrl: requiredUrl('VITE_API_URL', import.meta.env.VITE_API_URL),
  apiTimeoutMs: positiveInteger('VITE_API_TIMEOUT_MS', import.meta.env.VITE_API_TIMEOUT_MS),
})
