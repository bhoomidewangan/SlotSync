import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen,
  Settings, CalendarDays, GraduationCap, LogOut,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import useAppStore from '@/store/useAppStore'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teachers',  label: 'Teachers',  icon: Users },
  { to: '/courses',   label: 'Courses',   icon: BookOpen },
  { to: '/configure', label: 'Configure', icon: Settings },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
]

export default function Layout() {
  const { department, logout } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">TimeTable</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Department info + logout */}
        <div className="p-4 border-t border-border space-y-3">
          {department && (
            <div>
              <p className="text-xs font-medium text-foreground truncate">{department.name}</p>
              <p className="text-xs text-muted-foreground truncate">{department.email}</p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <Toaster />
    </div>
  )
}