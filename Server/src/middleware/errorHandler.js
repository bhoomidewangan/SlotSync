const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`)

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ message: messages.join(', ') })
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' })
  }

  // Zod validation error (thrown manually)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  // Custom app errors with a status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message })
  }

  // Default 500
  res.status(500).json({ message: err.message || 'Internal server error' })
}

module.exports = errorHandler