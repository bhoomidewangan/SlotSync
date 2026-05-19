const Timetable = require('../models/Timetable')
const ScheduleConfig = require('../models/ScheduleConfig')
const asyncWrapper = require('../middleware/asyncWrapper')
const { generateSchedule } = require('../algorithm')

const generate = asyncWrapper(async (req, res) => {
  const { configId } = req.body

  const config = await ScheduleConfig.findOne({
    _id: configId,
    department: req.department._id,
  }).populate({ path: 'courses', populate: { path: 'teacher', select: 'name _id' } })

  if (!config) {
    return res.status(404).json({ message: 'Config not found. Save a configuration first.' })
  }

  let result
  try {
    result = generateSchedule(config)
  } catch (err) {
    return res.status(422).json({ message: err.message })
  }

  await Timetable.deleteMany({ semester: config.semester, department: req.department._id })

  const timetable = await Timetable.create({
    config: config._id,
    semester: config.semester,
    generatedAt: new Date(),
    schedule: result,
    department: req.department._id,
  })

  res.status(201).json(timetable)
})

const getTimetable = asyncWrapper(async (req, res) => {
  const timetable = await Timetable.findOne({ _id: req.params.id, department: req.department._id })
    .populate('config')
  if (!timetable) return res.status(404).json({ message: 'Timetable not found' })
  res.json(timetable)
})

const getTimetableBySemester = asyncWrapper(async (req, res) => {
  const { semester } = req.query
  if (!semester) return res.status(400).json({ message: 'semester query param required' })
  const timetable = await Timetable.findOne({ semester: Number(semester), department: req.department._id })
    .sort({ generatedAt: -1 })
    .populate('config')
  if (!timetable) return res.status(404).json({ message: 'No timetable found for this semester' })
  res.json(timetable)
})

const deleteTimetable = asyncWrapper(async (req, res) => {
  const timetable = await Timetable.findOneAndDelete({ _id: req.params.id, department: req.department._id })
  if (!timetable) return res.status(404).json({ message: 'Timetable not found' })
  res.json({ message: 'Timetable deleted' })
})

module.exports = { generate, getTimetable, getTimetableBySemester, deleteTimetable }
