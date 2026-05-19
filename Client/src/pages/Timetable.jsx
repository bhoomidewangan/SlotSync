import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Download, RefreshCw, CalendarDays, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import TimetableGrid from '@/components/timetable/TimetableGrid'
import PrintView from '@/components/timetable/PrintView'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/toaster'
import { exportTimetable } from '@/utils/pdfExport'
import timetableService from '@/services/timetableService'
import useAppStore from '@/store/useAppStore'

export default function Timetable() {
  const { selectedSemester, setSelectedSemester, configId } = useAppStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const printRef = useRef()
  const [exporting, setExporting] = useState(false)

  // Fetch timetable for selected semester
  const {
    data: timetable,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['timetable', selectedSemester],
    queryFn: () => timetableService.getTimetableBySemester(selectedSemester),
    retry: false,
  })

  // Regenerate
  const regenerateMutation = useMutation({
    mutationFn: () => {
      if (!configId) throw new Error('No config found. Go to Configure first.')
      return timetableService.generate(configId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedSemester] })
      toast({ title: 'Timetable regenerated!' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const handleExport = async () => {
    try {
      setExporting(true)
      await exportTimetable(printRef, selectedSemester)
      toast({ title: 'PDF downloaded!' })
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-8">
      <Toaster />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and export the generated timetable.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Semester selector */}
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

          {/* Regenerate */}
          <Button
            variant="outline"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || !configId}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>

          {/* Download PDF */}
          <Button
            onClick={handleExport}
            disabled={!timetable || exporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Loading timetable...
          </CardContent>
        </Card>
      )}

      {/* Error / no timetable */}
      {isError && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <div>
              <p className="font-medium text-amber-800">No timetable found for Semester {selectedSemester}</p>
              <p className="text-sm text-amber-600 mt-1">
                {error?.message?.includes('404')
                  ? 'Go to Configure and click Generate Timetable.'
                  : error?.message}
              </p>
            </div>
            <Button onClick={() => navigate('/configure')} variant="outline">
              Go to Configure
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timetable grid */}
      {timetable && (
        <>
          {/* Meta info */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>
                Generated {new Date(timetable.generatedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <span>·</span>
            <span>{timetable.schedule?.days?.length} days/week</span>
            <span>·</span>
            <span>
              {timetable.schedule?.slots?.filter(s => !s.isLunch).length} periods/day
            </span>
          </div>

          {/* Visible grid */}
          <TimetableGrid timetable={timetable} />

          {/* Hidden print view for PDF capture */}
          <div
            style={{
              position: 'absolute',
              left: '-9999px',
              top: 0,
              width: '1123px',  // A4 landscape pixel width at 96dpi
            }}
          >
            <PrintView
              ref={printRef}
              timetable={timetable}
              semester={selectedSemester}
            />
          </div>
        </>
      )}
    </div>
  )
}