const Teacher = require('../models/Teacher')

function ownershipError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

async function assertTeacherBelongsToDepartment({ teacherId, departmentId, TeacherModel = Teacher }) {
  const teacher = await TeacherModel.findOne({ _id: teacherId, department: departmentId })
  if (!teacher) {
    throw ownershipError('The selected teacher does not belong to this department.')
  }
  return teacher
}

module.exports = { assertTeacherBelongsToDepartment, ownershipError }
