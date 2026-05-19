const express = require('express')
const router = express.Router()
const { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacherController')
const validate = require('../middleware/validate')
const authMiddleware = require('../middleware/authMiddleware')
const { teacherSchema } = require('../middleware/schemas')

router.use(authMiddleware)   // all teacher routes require login

router.get('/',       getAllTeachers)
router.get('/:id',    getTeacherById)
router.post('/',      validate(teacherSchema), createTeacher)
router.put('/:id',    validate(teacherSchema), updateTeacher)
router.delete('/:id', deleteTeacher)

module.exports = router
