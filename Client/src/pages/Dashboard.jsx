import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, CalendarDays, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

const cards = [
  { title: 'Teachers',   desc: 'Add and manage teachers and their subjects', icon: Users,        to: '/teachers',  color: 'text-blue-500' },
  { title: 'Courses',    desc: 'Add courses, assign teachers and sessions',  icon: BookOpen,     to: '/courses',   color: 'text-green-500' },
  { title: 'Configure',  desc: 'Set time slots, lunch break and days',       icon: Settings,     to: '/configure', color: 'text-amber-500' },
  { title: 'Timetable',  desc: 'Generate and view the timetable',            icon: CalendarDays, to: '/timetable', color: 'text-purple-500' },
]

export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Start by adding teachers, then courses, then configure your schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(({ title, desc, icon: Icon, to, color }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Icon className={`h-8 w-8 ${color}`} />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 border border-border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground font-medium mb-1">Recommended setup order:</p>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
          <li>Add all teachers with their subjects</li>
          <li>Add all courses for a semester</li>
          <li>Go to Configure → set time slots and lunch break</li>
          <li>Click Generate Timetable</li>
        </ol>
      </div>
    </div>
  )
}