import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useNotificationEngine } from '@/engine/notification-engine';
import { formatCurrency } from '@/utils/currency';
import { Goal } from '@/types';
import { useGoalToast } from '@/components/notifications';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ReportsSkeleton } from '@/components/ui/Skeleton';
import { Target, Trash2 } from 'lucide-react';

interface GoalStatus {
  id: string;
  name: string;
  current: number;
  target: number;
  percentage: number;
}

export default function Goals() {
  const { user } = useAuthStore();
  const { data, init, addGoal, deleteGoal, addGoalValue, loading } = useAppStore();
  const { checkGoalAlerts } = useNotificationEngine();
  const { showGoalCreated, showGoalContribution, showGoalError, showGoalDelete } = useGoalToast();
  const { addNotification, hasDuplicateNotification } = useNotificationsStore();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddValueModalOpen, setIsAddValueModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target: '',
  });
  const [goalValue, setGoalValue] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    goal: Goal | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    goal: null,
    isDeleting: false,
  });

  // Calculate goal statuses for notifications
  const getGoalStatuses = useCallback((): GoalStatus[] => {
    return data.goals.map((goal: Goal) => ({
      id: String(goal.id),
      name: goal.name,
      current: goal.current,
      target: goal.target,
      percentage: Math.round((goal.current / goal.target) * 100),
    }));
  }, [data.goals]);

  useEffect(() => {
    const initialize = async () => {
      if (user) {
        await init(user.id);
        setHasInitialized(true);
      }
    };

    initialize();
  }, [user, init]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGoal.name.trim()) {
      alert('Por favor, digite um nome para a meta');
      return;
    }

    const target = parseFloat(newGoal.target);
    if (isNaN(target) || target <= 0) {
      alert('Por favor, digite um valor alvo válido');
      return;
    }

    addGoal({
      name: newGoal.name.trim(),
      target,
    })
      .then(() => {
        // Mostrar toast de sucesso
        showGoalCreated({ name: newGoal.name.trim(), target });

        setNewGoal({
          name: '',
          target: '',
        });
        setIsModalOpen(false);

        // Check goal alerts after adding new goal
        if (data.goals.length > 0) {
          const goalStatuses = getGoalStatuses();
          checkGoalAlerts(goalStatuses);
        }
      })
      .catch((error) => {
        showGoalError({ name: newGoal.name.trim() });
        console.error('Erro ao criar meta:', error);
      });
  };

  const handleAddValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGoalId) {
      alert('Selecione uma meta');
      return;
    }

    const value = parseFloat(goalValue);
    if (isNaN(value) || value <= 0) {
      alert('Por favor, digite um valor válido');
      return;
    }

    addGoalValue(selectedGoalId, value)
      .then(() => {
        // Verificar se a meta atingiu 100%
        const goal = data.goals.find((g: Goal) => g.id === selectedGoalId);
        if (goal) {
          const newProgress = goal.current + value;
          const wasBelowTarget = goal.current < goal.target;
          const isNowComplete = newProgress >= goal.target;

          if (wasBelowTarget && isNowComplete) {
            // Verificar se já existe notificação de meta atingida para esta meta
            const goalTitle = '🏆 Meta Atingida!';
            const goalMessage = `Parabéns! Você completou a meta "${goal.name}" de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.target)}`;

            // Verificar duplicata antes de adicionar
            const hasDuplicate = hasDuplicateNotification(
              goalTitle,
              goalMessage,
              'achievement',
              300000
            ); // 5 minutos

            if (!hasDuplicate) {
              // Meta concluída! Adicionar notificação ao Notification Center
              addNotification({
                title: goalTitle,
                message: goalMessage,
                category: 'achievement',
                priority: 'high',
                channels: ['in_app'],
                actions: [
                  {
                    id: 'view_goal',
                    label: 'Ver Meta',
                    primary: true,
                  },
                ],
              });
            }

            // Mostrar toast de contribuição
            showGoalContribution({
              name: goal.name,
              current: value,
              target: goal.target,
              progress: newProgress,
            });
          } else {
            // Apenas contribuição normal
            showGoalContribution({
              name: goal.name,
              current: value,
              target: goal.target,
              progress: newProgress,
            });
          }
        }

        setGoalValue('');
        setSelectedGoalId(null);
        setIsAddValueModalOpen(false);

        // Check goal alerts after adding value
        if (data.goals.length > 0) {
          const goalStatuses = getGoalStatuses();
          checkGoalAlerts(goalStatuses);
        }
      })
      .catch((error) => {
        const goal = data.goals.find((g: Goal) => g.id === selectedGoalId);
        showGoalError({ name: goal?.name || 'Meta' });
        console.error('Erro ao adicionar valor à meta:', error);
      });
  };

  // Open confirm dialog for deletion
  const handleDeleteRequest = (id: number) => {
    const goalToDelete = data.goals.find((g: Goal) => g.id === id);
    if (goalToDelete) {
      setConfirmDialog({
        isOpen: true,
        goal: goalToDelete,
        isDeleting: false,
      });
    }
  };

  // Confirm deletion
  const handleConfirmDelete = () => {
    if (confirmDialog.goal) {
      setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

      showGoalDelete({ name: confirmDialog.goal.name });
      deleteGoal(confirmDialog.goal.id);

      setConfirmDialog({
        isOpen: false,
        goal: null,
        isDeleting: false,
      });
    }
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    setConfirmDialog({
      isOpen: false,
      goal: null,
      isDeleting: false,
    });
  };

  // Format goal details for dialog
  const getGoalDetails = (goal: Goal) => {
    const progressPercent = Math.round((goal.current / goal.target) * 100);

    return [
      {
        label: 'Meta',
        value: goal.name,
      },
      {
        label: 'Valor Atual',
        value: formatCurrency(goal.current),
      },
      {
        label: 'Valor Alvo',
        value: formatCurrency(goal.target),
      },
      {
        label: 'Progresso',
        value: `${progressPercent}%`,
      },
    ];
  };

  // Mostrar skeleton enquanto carrega ou se não inicializou
  if (loading || !hasInitialized) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-muted-foreground">Defina e alcance suas metas financeiras</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Nova Meta
        </button>
      </div>

      {/* Goals Grid */}
      {data.goals.length === 0 ? (
        <div className="bg-card p-8 rounded-lg border border-border text-center">
          <p className="text-muted-foreground mb-4">Nenhuma meta cadastrada</p>
          <p className="text-sm mb-6">Crie uma meta para começar a salvar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.goals.map((goal: Goal) => {
            const percentage = Math.min((goal.current / goal.target) * 100, 100);

            // Estilo progressivo contínuo baseado no percentual
            const getProgressStyle = (percent: number) => {
              const p = Math.max(0, Math.min(100, percent));

              // Interpolar matiz (hue) para transição suave: azul (220) -> verde (120)
              const hueStart = 220; // azul
              const hueEnd = 120; // verde
              const hue = hueStart + (hueEnd - hueStart) * (p / 100);

              // Criar duas paradas de cor próximas para um leve gradiente
              const colorA = `hsl(${Math.round(hue)} 78% 48%)`;
              const colorB = `hsl(${Math.round(Math.max(0, hue - 12))} 78% 42%)`;

              return {
                background: `linear-gradient(90deg, ${colorA}, ${colorB})`,
              } as React.CSSProperties;
            };

            return (
              <div key={goal.id} className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{goal.name}</h3>
                  <button
                    onClick={() => handleDeleteRequest(goal.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    title="Excluir meta"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%`, ...getProgressStyle(percentage) }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Atual:</span>
                    <span className="font-medium">{formatCurrency(goal.current)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alvo:</span>
                    <span className="font-medium">{formatCurrency(goal.target)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Faltante:</span>
                    <span className="font-medium">
                      {formatCurrency(goal.target - goal.current)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedGoalId(goal.id);
                    setIsAddValueModalOpen(true);
                  }}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Adicionar Valor
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nova Meta</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome da Meta</label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Viagem para Europa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Valor Alvo</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Value Modal */}
      {isAddValueModalOpen && selectedGoalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Adicionar Valor à Meta</h2>

            <form onSubmit={handleAddValueSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddValueModalOpen(false);
                    setSelectedGoalId(null);
                    setGoalValue('');
                  }}
                  className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDialog.goal && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Excluir Meta"
          message="Tem certeza que deseja excluir esta meta?"
          type="goal"
          details={getGoalDetails(confirmDialog.goal)}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={confirmDialog.isDeleting}
        />
      )}
    </div>
  );
}
