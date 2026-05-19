const Course = require('../models/Course')
const asyncWrapper = require('../middleware/asyncWrapper')

// GET /api/courses?semester=3
const getAllCourses = asyncWrapper(async (req, res) => {
  const filter = { department: req.department._id }
  if (req.query.semester) filter.semester = Number(req.query.semester)
  const courses = await Course.find(filter).populate('teacher', 'name subjects').sort({ name: 1 })
  res.json(courses)
})

// GET /api/courses/:id
const getCourseById = asyncWrapper(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, department: req.department._id })
    .populate('teacher', 'name subjects')
  if (!course) return res.status(404).json({ message: 'Course not found' })
  res.json(course)
})

// POST /api/courses
const createCourse = asyncWrapper(async (req, res) => {
  const { name, semester, teacher, sessionsPerWeek, periodsPerSession } = req.body
  const course = await Course.create({
    name, semester, teacher, sessionsPerWeek, periodsPerSession,
    department: req.department._id,
  })
  const populated = await course.populate('teacher', 'name subjects')
  res.status(201).json(populated)
})

// PUT /api/courses/:id
const updateCourse = asyncWrapper(async (req, res) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, department: req.department._id },
    req.body,
    { new: true, runValidators: true }
  ).populate('teacher', 'name subjects')
  if (!course) return res.status(404).json({ message: 'Course not found' })
  res.json(course)
})

// DELETE /api/courses/:id
const deleteCourse = asyncWrapper(async (req, res) => {
  const course = await Course.findOneAndDelete({ _id: req.params.id, department: req.department._id })
  if (!course) return res.status(404).json({ message: 'Course not found' })
  res.json({ message: 'Course deleted' })
})


module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse }