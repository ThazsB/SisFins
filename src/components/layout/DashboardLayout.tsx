import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Target, Flag, BarChart3, Settings, Bell } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Logo } from '@/components/ui/Logo'

const navItems = [
  { name: 'Painel', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Transações', icon: ArrowLeftRight, href: '/transactions' },
  { name: 'Orçamentos', icon: Target, href: '/budgets' },
  { name: 'Metas', icon: Flag, href: '/goals' },
  { name: 'Relatórios', icon: BarChart3, href: '/reports' },
  { name: 'Configurações', icon: Settings, href: '/settings' },
]

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationsStore()
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Logo size="lg" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {user?.avatar?.startsWith('data:image/') ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{user?.avatar || '👤'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Carregando...'}</p>
                <p className="text-xs text-muted-foreground">Ver perfis</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {navItems.find(item => location.pathname === item.href)?.name || 'Painel'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Button */}
            <button
              onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
              className="p-2 rounded-full hover:bg-muted transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>

            {/* New Transaction Button */}
            {location.pathname !== '/transactions' && (
              <button
                onClick={() => navigate('/transactions')}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Nova Transação
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>

        {/* Notification Center */}
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
        />
      </main>
    </div>
  )
}
