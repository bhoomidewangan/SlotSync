const express = require('express')
const router = express.Router()
const { register, login, getMe } = require('../controllers/authController')
const authMiddleware = require('../middleware/authMiddleware')
const validate = require('../middleware/validate')
const { registerSchema, loginSchema } = require('../middleware/schemas')

router.post('/register', validate(registerSchema), register)
router.post('/login',    validate(loginSchema),    login)
router.get('/me',        authMiddleware,            getMe)

module.exports = router