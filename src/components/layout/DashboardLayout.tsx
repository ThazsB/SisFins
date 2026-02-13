/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Flag,
  BarChart3,
  Settings,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { Logo } from '@/components/ui/Logo';

const navItems = [
  { name: 'Painel', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Transações', icon: ArrowLeftRight, href: '/transactions' },
  { name: 'Orçamentos', icon: Target, href: '/budgets' },
  { name: 'Metas', icon: Flag, href: '/goals' },
  { name: 'Relatórios', icon: BarChart3, href: '/reports' },
  { name: 'Configurações', icon: Settings, href: '/settings' },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { updatePreferences } = useNotificationsStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Inicializar profileId quando o usuário for carregado
  useEffect(() => {
    if (user?.id) {
      updatePreferences({ profileId: user.id, userId: user.id });
    }
  }, [user?.id, updatePreferences]);

  // Fechar sidebar ao clicar em um item no mobile
  const handleNavClick = (href: string) => {
    navigate(href);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex w-64 bg-card border-r border-border flex-col fixed h-full transition-transform duration-300 z-20`}
      >
        <div className="p-6 border-b border-border">
          <Logo size="lg" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
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

      {/* Mobile Sidebar Overlay */}
      {isMobile && (
        <>
          {/* Overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Mobile Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <Logo size="md" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
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
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
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
        </>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${isMobile ? 'w-full' : 'md:ml-64'}`}
      >
        <header className="h-14 md:h-16 border-b border-border bg-background px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Menu Button - Mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg md:text-xl font-semibold truncate">
              {navItems.find((item) => location.pathname === item.href)?.name || 'Painel'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* New Transaction Button */}
            {location.pathname !== '/transactions' && (
              <button
                onClick={() => navigate('/transactions')}
                className="bg-primary text-primary-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
