require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

const authRoutes      = require('./routes/auth')
const courseRoutes    = require('./routes/courses')
const teacherRoutes   = require('./routes/teachers')
const timetableRoutes = require('./routes/timetable')
const errorHandler    = require('./middleware/errorHandler')

const app = express()

// Connect to MongoDB
connectDB()

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())

// Routes
app.use('/api/auth',      authRoutes)
app.use('/api/courses',   courseRoutes)
app.use('/api/teachers',  teacherRoutes)
app.use('/api/timetable', timetableRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Timetable Scheduler API is running' })
})

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

// Global error handler
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
