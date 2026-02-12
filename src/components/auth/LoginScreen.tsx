import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../ui/Logo';
import { FirstAccessScreen } from './FirstAccessScreen';
import { PasswordInput } from './PasswordInput';
import { ProfileCard } from './ProfileCard';
import { DeleteProfileModal } from './DeleteProfileModal';
import { useAuthStore } from '../../stores/authStore';
import type { Profile } from '../../types';
import { PROFILES_LIST_KEY, PROFILE_STORAGE_KEY } from '../../config/storage';

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
  const hasLoaded = useRef(false);
  const lastActivityCache = useRef<Map<string, number>>(new Map());

  // Carregar perfis do localStorage
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      const savedProfiles = localStorage.getItem(PROFILES_LIST_KEY);
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

  // Callback functions
  const handleSelectProfile = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setSelectedProfileId(profileId);
        setSelectedProfile(profile);
        setView('password');
        setPassword('');
        setError('none');
        setErrorMessage('');
      }
    },
    [profiles]
  );

  const handleBackToProfiles = useCallback(() => {
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

    if (!success) {
      setError('invalid');
      setErrorMessage('Senha incorreta. Tente novamente.');
      setPassword('');
    }

    setIsAuthenticating(false);
  }, [password, selectedProfile, login]);

  const handleConfirmDelete = useCallback(
    async (_password: string): Promise<boolean> => {
      if (!profileToDelete) return false;

      const updatedProfiles = profiles.filter((p) => p.id !== profileToDelete);
      setProfiles(updatedProfiles);
      localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(updatedProfiles));

      // Limpar dados do perfil excluído
      localStorage.removeItem(`ecofinance_${profileToDelete}_password`);
      localStorage.removeItem(`ecofinance_${profileToDelete}_transactions`);

      // Se era o perfil selecionado, voltar para lista
      if (selectedProfileId === profileToDelete) {
        handleBackToProfiles();
      }

      setShowDeleteModal(false);
      setProfileToDelete(null);
      return true;
    },
    [profileToDelete, profiles, selectedProfileId, handleBackToProfiles]
  );

  // Obter perfil a ser excluído
  const profileToDeleteData = profileToDelete
    ? profiles.find((p) => p.id === profileToDelete)
    : null;

  // Obter último perfil acessado
  const lastAccessedProfile = useMemo(() => {
    const activeProfileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (activeProfileId) {
      return profiles.find((p) => p.id === activeProfileId) || null;
    }
    return null;
  }, [profiles]);

  // Memoizar ordenação dos perfis para evitar re-renderizações desnecessárias
  const sortedProfiles = useMemo(() => {
    // Preencher cache se ainda não existe
    profiles.forEach((profile) => {
      if (!lastActivityCache.current.has(profile.id)) {
        const lastActivity = localStorage.getItem(`ecofinance_${profile.id}_lastActivity`);
        lastActivityCache.current.set(profile.id, parseInt(lastActivity || '0'));
      }
    });

    return [...profiles].sort((a, b) => {
      const lastActivityA = lastActivityCache.current.get(a.id) || 0;
      const lastActivityB = lastActivityCache.current.get(b.id) || 0;
      return lastActivityB - lastActivityA;
    });
  }, [profiles]);

  return (
    <div
      className={
        view === 'first-access'
          ? 'h-screen overflow-hidden bg-background'
          : 'h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden'
      }
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
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-slate/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-slate/5 rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/30" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 w-full flex flex-col items-center"
          >
            <div className="w-full max-w-4xl flex flex-col items-center">
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.1,
                  }}
                  className="flex flex-col items-center mb-4"
                >
                  <Logo size="xl" showText={true} />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: 'easeOut',
                    delay: 0.4,
                  }}
                  className="text-muted-foreground"
                >
                  {view === 'password' && selectedProfile
                    ? `Olá, ${selectedProfile.name}!`
                    : 'Selecione ou crie um perfil para continuar'}
                </motion.p>
              </div>

              {/* Área de autenticação */}
              <AnimatePresence mode="wait">
                {view === 'password' && selectedProfile ? (
                  <motion.div
                    key="password-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      duration: 0.25,
                      ease: 'easeOut',
                    }}
                    className="mb-8"
                  >
                    {/* Perfil selecionado */}
                    <div className="flex items-center justify-center mb-6">
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 15,
                          delay: 0,
                        }}
                        className="text-center"
                      >
                        <div
                          className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl overflow-hidden shadow-lg"
                          style={{ backgroundColor: `${selectedProfile.color}20` }}
                        >
                          {selectedProfile.avatar.startsWith('data:image/') ? (
                            <img
                              src={selectedProfile.avatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            selectedProfile.avatar
                          )}
                        </div>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          className="text-xl font-semibold"
                        >
                          {selectedProfile.name}
                        </motion.p>
                      </motion.div>
                    </div>

                    {/* Campo de senha */}
                    <div className="max-w-md mx-auto">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
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
                      </motion.div>

                      {/* Botão de entrar */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
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
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      onClick={handleBackToProfiles}
                      className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Voltar para perfis
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="profiles-panel"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                      mass: 0.8,
                    }}
                    className="w-full"
                  >
                    {/* Último perfil acessado */}
                    {lastAccessedProfile && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6"
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Último perfil acessado</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectProfile(lastAccessedProfile.id)}
                          className="w-full max-w-md mx-auto flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-all"
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden"
                            style={{ backgroundColor: `${lastAccessedProfile.color}20` }}
                          >
                            {lastAccessedProfile.avatar.startsWith('data:image/') ? (
                              <img
                                src={lastAccessedProfile.avatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              lastAccessedProfile.avatar
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-foreground">
                              {lastAccessedProfile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">Clique para acessar</p>
                          </div>
                          <svg
                            className="w-5 h-5 text-muted-foreground"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Lista de perfis */}
                    <div
                      className={`grid gap-4 mb-8 ${sortedProfiles.length === 0 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} ${sortedProfiles.length === 0 ? 'max-w-sm mx-auto' : ''}`}
                    >
                      {sortedProfiles.map((profile, index) => (
                        <motion.div
                          key={profile.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 20,
                            delay: index * 0.05,
                          }}
                        >
                          <ProfileCard
                            profile={profile}
                            isSelected={selectedProfileId === profile.id}
                            onClick={() => handleSelectProfile(profile.id)}
                            onDelete={(id) => {
                              setProfileToDelete(id);
                              setShowDeleteModal(true);
                            }}
                          />
                        </motion.div>
                      ))}

                      {/* Criar novo perfil */}
                      <motion.button
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{
                          duration: 0.3,
                          ease: 'easeOut',
                          delay: sortedProfiles.length * 0.05,
                        }}
                        onClick={() => setView('first-access')}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                      >
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                          <svg
                            className="w-6 h-6 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                          </svg>
                        </div>
                        <span className="font-medium group-hover:text-primary transition-colors text-sm">
                          Criar Novo
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">Adicionar perfil</span>
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
          </motion.div>
        </div>
      )}
    </div>
  );
}
