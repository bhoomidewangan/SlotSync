import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import teacherService from '@/services/teacherService'

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required').trim(),
  semester: z.coerce.number().int().min(1).max(8),
  teacher: z.string().min(1, 'Please select a teacher'),
  sessionsPerWeek: z.coerce.number().int().min(1, 'Min 1').max(6, 'Max 6'),
  periodsPerSession: z.coerce.number().int().min(1, 'Min 1').max(3, 'Max 3'),
})

export default function CourseForm({ onSuccess, editData = null, onCancel, defaultSemester = 1 }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: editData?.name || '',
      semester: editData?.semester || defaultSemester,
      teacher: editData?.teacher?._id || editData?.teacher || '',
      sessionsPerWeek: editData?.sessionsPerWeek || 3,
      periodsPerSession: editData?.periodsPerSession || 1,
    },
  })

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: teacherService.getAll,
  })

  const onSubmit = async (data) => {
    await onSuccess(data)
    if (!editData) reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editData ? 'Edit Course' : 'Add Course'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Course Name */}
          <div className="space-y-1">
            <Label htmlFor="course-name">Course Name</Label>
            <Input
              id="course-name"
              placeholder="e.g. Data Structures"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Semester */}
          <div className="space-y-1">
            <Label>Semester</Label>
            <Select
              defaultValue={String(editData?.semester || defaultSemester)}
              onValueChange={(val) => setValue('semester', Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.semester && (
              <p className="text-sm text-destructive">{errors.semester.message}</p>
            )}
          </div>

          {/* Teacher */}
          <div className="space-y-1">
            <Label>Teacher</Label>
            <Select
              defaultValue={editData?.teacher?._id || editData?.teacher || ''}
              onValueChange={(val) => setValue('teacher', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTeachers ? 'Loading...' : 'Select teacher'} />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.teacher && (
              <p className="text-sm text-destructive">{errors.teacher.message}</p>
            )}
          </div>

          {/* Sessions per week + Periods per session — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="sessions">Sessions per Week</Label>
              <Input
                id="sessions"
                type="number"
                min={1}
                max={6}
                {...register('sessionsPerWeek')}
              />
              <p className="text-xs text-muted-foreground">How many times per week</p>
              {errors.sessionsPerWeek && (
                <p className="text-sm text-destructive">{errors.sessionsPerWeek.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="periods">Periods per Session</Label>
              <Input
                id="periods"
                type="number"
                min={1}
                max={3}
                {...register('periodsPerSession')}
              />
              <p className="text-xs text-muted-foreground">Consecutive periods each time</p>
              {errors.periodsPerSession && (
                <p className="text-sm text-destructive">{errors.periodsPerSession.message}</p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editData ? 'Update Course' : 'Add Course'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
  )
}