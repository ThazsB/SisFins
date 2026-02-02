import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { data, init } = useAppStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      init(user.id);
    }
  }, [user, init]);

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      navigate('/profile-selection', { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">Perfil</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl overflow-hidden">
            {user?.avatar?.startsWith('data:image/') ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.avatar || '👤'}</span>
            )}
          </div>
          
          <div>
            <p className="text-xl font-bold">{user?.name}</p>
            <p className="text-muted-foreground">
              Membro desde {new Date(user?.createdAt || '').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Editar Perfil
          </button>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            Alterar Senha
          </button>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">Informações do Aplicativo</h2>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data de Criação</span>
            <span className="font-medium">2024-01-01</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última Atualização</span>
            <span className="font-medium">2024-01-01</span>
          </div>
        </div>
      </div>

      {/* Data Storage */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">Armazenamento de Dados</h2>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de Transações</span>
            <span className="font-medium">{data.transactions.length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de Metas</span>
            <span className="font-medium">{data.goals.length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de Orçamentos</span>
            <span className="font-medium">{data.budgets.length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Categorias Personalizadas</span>
            <span className="font-medium">{data.categories.length}</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Editar Perfil</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input
                  type="text"
                  defaultValue={user?.name}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Avatar</label>
                <input
                  type="text"
                  defaultValue={user?.avatar}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Alterar Senha</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Senha Atual</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nova Senha</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirmar Senha</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
