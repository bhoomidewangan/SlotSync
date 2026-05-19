import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const teacherSchema = z.object({
  name: z.string().min(1, 'Teacher name is required').trim(),
  subjectInput: z.string().optional(),
})

export default function TeacherForm({ onSuccess, editData = null, onCancel }) {
  const [subjects, setSubjects] = useState(editData?.subjects || [])
  const [subjectError, setSubjectError] = useState('')

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: editData?.name || '',
      subjectInput: '',
    },
  })

  const addSubject = () => {
    const val = getValues('subjectInput').trim()
    if (!val) return
    if (subjects.includes(val)) {
      setSubjectError('Subject already added')
      return
    }
    setSubjects(prev => [...prev, val])
    setValue('subjectInput', '')
    setSubjectError('')
  }

  const removeSubject = (subject) => {
    setSubjects(prev => prev.filter(s => s !== subject))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSubject()
    }
  }

  const onSubmit = async (data) => {
    if (subjects.length === 0) {
      setSubjectError('At least one subject is required')
      return
    }
    await onSuccess({ name: data.name, subjects })
    if (!editData) {
      reset()
      setSubjects([])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editData ? 'Edit Teacher' : 'Add Teacher'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="teacher-name">Teacher Name</Label>
            <Input
              id="teacher-name"
              placeholder="e.g. Dr. Sharma"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Subjects */}
          <div className="space-y-1">
            <Label htmlFor="subject-input">Subjects</Label>
            <div className="flex gap-2">
              <Input
                id="subject-input"
                placeholder="Type a subject and press Enter"
                {...register('subjectInput')}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" variant="outline" onClick={addSubject}>
                Add
              </Button>
            </div>
            {subjectError && (
              <p className="text-sm text-destructive">{subjectError}</p>
            )}

            {/* Subject tags */}
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {subjects.map(subject => (
                  <Badge
                    key={subject}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {subject}
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editData ? 'Update Teacher' : 'Add Teacher'}
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