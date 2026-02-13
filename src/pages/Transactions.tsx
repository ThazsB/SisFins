import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { useNotificationEngine } from '@/engine/notification-engine';
import { TransactionList } from '@/components/TransactionList';
import { useTransactionToast } from '@/components/notifications';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DEFAULT_CATEGORIES, Transaction, Budget } from '@/types';
import {
  TrendingDown,
  TrendingUp,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { TransactionListSkeleton } from '@/components/ui/Skeleton';
import { CATEGORY_ICONS as LUCIDE_ICONS_ARRAY } from '@/types/categories';
import { CATEGORY_ICON_MAP } from '@/utils/categoryIcons';

// Manter compatibilidade: CATEGORY_ICONS é o array de objetos com component, id, color, name
const CATEGORY_ICONS = LUCIDE_ICONS_ARRAY;

interface BudgetStatus {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
}

export default function Transactions() {
  const { user } = useAuthStore();
  const {
    data,
    init,
    deleteTransaction,
    addTransaction,
    loading,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    toggleFixedExpenseActive,
    getActiveFixedExpenses,
  } = useAppStore();
  const { categories: storeCategories, init: initCategories } = useCategoriesStore();
  const { checkBudgetAlerts } = useNotificationEngine();
  const { showTransactionSuccess, showTransactionError, showTransactionDelete } =
    useTransactionToast();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFixedExpenseModalOpen, setIsFixedExpenseModalOpen] = useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = useState<any | null>(null);
  const [spendingPatterns, setSpendingPatterns] = useState<
    Array<{ category: string; average: number; trend: 'up' | 'down' | 'stable' }>
  >([]);
  const [showPatterns, setShowPatterns] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    desc: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [fixedExpenseFormData, setFixedExpenseFormData] = useState({
    name: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    active: true,
    dayOfMonth: 1, // Valor padrão: 1º dia do mês
  });
  const [showFixedExpenseCategoryDropdown, setShowFixedExpenseCategoryDropdown] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    transaction: null,
    isDeleting: false,
  });

  // Fixed expense delete dialog state
  const [fixedExpenseDeleteDialog, setFixedExpenseDeleteDialog] = useState<{
    isOpen: boolean;
    expense: {
      id: number;
      name: string;
      amount: number;
      type: string;
      dayOfMonth: number;
      category: string;
    } | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    expense: null,
    isDeleting: false,
  });

  // Fixed Expenses management
  const handleOpenCreateFixedExpense = () => {
    setEditingFixedExpense(null);
    setFixedExpenseFormData({
      name: '',
      amount: '',
      type: 'expense',
      category: '',
      active: true,
      dayOfMonth: 1,
    });
    setIsFixedExpenseModalOpen(true);
  };

  const handleOpenEditFixedExpense = (expense: any) => {
    setEditingFixedExpense(expense);
    setFixedExpenseFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      type: expense.type,
      category: expense.category,
      active: expense.active,
      dayOfMonth: expense.dayOfMonth || 1,
    });
    setIsFixedExpenseModalOpen(true);
  };

  const handleSubmitFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fixedExpenseFormData.name.trim()) {
      alert('Por favor, digite um nome');
      return;
    }

    const amount = parseFloat(fixedExpenseFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, digite um valor válido');
      return;
    }

    if (!fixedExpenseFormData.category) {
      alert('Por favor, selecione uma categoria');
      return;
    }

    const expenseData = {
      name: fixedExpenseFormData.name.trim(),
      amount,
      type: fixedExpenseFormData.type,
      category: fixedExpenseFormData.category,
      active: fixedExpenseFormData.active,
      dayOfMonth: fixedExpenseFormData.dayOfMonth,
    };

    try {
      if (editingFixedExpense) {
        await updateFixedExpense(editingFixedExpense.id, expenseData);
      } else {
        await addFixedExpense(expenseData);
      }
      setIsFixedExpenseModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar valor fixo:', error);
      alert('Ocorreu um erro ao salvar');
    }
  };

  const handleDeleteFixedExpense = async (expense: {
    id: number;
    name: string;
    amount: number;
    type: string;
    dayOfMonth: number;
    category: string;
  }) => {
    setFixedExpenseDeleteDialog({
      isOpen: true,
      expense,
      isDeleting: false,
    });
  };

  const handleConfirmFixedExpenseDelete = async () => {
    if (!fixedExpenseDeleteDialog.expense) return;

    setFixedExpenseDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      await deleteFixedExpense(fixedExpenseDeleteDialog.expense.id);
      setFixedExpenseDeleteDialog({
        isOpen: false,
        expense: null,
        isDeleting: false,
      });
    } catch (error) {
      console.error('Erro ao excluir valor fixo:', error);
      alert('Ocorreu um erro ao excluir');
      setFixedExpenseDeleteDialog({
        isOpen: false,
        expense: null,
        isDeleting: false,
      });
    }
  };

  const handleCancelFixedExpenseDelete = () => {
    setFixedExpenseDeleteDialog({
      isOpen: false,
      expense: null,
      isDeleting: false,
    });
  };

  const toggleActiveFixedExpense = async (id: number) => {
    try {
      await toggleFixedExpenseActive(id);
    } catch (error) {
      console.error('Erro ao toggle active:', error);
      alert('Ocorreu um erro');
    }
  };

  // Calculate budget statuses for notifications
  const getBudgetStatuses = useCallback((): BudgetStatus[] => {
    const now = new Date();
    const currentMonthTransactions = data.transactions.filter((tx: Transaction) => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    return data.budgets.map((budget: Budget) => {
      const currentSpent = currentMonthTransactions
        .filter((tx: Transaction) => tx.type === 'expense' && tx.category === budget.category)
        .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);

      return {
        category: budget.category,
        spent: currentSpent,
        limit: budget.limit,
        percentage: Math.round((currentSpent / budget.limit) * 100),
      };
    });
  }, [data.transactions, data.budgets]);

  useEffect(() => {
    const initialize = async () => {
      if (user) {
        await init(user.id);
        await initCategories(user.id);
        setHasInitialized(true);
      }
    };

    initialize();
  }, [user, init, initCategories]);

  // Analyze spending patterns when transactions change or component mounts
  useEffect(() => {
    const patterns = analyzeSpendingPatterns(data.transactions);
    setSpendingPatterns(patterns);
  }, [data.transactions]);

  const analyzeSpendingPatterns = useCallback((transactions: Transaction[]) => {
    if (transactions.length === 0) return [];

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Filtrar transações dos últimos 3 meses
    const recentTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= threeMonthsAgo && tx.type === 'expense';
    });

    // Agrupar por categoria
    const categoryStats: Record<string, { total: number; count: number; months: Set<string> }> = {};

    recentTransactions.forEach((tx) => {
      const month = new Date(tx.date).toISOString().slice(0, 7); // YYYY-MM
      if (!categoryStats[tx.category]) {
        categoryStats[tx.category] = { total: 0, count: 0, months: new Set() };
      }
      categoryStats[tx.category].total += tx.amount;
      categoryStats[tx.category].count += 1;
      categoryStats[tx.category].months.add(month);
    });

    // Calcular média e tendência para cada categoria
    const patterns = Object.entries(categoryStats).map(([category, stats]) => {
      const average = stats.total / stats.count;
      const monthCount = stats.months.size;

      // Determinar tendência baseada na consistência e valor
      let trend: 'up' | 'down' | 'stable';
      if (monthCount >= 2 && average > 500) {
        trend = 'up';
      } else if (monthCount === 1 || average < 100) {
        trend = 'down';
      } else {
        trend = 'stable';
      }

      return {
        category,
        average,
        trend,
      };
    });

    // Ordenar por média (maior primeiro)
    return patterns.sort((a, b) => b.average - a.average);
  }, []);

  const combinedCategories = useMemo(() => {
    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...data.categories]));
    return merged.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data.categories]);

  // Função para obter ícone da categoria (wrapper para compatibilidade)
  const getCategoryIconComponent = (categoryName: string) => {
    if (!categoryName) {
      return CATEGORY_ICONS[CATEGORY_ICONS.length - 1];
    }

    const normalizedCategory = categoryName.toLowerCase().normalize('NFD');

    // Primeiro, buscar a categoria no store para obter o ícone customizado
    const categoryFromStore = storeCategories.find(
      (cat) => cat.name.toLowerCase().normalize('NFD') === normalizedCategory
    );
    if (categoryFromStore && categoryFromStore.icon) {
      const iconData = CATEGORY_ICONS.find(
        (icon: { id: string }) => icon.id === categoryFromStore.icon
      );
      if (iconData) return iconData;
    }

    // Fallback: usar mapeamento centralizado de categoryIcons.ts
    // Tentar com o nome original e com normalização
    let iconId = CATEGORY_ICON_MAP[categoryName];
    if (!iconId) {
      // Tentar encontrar no CATEGORY_ICON_MAP com correspondência case-insensitive
      const matchKey = Object.keys(CATEGORY_ICON_MAP).find(
        (key) => key.toLowerCase().normalize('NFD') === normalizedCategory
      );
      if (matchKey) {
        iconId = CATEGORY_ICON_MAP[matchKey];
      }
    }
    if (iconId) {
      const iconData = CATEGORY_ICONS.find((icon: { id: string }) => icon.id === iconId);
      if (iconData) return iconData;
    }

    // Fallback: buscar por palavra-chave
    for (const [categoryKey, id] of Object.entries(CATEGORY_ICON_MAP)) {
      const normalizedKey = categoryKey.toLowerCase().normalize('NFD');
      if (
        normalizedCategory.includes(normalizedKey) ||
        normalizedKey.includes(normalizedCategory)
      ) {
        const iconData = CATEGORY_ICONS.find((icon: { id: string }) => icon.id === id);
        if (iconData) return iconData;
      }
    }

    return CATEGORY_ICONS[CATEGORY_ICONS.length - 1]; // fallback para 'Mais'
  };

  // Mapeamento de cores para cada categoria
  const categoryColorMap: Record<string, string> = {
    // Receitas
    Salário: '#22C55E',
    Investimentos: '#14B8A6',
    Freelance: '#06B6D4',
    'Renda Extra': '#10B981',
    Dividendos: '#3B82F6',
    Aposentadoria: '#8B5CF6',
    Presente: '#EC4899',

    // Despesas - Alimentação
    Alimentação: '#F97316',
    Restaurante: '#F97316',
    Mercado: '#F97316',
    Feira: '#F97316',
    Lanchonete: '#F97316',
    Café: '#F97316',
    Bebidas: '#F97316',
    Delivery: '#F97316',

    // Despesas - Moradia
    Moradia: '#EF4444',
    Aluguel: '#EF4444',
    Condomínio: '#EF4444',
    IPTU: '#EF4444',
    Energia: '#EF4444',
    Água: '#EF4444',
    Gás: '#EF4444',
    Internet: '#EF4444',
    Telefone: '#EF4444',
    'TV a Cabo': '#EF4444',
    Manutenção: '#EF4444',

    // Despesas - Transporte
    Transporte: '#6366F1',
    Combustível: '#6366F1',
    Gasolina: '#6366F1',
    Uber: '#6366F1',
    Ônibus: '#6366F1',
    Metrô: '#6366F1',
    Táxi: '#6366F1',
    Estacionamento: '#6366F1',
    Pedágio: '#6366F1',

    // Despesas - Lazer
    Lazer: '#A855F7',
    Cinema: '#A855F7',
    Jogos: '#A855F7',
    Séries: '#A855F7',
    Música: '#A855F7',
    Livros: '#A855F7',
    Viagem: '#06B6D4',
    Hotel: '#06B6D4',
    Ingressos: '#A855F7',
    Parque: '#A855F7',
    Bar: '#A855F7',
    Festa: '#A855F7',

    // Despesas - Saúde
    Saúde: '#EC4899',
    Farmácia: '#EC4899',
    Médico: '#EC4899',
    Dentista: '#EC4899',
    Academia: '#EC4899',
    Exames: '#EC4899',
    'Plano de Saúde': '#EC4899',
    Veterinário: '#EC4899',

    // Despesas - Educação
    Educação: '#3B82F6',
    Curso: '#3B82F6',
    Escola: '#3B82F6',
    Universidade: '#3B82F6',
    'Material Escolar': '#3B82F6',
    'Curso Online': '#3B82F6',
    Workshop: '#3B82F6',

    // Despesas - Pessoal
    Compras: '#F59E0B',
    Roupas: '#F59E0B',
    Calçados: '#F59E0B',
    Beleza: '#F59E0B',
    Cabeleireiro: '#F59E0B',
    Presentes: '#EC4899',
    Animais: '#10B981',
    Eletrônicos: '#8B5CF6',
    Criança: '#F59E0B',
    Cartão: '#3B82F6',
    Outros: '#6B7280',
  };

  // Função para obter cor da categoria (usa a versão importada de categoryIcons.ts)
  const getCategoryColor = (categoryName: string): string => {
    // Primeiro, buscar a categoria no store para obter a cor customizada
    const categoryFromStore = storeCategories.find((cat) => cat.name === categoryName);
    if (categoryFromStore) {
      return categoryFromStore.color;
    }

    // Fallback para o mapeamento centralizado
    return categoryColorMap[categoryName] || '#6B7280';
  };

  // Mostrar skeleton enquanto carrega ou se não inicializou
  if (loading || !hasInitialized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        </div>
        <TransactionListSkeleton count={5} />
      </div>
    );
  }

  const filteredTransactions = data.transactions.filter((tx: Transaction) => {
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesSearch =
      tx.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTransaction.desc.trim()) {
      alert('Por favor, digite uma descrição');
      return;
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, digite um valor válido');
      return;
    }

    if (!newTransaction.category) {
      alert('Por favor, selecione uma categoria');
      return;
    }

    addTransaction({
      ...newTransaction,
      desc: newTransaction.desc.trim(),
      amount,
    })
      .then(() => {
        // Mostrar toast de sucesso
        showTransactionSuccess({
          type: newTransaction.type,
          action: 'add',
          description: newTransaction.desc.trim(),
          amount,
        });

        // Check budget alerts after adding transaction
        if (newTransaction.type === 'expense' && data.budgets.length > 0) {
          const budgetStatuses = getBudgetStatuses();
          checkBudgetAlerts(budgetStatuses);
        }
      })
      .catch((error) => {
        // Mostrar toast de erro com retry
        showTransactionError({
          type: newTransaction.type,
          description: newTransaction.desc.trim(),
          amount,
          error: 'BRL',
        });
        console.error('Erro ao adicionar transação:', error);
      });

    setNewTransaction({
      desc: '',
      amount: '',
      type: 'expense',
      category: '',
      date: new Date().toISOString().split('T')[0],
    });

    setIsModalOpen(false);
    setShowCategoryDropdown(false);
  };

  // Open confirm dialog for deletion
  const handleDeleteRequest = (id: number) => {
    const txToDelete = data.transactions.find((tx: Transaction) => tx.id === id);
    if (txToDelete) {
      setConfirmDialog({
        isOpen: true,
        transaction: txToDelete,
        isDeleting: false,
      });
    }
  };

  // Confirm deletion
  const handleConfirmDelete = () => {
    if (confirmDialog.transaction) {
      setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

      showTransactionDelete({
        type: confirmDialog.transaction.type,
        description: confirmDialog.transaction.desc,
        amount: confirmDialog.transaction.amount,
      });
      deleteTransaction(confirmDialog.transaction.id);

      setConfirmDialog({
        isOpen: false,
        transaction: null,
        isDeleting: false,
      });
    }
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    setConfirmDialog({
      isOpen: false,
      transaction: null,
      isDeleting: false,
    });
  };

  // Format transaction details for dialog
  const getTransactionDetails = (tx: Transaction) => {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(tx.amount);

    return [
      {
        label: 'Descrição',
        value: tx.desc,
        icon:
          tx.type === 'expense' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ),
      },
      {
        label: 'Valor',
        value: formattedAmount,
      },
      {
        label: 'Categoria',
        value: tx.category,
      },
      {
        label: 'Data',
        value: (() => {
          const date = new Date(tx.date);
          date.setTime(date.getTime() + date.getTimezoneOffset() * 60000);
          return date.toLocaleDateString('pt-BR');
        })(),
      },
    ];
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Transações</h1>

      {/* Filters - Moved to top for better alignment */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar transação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
            className="px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="all">Todas</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>

          <button
            onClick={() => setShowPatterns(!showPatterns)}
            className={`px-4 py-2 rounded-lg transition-colors text-sm ${showPatterns ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Análise
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Left Column - Transactions */}
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border flex flex-col min-h-[400px]">
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Transações</h3>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary text-primary-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Nova
                </button>
              </div>
              <div className="flex-1">
                <TransactionList
                  transactions={sortedTransactions}
                  onDelete={handleDeleteRequest}
                  showActions={true}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Fixed Expenses */}
          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border flex flex-col min-h-[400px]">
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">Valores Fixos</h3>
                </div>
                <button
                  onClick={handleOpenCreateFixedExpense}
                  className="bg-primary text-primary-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Novo
                </button>
              </div>

              {data.fixedExpenses.length === 0 ? (
                <div className="empty-state border border-dashed border-border rounded-lg flex-1 flex flex-col items-center justify-center min-h-[250px]">
                  <div className="empty-state__icon">
                    <span className="text-xl">📋</span>
                  </div>
                  <p className="empty-state__title">Nenhum valor fixo cadastrado</p>
                  <p className="empty-state__description">
                    Adicione valores repetitivos como salário ou gastos mensais
                  </p>
                </div>
              ) : (
                <div className="border-t border-border pt-4 flex-1">
                  <div className="space-y-2">
                    {data.fixedExpenses.map((expense: any) => (
                      <div key={expense.id} className="card-base hover:shadow-sm min-h-[80px]">
                        <div className="card-content">
                          <div
                            className={`card-icon ${expense.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                          >
                            {expense.type === 'income' ? (
                              <TrendingUp className="w-5 h-5 text-green-500" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                          <div className="card-info">
                            <p className="card-title">{expense.name}</p>
                            <p className="card-meta">
                              <span>Dia {expense.dayOfMonth}</span>
                              <span className="card-meta-separator">•</span>
                              <span>{expense.category}</span>
                            </p>
                          </div>
                        </div>

                        <div className="card-actions">
                          <p
                            className={`card-amount ${expense.type === 'income' ? 'card-amount--income' : 'card-amount--expense'}`}
                          >
                            {expense.type === 'income' ? '+' : '-'}
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(expense.amount)}
                          </p>

                          <button
                            onClick={() => toggleActiveFixedExpense(expense.id)}
                            className="card-action-btn"
                            title={expense.active ? 'Desativar' : 'Ativar'}
                            aria-label={expense.active ? 'Desativar' : 'Ativar'}
                          >
                            {expense.active ? (
                              <ToggleRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenEditFixedExpense(expense)}
                            className="card-action-btn card-action-btn--primary"
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteFixedExpense(expense)}
                            className="card-action-btn card-action-btn--danger"
                            title="Excluir"
                            aria-label="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spending Patterns Panel */}
        {showPatterns && spendingPatterns.length > 0 && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Padrões de Gastos (Últimos 3 meses)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {spendingPatterns.slice(0, 6).map((pattern) => (
                <div
                  key={pattern.category}
                  className={`p-4 rounded-lg border min-h-[80px] ${
                    pattern.trend === 'up'
                      ? 'bg-red-500/10 border-red-500/30'
                      : pattern.trend === 'down'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium line-clamp-1">{pattern.category}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        pattern.trend === 'up'
                          ? 'bg-red-500/20 text-red-400'
                          : pattern.trend === 'down'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {pattern.trend === 'up'
                        ? '↑ Crescendo'
                        : pattern.trend === 'down'
                          ? '↓ Diminuindo'
                          : '→ Estável'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Média: R${pattern.average.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border">
            <h2 className="text-xl font-bold mb-4">Nova Transação</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTransaction({ ...newTransaction, type: 'expense' });
                      setShowCategoryDropdown(false);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      newTransaction.type === 'expense'
                        ? 'bg-red-500/20 border-red-500 text-red-500'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Despesa
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTransaction({ ...newTransaction, type: 'income' });
                      setShowCategoryDropdown(false);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      newTransaction.type === 'income'
                        ? 'bg-green-500/20 border-green-500 text-green-500'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Receita
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <input
                  type="text"
                  value={newTransaction.desc}
                  onChange={(e) => setNewTransaction({ ...newTransaction, desc: e.target.value })}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Aluguel, Supermercado..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, amount: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
                >
                  <span>{newTransaction.category || 'Selecione uma categoria'}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-card rounded-lg border border-border shadow-lg max-h-60 overflow-y-auto">
                    {combinedCategories.map((category) => {
                      const iconData = getCategoryIconComponent(category);
                      const IconComponent = iconData?.component;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setNewTransaction({ ...newTransaction, category });
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                        >
                          {IconComponent && (
                            <IconComponent
                              size={18}
                              style={{ color: iconData?.color || getCategoryColor(category) }}
                            />
                          )}
                          <span className="text-sm">{category}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewTransaction({
                      desc: '',
                      amount: '',
                      type: 'expense',
                      category: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                    setShowCategoryDropdown(false);
                  }}
                  className="flex-1 py-2 px-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Expense Modal */}
      {isFixedExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border">
            <h2 className="text-xl font-bold mb-4">
              {editingFixedExpense ? 'Editar Valor Fixo' : 'Novo Valor Fixo'}
            </h2>
            <form onSubmit={handleSubmitFixedExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={fixedExpenseFormData.name}
                  onChange={(e) =>
                    setFixedExpenseFormData({ ...fixedExpenseFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Aluguel, Netflix..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    value={fixedExpenseFormData.amount}
                    onChange={(e) =>
                      setFixedExpenseFormData({ ...fixedExpenseFormData, amount: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFixedExpenseFormData({ ...fixedExpenseFormData, type: 'expense' });
                      setShowFixedExpenseCategoryDropdown(false);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      fixedExpenseFormData.type === 'expense'
                        ? 'bg-red-500/20 border-red-500 text-red-500'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Despesa
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFixedExpenseFormData({ ...fixedExpenseFormData, type: 'income' });
                      setShowFixedExpenseCategoryDropdown(false);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      fixedExpenseFormData.type === 'income'
                        ? 'bg-green-500/20 border-green-500 text-green-500'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Receita
                    </div>
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <button
                  type="button"
                  onClick={() =>
                    setShowFixedExpenseCategoryDropdown(!showFixedExpenseCategoryDropdown)
                  }
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
                >
                  <span>{fixedExpenseFormData.category || 'Selecione uma categoria'}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showFixedExpenseCategoryDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showFixedExpenseCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-card rounded-lg border border-border shadow-lg max-h-60 overflow-y-auto">
                    {combinedCategories.map((category) => {
                      const iconData = getCategoryIconComponent(category);
                      const IconComponent = iconData?.component;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setFixedExpenseFormData({ ...fixedExpenseFormData, category });
                            setShowFixedExpenseCategoryDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                        >
                          {IconComponent && (
                            <IconComponent
                              size={18}
                              style={{ color: iconData?.color || getCategoryColor(category) }}
                            />
                          )}
                          <span className="text-sm">{category}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Dia do mês</label>
                <input
                  type="number"
                  value={fixedExpenseFormData.dayOfMonth}
                  onChange={(e) =>
                    setFixedExpenseFormData({
                      ...fixedExpenseFormData,
                      dayOfMonth: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  max="31"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={fixedExpenseFormData.active}
                  onChange={(e) =>
                    setFixedExpenseFormData({ ...fixedExpenseFormData, active: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-border bg-muted"
                />
                <label htmlFor="active" className="text-sm">
                  Ativo (será considerado nos cálculos)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFixedExpenseModalOpen(false)}
                  className="flex-1 py-2 px-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Excluir Transação"
        message={`Tem certeza que deseja excluir a transação '${confirmDialog.transaction?.desc}'? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive={true}
      />

      {/* Fixed Expense Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={fixedExpenseDeleteDialog.isOpen}
        onClose={handleCancelFixedExpenseDelete}
        onConfirm={handleConfirmFixedExpenseDelete}
        onCancel={handleCancelFixedExpenseDelete}
        title="Excluir Valor Fixo"
        message={`Tem certeza que deseja excluir '${fixedExpenseDeleteDialog.expense?.name}'? Esta ação não pode ser desfeita.`}
        details={
          fixedExpenseDeleteDialog.expense
            ? [
                {
                  label: 'Nome',
                  value: fixedExpenseDeleteDialog.expense.name,
                },
                {
                  label: 'Valor',
                  value: `${fixedExpenseDeleteDialog.expense.type === 'income' ? '+' : '-'}${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fixedExpenseDeleteDialog.expense.amount)}`,
                },
                {
                  label: 'Dia do mês',
                  value: `${fixedExpenseDeleteDialog.expense.dayOfMonth}`,
                },
                {
                  label: 'Categoria',
                  value: fixedExpenseDeleteDialog.expense.category,
                },
              ]
            : []
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive={true}
        isDeleting={fixedExpenseDeleteDialog.isDeleting}
      />
    </div>
  );
}
