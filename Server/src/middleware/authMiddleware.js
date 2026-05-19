const jwt = require('jsonwebtoken')
const Department = require('../models/Department')

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' })
    }

    const token = authHeader.split(' ')[1]

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Attach department to request
    const department = await Department.findById(decoded.id)
    if (!department) {
      return res.status(401).json({ message: 'Department no longer exists.' })
    }

    req.department = department
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' })
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' })
    }
    next(err)
  }
}

module.exports = authMiddleware