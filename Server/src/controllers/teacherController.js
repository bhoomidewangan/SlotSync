const Teacher = require('../models/Teacher')
const asyncWrapper = require('../middleware/asyncWrapper')
const Course = require('../models/Course')
const TeacherBooking = require('../models/TeacherBooking')
const { assertTeacherCanBeDeleted } = require('../services/deletionSafetyService')

// GET /api/teachers
const getAllTeachers = asyncWrapper(async (req, res) => {
  const teachers = await Teacher.find({ department: req.department._id }).sort({ name: 1 })
  res.json(teachers)
})


// GET /api/teachers/:id
const getTeacherById = asyncWrapper(async (req, res) => {
  const teacher = await Teacher.findOne({ _id: req.params.id, department: req.department._id })
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' })
  res.json(teacher)
})

// POST /api/teachers
const createTeacher = asyncWrapper(async (req, res) => {
  const { name, subjects } = req.body
  const teacher = await Teacher.create({ name, subjects, department: req.department._id })
  res.status(201).json(teacher)
})


// PUT /api/teachers/:id
const updateTeacher = asyncWrapper(async (req, res) => {
  const teacher = await Teacher.findOneAndUpdate(
    { _id: req.params.id, department: req.department._id },
    req.body,
    { new: true, runValidators: true }
  )
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' })
  res.json(teacher)
})


// DELETE /api/teachers/:id
const deleteTeacher = asyncWrapper(async (req, res) => {
  const ownedTeacher = await Teacher.findOne({ _id: req.params.id, department: req.department._id })
  if (!ownedTeacher) return res.status(404).json({ message: 'Teacher not found' })
  await assertTeacherCanBeDeleted({
    teacherId: ownedTeacher._id,
    departmentId: req.department._id,
    models: { Course, TeacherBooking },
  })
  const teacher = await Teacher.findOneAndDelete({ _id: req.params.id, department: req.department._id })
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' })
  res.json({ message: 'Teacher deleted' })
})


module.exports = { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher }
