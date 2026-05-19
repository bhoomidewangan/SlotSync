const express = require('express')
const router = express.Router()
const { generate, getTimetable, getTimetableBySemester, deleteTimetable } = require('../controllers/timetableController')
const validate = require('../middleware/validate')
const authMiddleware = require('../middleware/authMiddleware')
const { generateSchema } = require('../middleware/schemas')

router.use(authMiddleware)

router.post('/generate', validate(generateSchema), generate)
router.get('/',          getTimetableBySemester)
router.get('/:id',       getTimetable)
router.delete('/:id',    deleteTimetable)

module.exports = router
