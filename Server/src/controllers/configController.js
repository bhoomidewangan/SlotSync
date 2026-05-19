const ScheduleConfig = require('../models/ScheduleConfig')
const asyncWrapper = require('../middleware/asyncWrapper')

// POST /api/config
const saveConfig = asyncWrapper(async (req, res) => {
  const {
    semester, workingDays, startTime, periodDuration,
    periodsBeforeLunch, periodsAfterLunch, lunchDuration, lunchLabel, courses,
  } = req.body

  const existing = await ScheduleConfig.findOne({ semester, department: req.department._id })
  if (existing) {
    const updated = await ScheduleConfig.findByIdAndUpdate(
      existing._id,
      { workingDays, startTime, periodDuration, periodsBeforeLunch, periodsAfterLunch, lunchDuration, lunchLabel, courses },
      { new: true, runValidators: true }
    )
    return res.json(updated)
  }

  const config = await ScheduleConfig.create({
    semester, workingDays, startTime, periodDuration,
    periodsBeforeLunch, periodsAfterLunch, lunchDuration, lunchLabel, courses,
    department: req.department._id,
  })
  res.status(201).json(config)
})

const getConfig = asyncWrapper(async (req, res) => {
  const config = await ScheduleConfig.findOne({ _id: req.params.id, department: req.department._id })
    .populate({ path: 'courses', populate: { path: 'teacher', select: 'name' } })
  if (!config) return res.status(404).json({ message: 'Config not found' })
  res.json(config)
})

const getConfigBySemester = asyncWrapper(async (req, res) => {
  const { semester } = req.query
  if (!semester) return res.status(400).json({ message: 'semester query param required' })
  const config = await ScheduleConfig.findOne({ semester: Number(semester), department: req.department._id })
    .populate({ path: 'courses', populate: { path: 'teacher', select: 'name' } })
  if (!config) return res.status(404).json({ message: 'No config found for this semester' })
  res.json(config)
})

module.exports = { saveConfig, getConfig, getConfigBySemester }