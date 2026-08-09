import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw, CalendarDays, AlertCircle, Check, X } from 'lucide-react'
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
import courseService from '@/services/courseService'
import useAppStore from '@/store/useAppStore'
import { TIMETABLE_DAYS, TIMETABLE_DISPLAY_SLOTS } from '@/constants/timetableTemplate'
import { proposalToTimetable } from '@/utils/proposalTimetable'

export default function Timetable() {
  const {
    selectedSemester,
    setSelectedSemester,
    timetableProposal,
    proposalToken,
    generationStatus,
    setTimetableProposal,
    startTimetableGeneration,
    startTimetableAcceptance,
    restoreTimetablePreview,
    clearTimetableProposal,
  } = useAppStore()
  const { toast } = useToast()
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
    queryFn: () => timetableService.getBySemester(selectedSemester),
    retry: false,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['courses', selectedSemester],
    queryFn: () => courseService.getAll(selectedSemester),
    enabled: Boolean(timetableProposal),
  })

  const proposalTimetable = useMemo(
    () => proposalToTimetable(timetableProposal, courses),
    [timetableProposal, courses]
  )
  const isGenerating = generationStatus === 'generating'
  const isPreviewing = generationStatus === 'preview' || generationStatus === 'accepting'

  // Generate an in-memory proposal; the accepted timetable remains unchanged.
  const generateMutation = useMutation({
    mutationFn: () => timetableService.generateProposal(selectedSemester),
    onMutate: () => {
      startTimetableGeneration()
    },
    onSuccess: (result) => {
      setTimetableProposal(result.proposal, result.proposalToken)
      toast({ title: 'Timetable proposal generated' })
    },
    onError: (err) => {
      clearTimetableProposal()
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const acceptMutation = useMutation({
    mutationFn: () => timetableService.acceptProposal({
      semester: selectedSemester,
      proposal: timetableProposal,
      proposalToken,
    }),
    onMutate: startTimetableAcceptance,
    onSuccess: async (acceptedTimetable) => {
      queryClient.setQueryData(['timetable', selectedSemester], acceptedTimetable)
      clearTimetableProposal()
      await queryClient.invalidateQueries({ queryKey: ['timetable', selectedSemester] })
      toast({ title: 'Timetable accepted' })
    },
    onError: (err) => {
      restoreTimetablePreview()
      toast({ title: 'Acceptance failed', description: err.message, variant: 'destructive' })
    },
  })

  const handleReject = () => {
    clearTimetableProposal()
    toast({ title: 'Proposal rejected', description: 'The accepted timetable was not changed.' })
  }

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
              disabled={isGenerating || isPreviewing}
              onValueChange={(v) => {
                clearTimetableProposal()
                setSelectedSemester(Number(v))
              }}
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

          {isPreviewing ? (
            <>
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={acceptMutation.isPending}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                {generateMutation.isPending
                  ? 'Generating...'
                  : timetable
                    ? 'Generate New Proposal'
                    : 'Generate Timetable'}
              </Button>

              <Button
                onClick={handleExport}
                disabled={!timetable || exporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Download PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      {isGenerating && (
        <Card className="mb-5 border-blue-200 bg-blue-50">
          <CardContent className="py-5 flex items-center gap-3 text-sm text-blue-800">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Gemini is creating and validating a timetable proposal. The accepted timetable remains active.
          </CardContent>
        </Card>
      )}

      {isPreviewing && proposalTimetable && (
        <Card className="mb-5 border-blue-200 bg-blue-50">
          <CardContent className="py-5">
            <p className="font-medium text-blue-900">Proposal preview</p>
            <p className="text-sm text-blue-700 mt-1">
              Review this candidate, then accept or reject it. Your current timetable remains unchanged until acceptance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Loading timetable...
          </CardContent>
        </Card>
      )}

      {/* Error / no timetable */}
      {isError && !isPreviewing && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <div>
              <p className="font-medium text-amber-800">No timetable found for Semester {selectedSemester}</p>
              <p className="text-sm text-amber-600 mt-1">
                {error?.message?.includes('404')
                  ? 'Add courses for this semester, then click Generate Timetable.'
                  : error?.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview candidate or currently accepted timetable */}
      {(proposalTimetable || timetable) && (
        <>
          {/* Meta info */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>
                {isPreviewing
                  ? `Preview for Semester ${selectedSemester}`
                  : `Generated ${new Date(timetable.generatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}`}
              </span>
            </div>
            <span>·</span>
            <span>{TIMETABLE_DAYS.length} days/week</span>
            <span>·</span>
            <span>
              {TIMETABLE_DISPLAY_SLOTS.filter(s => !s.isLunch).length} periods/day
            </span>
          </div>

          {/* Visible grid */}
          <TimetableGrid timetable={isPreviewing ? proposalTimetable : timetable} />

          {/* Hidden print view for PDF capture */}
          {!isPreviewing && timetable && <div
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
          </div>}
        </>
      )}
    </div>
  )
}
