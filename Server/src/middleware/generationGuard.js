function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function createGenerationGuard(options = {}) {
  const now = options.now || Date.now
  const windowMs = positiveInteger(options.windowMs ?? process.env.AI_GENERATION_WINDOW_MS, 60_000)
  const maxRequests = positiveInteger(options.maxRequests ?? process.env.AI_GENERATION_MAX_REQUESTS, 5)
  const departments = new Map()

  return function generationGuard(req, res, next) {
    const departmentId = String(req.department._id)
    const timestamp = now()
    const state = departments.get(departmentId) || { active: false, requests: [] }
    state.requests = state.requests.filter((requestTime) => timestamp - requestTime < windowMs)

    if (state.active) {
      return res.status(409).json({ message: 'A timetable proposal is already being generated for this department.' })
    }
    if (state.requests.length >= maxRequests) {
      return res.status(429).json({ message: 'Too many timetable generation requests. Please try again shortly.' })
    }

    state.active = true
    state.requests.push(timestamp)
    departments.set(departmentId, state)

    const cleanupTimer = setTimeout(() => {
      const current = departments.get(departmentId)
      if (!current || current.active) return
      current.requests = current.requests.filter((requestTime) => now() - requestTime < windowMs)
      if (current.requests.length === 0) departments.delete(departmentId)
    }, windowMs)
    cleanupTimer.unref?.()

    let released = false
    const release = () => {
      if (released) return
      released = true
      state.active = false
      if (state.requests.length === 0) departments.delete(departmentId)
    }
    res.once('finish', release)
    res.once('close', release)
    next()
  }
}

module.exports = { createGenerationGuard }
