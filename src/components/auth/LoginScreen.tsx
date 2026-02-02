import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../ui/Logo';
import { FirstAccessScreen } from './FirstAccessScreen';
import { PasswordInput } from './PasswordInput';
import { ProfileCard } from './ProfileCard';
import { DeleteProfileModal } from './DeleteProfileModal';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationsStore } from '../../stores/notificationsStore';
import type { Profile } from '../../types';

type AuthView = 'profiles' | 'password' | 'first-access';

export function LoginScreen() {
  const [view, setView] = useState<AuthView>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<'none' | 'invalid' | 'empty'>('none');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Estados para exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  
  const { user, login } = useAuthStore();
  const { addNotification } = useNotificationsStore();
  const hasLoaded = useRef(false);

  // Carregar perfis do localStorage
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    
    try {
      const savedProfiles = localStorage.getItem('ecofinance_profiles');
      if (savedProfiles) {
        const parsedProfiles = JSON.parse(savedProfiles);
        setProfiles(parsedProfiles);
      }
    } catch (e) {
      console.error('Erro ao carregar perfis:', e);
    }
  }, []);

  // Resetar view quando usuário faz logout
  useEffect(() => {
    if (!user && view !== 'profiles') {
      setView('profiles');
      setSelectedProfileId(null);
      setSelectedProfile(null);
      setPassword('');
      setError('none');
      setErrorMessage('');
    }
  }, [user]);

  // Log de debug para view
  useEffect(() => {
    console.log('view mudou para:', view);
  }, [view]);

  const handleSelectProfile = useCallback((profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfileId(profileId);
      setSelectedProfile(profile);
      setView('password');
      setPassword('');
      setError('none');
      setErrorMessage('');
    }
  }, [profiles]);

  const handleBackToProfiles = useCallback(() => {
    console.log('handleBackToProfiles chamado');
    setSelectedProfileId(null);
    setSelectedProfile(null);
    setView('profiles');
    setPassword('');
    setError('none');
    setErrorMessage('');
  }, []);

  const handleLogin = useCallback(async () => {
    if (!selectedProfile) return;
    
    if (!password.trim()) {
      setError('empty');
      setErrorMessage('Por favor, digite sua senha');
      return;
    }

    setIsAuthenticating(true);
    setError('none');
    setErrorMessage('');

    const success = await login(selectedProfile.id, password);
    
    if (success) {
      addNotification(
        'Bem-vindo!',
        `Olá, ${selectedProfile.name}!`,
        'success'
      );
    } else {
      setError('invalid');
      setErrorMessage('Senha incorreta. Tente novamente.');
      setPassword('');
      
      addNotification(
        'Erro de autenticação',
        'Senha incorreta. Verifique e tente novamente.',
        'error'
      );
    }
    
    setIsAuthenticating(false);
  }, [password, selectedProfile, login, addNotification]);

  const handleConfirmDelete = useCallback(async (_password: string): Promise<boolean> => {
    if (!profileToDelete) return false;
    
    const updatedProfiles = profiles.filter(p => p.id !== profileToDelete);
    setProfiles(updatedProfiles);
    localStorage.setItem('ecofinance_profiles', JSON.stringify(updatedProfiles));
    
    // Limpar dados do perfil excluído
    localStorage.removeItem(`ecofinance_${profileToDelete}_password`);
    localStorage.removeItem(`ecofinance_${profileToDelete}_transactions`);
    
    // Se era o perfil selecionado, voltar para lista
    if (selectedProfileId === profileToDelete) {
      handleBackToProfiles();
    }
    
    addNotification(
      'Perfil excluído',
      'O perfil foi removido com sucesso.',
      'success'
    );
    
    setShowDeleteModal(false);
    setProfileToDelete(null);
    return true;
  }, [profileToDelete, profiles, selectedProfileId, handleBackToProfiles, addNotification]);

  // Obter perfil a ser excluído
  const profileToDeleteData = profileToDelete 
    ? profiles.find(p => p.id === profileToDelete) 
    : null;

  // Ordenar perfis por última atividade (mais recentes primeiro)
  const sortedProfiles = [...profiles].sort((a, b) => {
    const lastActivityA = parseInt(localStorage.getItem(`ecofinance_${a.id}_lastActivity`) || '0');
    const lastActivityB = parseInt(localStorage.getItem(`ecofinance_${b.id}_lastActivity`) || '0');
    return lastActivityB - lastActivityA;
  });

  return (
    <div 
      className={view === 'first-access' ? 'h-screen overflow-hidden bg-neutral-950' : 'h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-orange-900/20 flex items-center justify-center p-6 relative overflow-hidden'}
    >
      {view === 'first-access' ? (
        <FirstAccessScreen
          onBack={handleBackToProfiles}
          onSuccess={() => {
            // Login será detectado pelo useEffect no App
          }}
        />
      ) : (
        <div className="w-full">
          {/* Elementos decorativos */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-transparent to-neutral-950/30" />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-col items-center">
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center mb-4"
                >
                  <Logo size="xl" showText={true} />
                </motion.div>
                <p className="text-muted-foreground">
                  {view === 'password' && selectedProfile
                    ? `Olá, ${selectedProfile.name}!`
                    : 'Selecione ou crie um perfil para continuar'}
                </p>
              </div>

              {/* Área de autenticação */}
              <AnimatePresence>
                {view === 'password' && selectedProfile ? (
                  <motion.div
                    key="password-panel"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-8"
                  >
                    {/* Perfil selecionado */}
                    <div className="flex items-center justify-center mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-center"
                      >
                        <div
                          className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl overflow-hidden shadow-lg"
                          style={{ backgroundColor: `${selectedProfile.color}20` }}
                        >
                          {selectedProfile.avatar.startsWith('data:image/') ? (
                            <img src={selectedProfile.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            selectedProfile.avatar
                          )}
                        </div>
                        <p className="text-xl font-semibold">{selectedProfile.name}</p>
                      </motion.div>
                    </div>

                    {/* Campo de senha */}
                    <div className="max-w-md mx-auto">
                      <PasswordInput
                        value={password}
                        onChange={(value) => {
                          setPassword(value);
                          if (error !== 'none') {
                            setError('none');
                            setErrorMessage('');
                          }
                        }}
                        onSubmit={handleLogin}
                        error={error !== 'none' ? errorMessage : undefined}
                        isLoading={isAuthenticating}
                        autoFocus
                        placeholder="Digite sua senha"
                      />

                      {/* Botão de entrar */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogin}
                        disabled={password.length < 4 || isAuthenticating}
                        className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAuthenticating ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Entrando...
                          </span>
                        ) : (
                          'Entrar'
                        )}
                      </motion.button>
                    </div>

                    {/* Voltar */}
                    <button
                      onClick={handleBackToProfiles}
                      className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Voltar para perfis
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="profiles-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full"
                  >
                    {/* Lista de perfis */}
                    <div className={`grid gap-4 mb-8 ${sortedProfiles.length === 0 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} ${sortedProfiles.length === 0 ? 'max-w-sm mx-auto' : ''}`}>
                      {sortedProfiles.map((profile) => (
                        <ProfileCard
                          key={profile.id}
                          profile={profile}
                          isSelected={selectedProfileId === profile.id}
                          onClick={() => handleSelectProfile(profile.id)}
                          onDelete={(id) => {
                            setProfileToDelete(id);
                            setShowDeleteModal(true);
                          }}
                        />
                      ))}

                      {/* Criar novo perfil */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setView('first-access')}
                        className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                          <svg className="w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                          </svg>
                        </div>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          Criar Novo Perfil
                        </span>
                        <span className="text-sm text-muted-foreground mt-1">
                          Adicione um novo usuário
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Indicador de versão */}
              <div className="text-center text-sm text-muted-foreground mt-8">
                <p>Fins v1.0</p>
              </div>
            </div>

            {/* Modal de exclusão de perfil */}
            {showDeleteModal && profileToDeleteData && (
              <DeleteProfileModal
                profile={profileToDeleteData}
                currentUserId={user?.id || ''}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                  setShowDeleteModal(false);
                  setProfileToDelete(null);
                }}
              />
            )}

            {/* CSS Animations */}
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
              }
              .animate-shake {
                animation: shake 0.5s ease-in-out;
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
