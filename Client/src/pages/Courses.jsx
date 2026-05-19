import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import CourseForm from '@/components/forms/CourseForm'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/toaster'
import courseService from '@/services/courseService'
import useAppStore from '@/store/useAppStore'

export default function Courses() {
  const { selectedSemester, setSelectedSemester } = useAppStore()
  const [editData, setEditData] = useState(null)
  const [showForm, setShowForm] = useState(true)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', selectedSemester],
    queryFn: () => courseService.getAll(selectedSemester),
  })

  const createMutation = useMutation({
    mutationFn: courseService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast({ title: 'Course added' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => courseService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast({ title: 'Course updated' })
      setEditData(null)
      setShowForm(false)
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: courseService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast({ title: 'Course deleted' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const handleSuccess = async (data) => {
    if (editData) {
      await updateMutation.mutateAsync({ id: editData._id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleEdit = (course) => {
    setEditData(course)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (id) => {
    if (confirm('Delete this course?')) deleteMutation.mutate(id)
  }

  return (
    <div className="p-8 max-w-4xl">
      <Toaster />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add courses and assign teachers for each semester.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(selectedSemester)}
            onValueChange={(v) => setSelectedSemester(Number(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8].map(s => (
                <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!showForm && (
            <Button onClick={() => { setEditData(null); setShowForm(true) }}>
              Add Course
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mb-8">
          <CourseForm
            onSuccess={handleSuccess}
            editData={editData}
            defaultSemester={selectedSemester}
            onCancel={editData ? () => { setEditData(null); setShowForm(false) } : null}
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {courses.length} course{courses.length !== 1 ? 's' : ''} in Semester {selectedSemester}
          </span>
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

        {!isLoading && courses.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No courses for Semester {selectedSemester} yet. Add one above.
            </CardContent>
          </Card>
        )}

        {courses.map(course => (
          <Card key={course._id}>
            <CardContent className="py-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium">{course.name}</p>
                <p className="text-sm text-muted-foreground">
                  {course.teacher?.name || 'No teacher assigned'}
                </p>
                <div className="flex gap-2 flex-wrap mt-1">
                  <Badge variant="outline" className="text-xs">
                    Sem {course.semester}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {course.sessionsPerWeek}x/week
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {course.periodsPerSession} period{course.periodsPerSession > 1 ? 's' : ''}/session
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => handleEdit(course)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={() => handleDelete(course._id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}