require('dotenv').config()
const { loadEnvironment } = require('./config/env')

let env
try {
  env = loadEnvironment()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const connectDB = require('./config/db')

const authRoutes      = require('./routes/auth')
const courseRoutes    = require('./routes/courses')
const teacherRoutes   = require('./routes/teachers')
const timetableRoutes = require('./routes/timetable')
const errorHandler    = require('./middleware/errorHandler')

const app = express()

// Middleware
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json())

// Routes
app.use('/api/auth',      authRoutes)
app.use('/api/courses',   courseRoutes)
app.use('/api/teachers',  teacherRoutes)
app.use('/api/timetable', timetableRoutes)

// Health check
app.get('/api/health', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'error', message: 'Database is not ready' })
  }
  res.json({ status: 'ok', message: 'Timetable Scheduler API is running' })
})

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

// Global error handler
app.use(errorHandler)

async function startServer() {
  try {
    await connectDB(env.MONGODB_URI)
    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${env.PORT}`)
    })
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`)
    process.exit(1)
  }
}

startServer()
