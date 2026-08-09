const express = require('express')
const router = express.Router()
const { accept, generate, getTimetable, getTimetableBySemester, deleteTimetable } = require('../controllers/timetableController')
const validate = require('../middleware/validate')
const authMiddleware = require('../middleware/authMiddleware')
const { acceptSchema, generateSchema } = require('../middleware/schemas')
const { createGenerationGuard } = require('../middleware/generationGuard')

const generationGuard = createGenerationGuard()

router.use(authMiddleware)

router.post('/generate', validate(generateSchema), generationGuard, generate)
router.post('/accept',   validate(acceptSchema), accept)
router.get('/',          getTimetableBySemester)
router.get('/:id',       getTimetable)
router.delete('/:id',    deleteTimetable)

module.exports = router
