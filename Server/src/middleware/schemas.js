const { z } = require('zod')

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

const configSchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  workingDays: z
    .array(
      z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    )
    .min(1, 'Select at least one working day'),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  periodDuration: z.coerce
    .number()
    .int()
    .min(30, 'Minimum period duration is 30 minutes')
    .max(90, 'Maximum period duration is 90 minutes'),
  periodsBeforeLunch: z.coerce.number().int().min(1),
  periodsAfterLunch: z.coerce.number().int().min(1),
  lunchDuration: z.coerce.number().int().min(10).max(90).default(30),
  lunchLabel: z.string().default('Lunch Break'),
  courses: z.array(z.string()).default([]),
})

const generateSchema = z.object({
  configId: z.string().min(1, 'configId is required'),
})

module.exports = { teacherSchema, courseSchema, configSchema, generateSchema, registerSchema, loginSchema }