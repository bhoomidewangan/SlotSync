const { z } = require('zod')
const { scheduleProposalSchema } = require('../schemas/scheduleProposal')

const registerSchema = z.object({
  name:     z.string().min(1, 'Department name is required').trim(),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})


const teacherSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  subjects: z
    .array(z.string().min(1))
    .min(1, 'At least one subject is required'),
})

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required').trim(),
  semester: z.coerce
    .number()
    .int()
    .min(1, 'Semester must be between 1 and 8')
    .max(8, 'Semester must be between 1 and 8'),
  teacher: z.string().min(1, 'Teacher is required'),
  sessionsPerWeek: z.coerce
    .number()
    .int()
    .min(1, 'Must be at least 1 session per week')
    .max(6, 'Cannot exceed 6 sessions per week'),
  periodsPerSession: z.coerce
    .number()
    .int()
    .min(1, 'Must be at least 1 period per session')
    .max(3, 'Cannot exceed 3 consecutive periods'),
})

const generateSchema = z.object({
  semester: z.coerce
    .number()
    .int()
    .min(1, 'Semester must be between 1 and 8')
    .max(8, 'Semester must be between 1 and 8'),
}).strict()

const acceptSchema = z.object({
  semester: z.coerce
    .number()
    .int()
    .min(1, 'Semester must be between 1 and 8')
    .max(8, 'Semester must be between 1 and 8'),
  proposal: scheduleProposalSchema,
  proposalToken: z.string().min(1, 'Proposal token is required'),
}).strict()

module.exports = { acceptSchema, teacherSchema, courseSchema, generateSchema, registerSchema, loginSchema }
