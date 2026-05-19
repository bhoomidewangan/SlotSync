const express = require('express')
const router = express.Router()
const { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController')
const validate = require('../middleware/validate')
const authMiddleware = require('../middleware/authMiddleware')
const { courseSchema } = require('../middleware/schemas')

router.use(authMiddleware)

router.get('/',       getAllCourses)
router.get('/:id',    getCourseById)
router.post('/',      validate(courseSchema), createCourse)
router.put('/:id',    validate(courseSchema), updateCourse)
router.delete('/:id', deleteCourse)

module.exports = router
