const mongoose = require('mongoose')

const connectDB = async (mongoUri) => {
  const conn = await mongoose.connect(mongoUri)
  console.log(`MongoDB connected: ${conn.connection.host}`)
  return conn
}

module.exports = connectDB
