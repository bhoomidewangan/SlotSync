require('dotenv').config()
const mongoose = require('mongoose')
const {
  inspectLegacySchedulingData,
  resetLegacySchedulingData,
} = require('../src/services/timetableMigrationService')

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.')
  await mongoose.connect(process.env.MONGODB_URI)

  const counts = await inspectLegacySchedulingData({ connection: mongoose.connection })
  console.log('Scheduling records found:', counts)

  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Run with --apply to delete legacy scheduling data and rebuild indexes.')
    return
  }

  const removed = await resetLegacySchedulingData({
    connection: mongoose.connection,
    mongooseClient: mongoose,
  })
  console.log('Legacy scheduling data removed and indexes rebuilt:', removed)
}

main()
  .catch((error) => {
    console.error(`Timetable migration failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
