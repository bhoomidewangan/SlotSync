import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import TeacherForm from '@/components/forms/TeacherForm'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/toaster'
import teacherService from '@/services/teacherService'

export default function Teachers() {
  const [editData, setEditData] = useState(null)
  const [showForm, setShowForm] = useState(true)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: teacherService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast({ title: 'Teacher added', description: 'Teacher saved successfully.' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teacherService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast({ title: 'Teacher updated' })
      setEditData(null)
      setShowForm(false)
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast({ title: 'Teacher deleted' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const handleSuccess = async (data) => {
    if (editData) {
      await updateMutation.mutateAsync({ id: editData._id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleEdit = (teacher) => {
    setEditData(teacher)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (id) => {
    if (confirm('Delete this teacher?')) deleteMutation.mutate(id)
  }

  return (
    <div className="p-8 max-w-4xl">
      <Toaster />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Teachers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add teachers and the subjects they teach.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditData(null); setShowForm(true) }}>
            Add Teacher
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <TeacherForm
            onSuccess={handleSuccess}
            editData={editData}
            onCancel={editData ? () => { setEditData(null); setShowForm(false) } : null}
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

        {!isLoading && teachers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No teachers yet. Add one above.
            </CardContent>
          </Card>
        )}

        {teachers.map(teacher => (
          <Card key={teacher._id}>
            <CardContent className="py-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{teacher.name}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {teacher.subjects.map(subject => (
                    <Badge key={subject} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => handleEdit(teacher)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={() => handleDelete(teacher._id)}
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