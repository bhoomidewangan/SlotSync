import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import ConfigForm from '@/components/forms/ConfigForm'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/toaster'
import timetableService from '@/services/timetableService'
import courseService from '@/services/courseService'
import useAppStore from '@/store/useAppStore'

export default function Configure() {
  const { selectedSemester, setSelectedSemester, configId, setConfigId, setGeneratedTimetable } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: existingConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['config', selectedSemester],
    queryFn: () => timetableService.getConfigBySemester(selectedSemester),
    retry: false,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['courses', selectedSemester],
    queryFn: () => courseService.getAll(selectedSemester),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => timetableService.saveConfig({
      ...data,
      semester: selectedSemester,
      courses: courses.map(c => c._id),
    }),
    onSuccess: (data) => {
      setConfigId(data._id)
      queryClient.invalidateQueries({ queryKey: ['config', selectedSemester] })
      toast({ title: 'Configuration saved', description: 'Ready to generate timetable.' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => {
      const id = existingConfig?._id || configId
      if (!id) throw new Error('Save a configuration first.')
      return timetableService.generate(id)
    },
    onSuccess: (data) => {
      setGeneratedTimetable(data)
      toast({ title: 'Timetable generated!', description: 'Redirecting to timetable view.' })
      setTimeout(() => navigate('/timetable'), 800)
    },
    onError: (err) => {
      toast({ title: 'Could not generate timetable', description: err.message, variant: 'destructive' })
    },
  })

  const hasConfig = !!(existingConfig?._id || configId)

  return (
    <div className="p-8 max-w-2xl">
      <Toaster />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Configure</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set time slots and lunch break, then generate the timetable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Semester</Label>
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
        </div>
      </div>

      {/* Courses summary */}
      <Card className="mb-6">
        <CardContent className="py-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {courses.length} course{courses.length !== 1 ? 's' : ''}
            </span>{' '}
            found for Semester {selectedSemester}.{' '}
            {courses.length === 0 && (
              <span className="text-amber-600">Add courses before generating.</span>
            )}
          </p>

          {/* Generate button */}
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!hasConfig || courses.length === 0 || generateMutation.isPending}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Timetable'}
          </Button>
        </CardContent>
      </Card>

      {loadingConfig ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <ConfigForm
          onSuccess={saveMutation.mutateAsync}
          existingConfig={existingConfig}
        />
      )}
    </div>
  )
}