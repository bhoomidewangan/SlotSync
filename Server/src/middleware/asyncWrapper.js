// Wraps async route handlers so you don't need try/catch in every controller.
// Usage: router.get('/', asyncWrapper(async (req, res) => { ... }))
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncWrapper