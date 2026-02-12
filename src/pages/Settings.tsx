import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useOpenFinanceStore } from '@/stores/openFinanceStore';
import {
  BankConnectionModal,
  BankAccountList,
  TransactionImporter,
} from '@/components/openfinance';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Camera, X, FolderKanban, Building2, CreditCard, Upload, LogOut, User } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuthStore();
  const { data, init } = useAppStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'banking'>('general');
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Inicializar dados do perfil
  useEffect(() => {
    if (user) {
      init(user.id);
    }
  }, [user, init]);

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/profile-selection', { replace: true });
    setIsLogoutDialogOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setEditAvatar(base64);
        setAvatarPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setEditAvatar('👤');
    setAvatarPreview(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        name: editName,
        avatar: editAvatar,
      });
      setIsProfileModalOpen(false);
      setAvatarPreview(null);
    } catch (error) {
      alert('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Geral
        </button>
        <button
          onClick={() => setActiveTab('banking')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'banking'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Contas Bancárias
        </button>
      </div>

      {/* Tab: Geral */}
      {activeTab === 'general' && (
        <>
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

          {/* Gerenciamento de Categorias */}
          <div className="bg-card p-6 rounded-lg border border-border shadow-md bg-gradient-to-r from-primary/5 to-primary/10">
            <h2 className="text-lg font-semibold mb-4">Categorias</h2>
            <p className="text-muted-foreground mb-4">
              Gerencie suas categorias personalizadas para transações, orçamentos e metas.
            </p>
            <button
              onClick={() => navigate('/categories')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <FolderKanban className="w-4 h-4" />
              Gerenciar Categorias
            </button>
          </div>

          {/* App Info */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">Informações do Aplicativo</h2>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versão</span>
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

          {/* Armazenamento Local */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">Armazenamento Local</h2>

            <div className="space-y-2">
              <p className="text-muted-foreground">
                Os dados são salvos localmente no navegador e persistem entre sessões.
              </p>

              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>LocalStorage ativo</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>IndexedDB disponível</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab: Contas Bancárias */}
      {activeTab === 'banking' && (
        <>
          {/* Bank Accounts */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">Contas Conectadas</h2>
            <BankAccountList />
            <div className="mt-4">
              <button
                onClick={() => setIsBankModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Conectar Nova Conta
              </button>
            </div>
          </div>

          {/* Transaction Importer */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">Importar Transações</h2>
            <TransactionImporter />
          </div>

          {/* Open Finance Info */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">Sobre o Open Finance</h2>
            <p className="text-muted-foreground mb-4">
              O Open Finance Brasil permite que você conecte suas contas bancárias de forma segura.
              Você controla quais dados compartilha e pode revogar o acesso a qualquer momento.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Contas Bancárias</p>
                  <p className="text-sm text-muted-foreground">Visualize suas contas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Transações</p>
                  <p className="text-sm text-muted-foreground">Sincronize extratos</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Upload className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Importação</p>
                  <p className="text-sm text-muted-foreground">CSV e OFX</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Avatar</label>

                {/* Preview da imagem */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl overflow-hidden border-2 border-border">
                    {avatarPreview ||
                      (editAvatar?.startsWith('data:image/') ? (
                        <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{editAvatar || '👤'}</span>
                      ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Selecionar Imagem
                    </button>

                    {avatarPreview || editAvatar?.startsWith('data:image/') ? (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setAvatarPreview(null);
                    setEditAvatar(user?.avatar || '');
                  }}
                  className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving || !editName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
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

      {/* Bank Connection Modal */}
      {isBankModalOpen && (
        <BankConnectionModal isOpen={isBankModalOpen} onClose={() => setIsBankModalOpen(false)} />
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
        title="Sair da Conta"
        type="logout"
        message={`Você está prestes a sair da conta de ${user?.name}. Deseja continuar?`}
        confirmText="Sair"
        cancelText="Cancelar"
        isDestructive={false}
        hideWarning={true}
        details={[
          {
            label: 'Usuário',
            value: user?.name || '',
            icon: <User className="w-4 h-4 text-primary" />,
          },
          {
            label: 'Ação',
            value: 'Encerrar sessão',
            icon: <LogOut className="w-4 h-4 text-orange-500" />,
          },
        ]}
      />
    </div>
  );
}
