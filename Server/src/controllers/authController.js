const jwt = require('jsonwebtoken')
const Department = require('../models/Department')
const asyncWrapper = require('../middleware/asyncWrapper')

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// POST /api/auth/register
const register = asyncWrapper(async (req, res) => {
  const { name, email, password } = req.body

  // Check if email already exists
  const existing = await Department.findOne({ email })
  if (existing) {
    return res.status(400).json({ message: 'An account with this email already exists.' })
  }

  const department = await Department.create({ name, email, password })
  const token = signToken(department._id)

  res.status(201).json({
    token,
    department,
  })
})

// POST /api/auth/login
const login = asyncWrapper(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  // Find department and include password for comparison
  const department = await Department.findOne({ email }).select('+password')
  if (!department) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const isMatch = await department.comparePassword(password)
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const token = signToken(department._id)

  // Remove password from response
  department.password = undefined

  res.json({ token, department })
})

// GET /api/auth/me
const getMe = asyncWrapper(async (req, res) => {
  res.json(req.department)
})

module.exports = { register, login, getMe }