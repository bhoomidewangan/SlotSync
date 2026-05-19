import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const configSchema = z.object({
  workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format'),
  periodDuration: z.coerce.number().int().min(30, 'Min 30 min').max(90, 'Max 90 min'),
  periodsBeforeLunch: z.coerce.number().int().min(1, 'Min 1'),
  periodsAfterLunch: z.coerce.number().int().min(1, 'Min 1'),
  lunchDuration: z.coerce.number().int().min(10, 'Min 10 min').max(90, 'Max 90 min'),
  lunchLabel: z.string().default('Lunch Break'),
})

export default function ConfigForm({ onSuccess, existingConfig = null }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(configSchema),
    defaultValues: {
      workingDays:        existingConfig?.workingDays        || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime:          existingConfig?.startTime          || '08:00',
      periodDuration:     existingConfig?.periodDuration     || 50,
      periodsBeforeLunch: existingConfig?.periodsBeforeLunch || 4,
      periodsAfterLunch:  existingConfig?.periodsAfterLunch  || 3,
      lunchDuration:      existingConfig?.lunchDuration      || 30,
      lunchLabel:         existingConfig?.lunchLabel         || 'Lunch Break',
    },
  })

  const watchedDays     = watch('workingDays')
  const periodDuration  = watch('periodDuration')
  const beforeLunch     = watch('periodsBeforeLunch')
  const afterLunch      = watch('periodsAfterLunch')
  const lunchDuration   = watch('lunchDuration')
  const startTime       = watch('startTime')

  const toggleDay = (day) => {
    if (watchedDays.includes(day)) {
      setValue('workingDays', watchedDays.filter(d => d !== day))
    } else {
      setValue('workingDays', [...watchedDays, day])
    }
  }

  // Compute end time preview
  const computeEndTime = () => {
    if (!startTime || !periodDuration || !beforeLunch || !afterLunch || !lunchDuration) return null
    const [h, m] = startTime.split(':').map(Number)
    const totalMinutes =
      h * 60 + m +
      (Number(beforeLunch) + Number(afterLunch)) * Number(periodDuration) +
      Number(lunchDuration)
    const endH = Math.floor(totalMinutes / 60)
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  const totalPeriods = Number(beforeLunch || 0) + Number(afterLunch || 0)
  const endTime = computeEndTime()

  const onSubmit = async (data) => {
    await onSuccess(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Configuration</CardTitle>
        <CardDescription>
          Set the working days, time slots, and lunch break for this semester.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Working Days */}
          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    watchedDays.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            {errors.workingDays && (
              <p className="text-sm text-destructive">{errors.workingDays.message}</p>
            )}
          </div>

          {/* Start Time + Period Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-duration">Period Duration (minutes)</Label>
              <Input
                id="period-duration"
                type="number"
                min={30}
                max={90}
                {...register('periodDuration')}
              />
              {errors.periodDuration && (
                <p className="text-sm text-destructive">{errors.periodDuration.message}</p>
              )}
            </div>
          </div>

          {/* Lunch Break */}
          <div className="space-y-3">
            <Label>Lunch Break</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="before-lunch" className="text-xs text-muted-foreground">
                  Periods before lunch
                </Label>
                <Input
                  id="before-lunch"
                  type="number"
                  min={1}
                  {...register('periodsBeforeLunch')}
                />
                {errors.periodsBeforeLunch && (
                  <p className="text-sm text-destructive">{errors.periodsBeforeLunch.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="lunch-duration" className="text-xs text-muted-foreground">
                  Lunch duration (min)
                </Label>
                <Input
                  id="lunch-duration"
                  type="number"
                  min={10}
                  max={90}
                  {...register('lunchDuration')}
                />
                {errors.lunchDuration && (
                  <p className="text-sm text-destructive">{errors.lunchDuration.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="after-lunch" className="text-xs text-muted-foreground">
                  Periods after lunch
                </Label>
                <Input
                  id="after-lunch"
                  type="number"
                  min={1}
                  {...register('periodsAfterLunch')}
                />
                {errors.periodsAfterLunch && (
                  <p className="text-sm text-destructive">{errors.periodsAfterLunch.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lunch-label" className="text-xs text-muted-foreground">
                Lunch label
              </Label>
              <Input
                id="lunch-label"
                placeholder="Lunch Break"
                {...register('lunchLabel')}
              />
            </div>
          </div>

          {/* Live preview */}
          {totalPeriods > 0 && endTime && (
            <div className="rounded-md bg-muted/50 border border-border p-4 space-y-1">
              <p className="text-sm font-medium">Schedule Preview</p>
              <p className="text-sm text-muted-foreground">
                {totalPeriods} periods/day &nbsp;·&nbsp;
                {startTime} – {endTime} &nbsp;·&nbsp;
                {beforeLunch} before + {afterLunch} after lunch
              </p>
              <div className="flex gap-1 flex-wrap pt-1">
                {Array.from({ length: Number(beforeLunch) }).map((_, i) => (
                  <span key={`b${i}`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    P{i + 1}
                  </span>
                ))}
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Lunch
                </span>
                {Array.from({ length: Number(afterLunch) }).map((_, i) => (
                  <span key={`a${i}`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    P{Number(beforeLunch) + i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving...' : existingConfig ? 'Update Configuration' : 'Save Configuration'}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}