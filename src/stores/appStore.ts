import { create } from 'zustand';
import { Transaction, Budget, Goal, AppData, DEFAULT_CATEGORIES, FixedExpense } from '@/types';
import {
  getTransactionsKey,
  getBudgetsKey,
  getGoalsKey,
  getCategoriesKey,
  PROFILE_STORAGE_KEY,
} from '@/config/storage';

interface AppState {
  data: Omit<AppData, 'notifications'> & { fixedExpenses: FixedExpense[] };
  loading: boolean;
  init: (profileId: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'profileId'>) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'profileId' | 'current'>) => Promise<Goal>;
  updateGoal: (id: number, updatedGoal: Partial<Goal>) => Promise<Goal | null>;
  deleteGoal: (id: number) => Promise<void>;
  addGoalValue: (id: number, amount: number) => Promise<Goal | null>;
  addBudget: (budget: Omit<Budget, 'profileId'>) => Promise<void>;
  updateBudget: (oldCategory: string, newBudget: Budget) => Promise<void>;
  deleteBudget: (category: string) => Promise<void>;
  addCategory: (categoryName: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
  editCategory: (oldName: string, newName: string) => Promise<void>;
  getValidCategories: () => string[];

  // Métodos para valores fixos
  addFixedExpense: (
    fixedExpense: Omit<FixedExpense, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
  ) => Promise<FixedExpense>;
  updateFixedExpense: (
    id: number,
    updatedFixedExpense: Partial<FixedExpense>
  ) => Promise<FixedExpense | null>;
  deleteFixedExpense: (id: number) => Promise<void>;
  toggleFixedExpenseActive: (id: number) => Promise<void>;
  getActiveFixedExpenses: () => FixedExpense[];
}

export const useAppStore = create<AppState>((set, get) => ({
  data: {
    transactions: [],
    budgets: [],
    goals: [],
    categories: [],
    fixedExpenses: [],
  },
  loading: false,

  init: async (profileId) => {
    set({ loading: true });
    try {
      // Load data from localStorage
      const transactions = JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]');
      const budgets = JSON.parse(localStorage.getItem(getBudgetsKey(profileId)) || '[]');
      const goals = JSON.parse(localStorage.getItem(getGoalsKey(profileId)) || '[]');
      const categories = JSON.parse(localStorage.getItem(getCategoriesKey(profileId)) || '[]');
      const fixedExpenses = JSON.parse(
        localStorage.getItem(`fins_profile_${profileId}_fixedExpenses`) || '[]'
      );

      // Backwards-compat: also read legacy categories stored by the older categoriesStore
      // which uses key `fins_categories_{profileId}` and stores an object with `categories: Category[]`.
      let legacyCategoryNames: string[] = [];
      try {
        const legacyRaw = localStorage.getItem(`fins_categories_${profileId}`);
        if (legacyRaw) {
          const legacyData = JSON.parse(legacyRaw);
          if (Array.isArray(legacyData)) {
            // Older possible format: array of strings
            legacyCategoryNames = legacyData.filter((c: any) => typeof c === 'string');
          } else if (legacyData && Array.isArray(legacyData.categories)) {
            // Newer categoriesStore format: { categories: Category[] }
            legacyCategoryNames = legacyData.categories
              .filter((c: any) => c && typeof c.name === 'string')
              .map((c: any) => c.name);
          }
        }
      } catch (e) {
        // ignore parse errors
      }

      // Merge and dedupe category names (keep DEFAULT_CATEGORIES order first)
      const mergedCategories = Array.from(new Set([...categories, ...legacyCategoryNames]));

      set({
        data: {
          transactions,
          budgets,
          goals,
          categories: mergedCategories,
          fixedExpenses,
        },
      });

      // Persist merged categories back to ecofinance key so selects read the unified list
      try {
        localStorage.setItem(getCategoriesKey(profileId), JSON.stringify(mergedCategories));
      } catch (e) {
        // ignore storage errors
      }
    } catch {
      // Silently fail on init
    } finally {
      set({ loading: false });
    }
  },

  addTransaction: async (transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now(),
      profileId: localStorage.getItem(PROFILE_STORAGE_KEY) || '',
    };

    set((state) => ({
      data: {
        ...state.data,
        transactions: [...state.data.transactions, newTransaction],
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]');
      localStorage.setItem(
        getTransactionsKey(profileId),
        JSON.stringify([...currentData, newTransaction])
      );
    }

    return newTransaction;
  },

  deleteTransaction: async (id) => {
    set((state) => ({
      data: {
        ...state.data,
        transactions: state.data.transactions.filter((tx: Transaction) => tx.id !== id),
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]');
      localStorage.setItem(
        getTransactionsKey(profileId),
        JSON.stringify(currentData.filter((tx: Transaction) => tx.id !== id))
      );
    }
  },

  addGoal: async (goal) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now(),
      current: 0,
      profileId: localStorage.getItem(PROFILE_STORAGE_KEY) || '',
    };

    set((state) => ({
      data: {
        ...state.data,
        goals: [...state.data.goals, newGoal],
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getGoalsKey(profileId)) || '[]');
      localStorage.setItem(getGoalsKey(profileId), JSON.stringify([...currentData, newGoal]));
    }

    return newGoal;
  },

  updateGoal: async (id, updatedGoal) => {
    set((state) => {
      const goals = state.data.goals.map((goal: Goal) =>
        goal.id === id ? { ...goal, ...updatedGoal } : goal
      );
      return {
        data: {
          ...state.data,
          goals,
        },
      };
    });

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getGoalsKey(profileId)) || '[]');
      const updatedGoals = currentData.map((goal: Goal) =>
        goal.id === id ? { ...goal, ...updatedGoal } : goal
      );
      localStorage.setItem(getGoalsKey(profileId), JSON.stringify(updatedGoals));
    }

    const updated = get().data.goals.find((goal: Goal) => goal.id === id);
    return updated || null;
  },

  deleteGoal: async (id) => {
    set((state) => ({
      data: {
        ...state.data,
        goals: state.data.goals.filter((goal: Goal) => goal.id !== id),
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getGoalsKey(profileId)) || '[]');
      localStorage.setItem(
        getGoalsKey(profileId),
        JSON.stringify(currentData.filter((goal: Goal) => goal.id !== id))
      );
    }
  },

  addGoalValue: async (id, amount) => {
    const goal = get().data.goals.find((goal: Goal) => goal.id === id);
    if (!goal) return null;

    const updatedGoal = { ...goal, current: goal.current + amount };
    await get().updateGoal(id, updatedGoal);
    return updatedGoal;
  },

  addBudget: async (budget) => {
    const newBudget: Budget = {
      ...budget,
      profileId: localStorage.getItem(PROFILE_STORAGE_KEY) || '',
    };

    set((state) => ({
      data: {
        ...state.data,
        budgets: [...state.data.budgets, newBudget],
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getBudgetsKey(profileId)) || '[]');
      localStorage.setItem(getBudgetsKey(profileId), JSON.stringify([...currentData, newBudget]));
    }
  },

  updateBudget: async (oldCategory, newBudget) => {
    set((state) => {
      const budgets = state.data.budgets.map((budget: Budget) =>
        budget.category === oldCategory ? newBudget : budget
      );

      const transactions = state.data.transactions.map((tx: Transaction) =>
        tx.category === oldCategory ? { ...tx, category: newBudget.category } : tx
      );

      const categories = state.data.categories.map((cat: string) =>
        cat === oldCategory ? newBudget.category : cat
      );

      return {
        data: {
          ...state.data,
          budgets,
          transactions,
          categories,
        },
      };
    });

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const [currentBudgets, currentTransactions, currentCategories] = await Promise.all([
        JSON.parse(localStorage.getItem(getBudgetsKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getCategoriesKey(profileId)) || '[]'),
      ]);

      const updatedBudgets = currentBudgets.map((budget: Budget) =>
        budget.category === oldCategory ? newBudget : budget
      );

      const updatedTransactions = currentTransactions.map((tx: Transaction) =>
        tx.category === oldCategory ? { ...tx, category: newBudget.category } : tx
      );

      const updatedCategories = currentCategories.map((cat: string) =>
        cat === oldCategory ? newBudget.category : cat
      );

      await Promise.all([
        localStorage.setItem(getBudgetsKey(profileId), JSON.stringify(updatedBudgets)),
        localStorage.setItem(getTransactionsKey(profileId), JSON.stringify(updatedTransactions)),
        localStorage.setItem(getCategoriesKey(profileId), JSON.stringify(updatedCategories)),
      ]);
    }
  },

  deleteBudget: async (category) => {
    set((state) => {
      const budgets = state.data.budgets.filter((budget: Budget) => budget.category !== category);
      const transactions = state.data.transactions.map((tx: Transaction) =>
        tx.category === category ? { ...tx, category: 'Outros' } : tx
      );
      const categories = state.data.categories.filter((cat: string) => cat !== category);

      return {
        data: {
          ...state.data,
          budgets,
          transactions,
          categories,
        },
      };
    });

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const [currentBudgets, currentTransactions, currentCategories] = await Promise.all([
        JSON.parse(localStorage.getItem(getBudgetsKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getCategoriesKey(profileId)) || '[]'),
      ]);

      const updatedBudgets = currentBudgets.filter(
        (budget: Budget) => budget.category !== category
      );
      const updatedTransactions = currentTransactions.map((tx: Transaction) =>
        tx.category === category ? { ...tx, category: 'Outros' } : tx
      );
      const updatedCategories = currentCategories.filter((cat: string) => cat !== category);

      await Promise.all([
        localStorage.setItem(getBudgetsKey(profileId), JSON.stringify(updatedBudgets)),
        localStorage.setItem(getTransactionsKey(profileId), JSON.stringify(updatedTransactions)),
        localStorage.setItem(getCategoriesKey(profileId), JSON.stringify(updatedCategories)),
      ]);
    }
  },

  addCategory: async (categoryName) => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) return;

    const existingCategories = get().getValidCategories();
    if (existingCategories.some((cat) => cat.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    set((state) => ({
      data: {
        ...state.data,
        categories: [...state.data.categories, trimmedName],
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(localStorage.getItem(getCategoriesKey(profileId)) || '[]');
      localStorage.setItem(
        getCategoriesKey(profileId),
        JSON.stringify([...currentData, trimmedName])
      );
    }
  },

  deleteCategory: async (categoryName) => {
    if (DEFAULT_CATEGORIES.includes(categoryName)) {
      return;
    }

    set((state) => {
      const categories = state.data.categories.filter((cat: string) => cat !== categoryName);
      const transactions = state.data.transactions.map((tx: Transaction) =>
        tx.category === categoryName ? { ...tx, category: 'Outros' } : tx
      );
      const budgets = state.data.budgets.filter(
        (budget: Budget) => budget.category !== categoryName
      );

      return {
        data: {
          ...state.data,
          categories,
          transactions,
          budgets,
        },
      };
    });

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const [currentCategories, currentTransactions, currentBudgets] = await Promise.all([
        JSON.parse(localStorage.getItem(getCategoriesKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getBudgetsKey(profileId)) || '[]'),
      ]);

      const updatedCategories = currentCategories.filter((cat: string) => cat !== categoryName);
      const updatedTransactions = currentTransactions.map((tx: Transaction) =>
        tx.category === categoryName ? { ...tx, category: 'Outros' } : tx
      );
      const updatedBudgets = currentBudgets.filter(
        (budget: Budget) => budget.category !== categoryName
      );

      await Promise.all([
        localStorage.setItem(getCategoriesKey(profileId), JSON.stringify(updatedCategories)),
        localStorage.setItem(getTransactionsKey(profileId), JSON.stringify(updatedTransactions)),
        localStorage.setItem(getBudgetsKey(profileId), JSON.stringify(updatedBudgets)),
      ]);
    }
  },

  editCategory: async (oldName, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const existingCategories = get()
      .getValidCategories()
      .filter((cat) => cat !== oldName);
    if (existingCategories.some((cat) => cat.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    set((state) => {
      const categories = state.data.categories.map((cat: string) =>
        cat === oldName ? trimmedName : cat
      );

      const transactions = state.data.transactions.map((tx: Transaction) =>
        tx.category === oldName ? { ...tx, category: trimmedName } : tx
      );

      const budgets = state.data.budgets.map((budget: Budget) =>
        budget.category === oldName ? { ...budget, category: trimmedName } : budget
      );

      return {
        data: {
          ...state.data,
          categories,
          transactions,
          budgets,
        },
      };
    });

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const [currentCategories, currentTransactions, currentBudgets] = await Promise.all([
        JSON.parse(localStorage.getItem(getCategoriesKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getTransactionsKey(profileId)) || '[]'),
        JSON.parse(localStorage.getItem(getBudgetsKey(profileId)) || '[]'),
      ]);

      const updatedCategories = currentCategories.map((cat: string) =>
        cat === oldName ? trimmedName : cat
      );

      const updatedTransactions = currentTransactions.map((tx: Transaction) =>
        tx.category === oldName ? { ...tx, category: trimmedName } : tx
      );

      const updatedBudgets = currentBudgets.map((budget: Budget) =>
        budget.category === oldName ? { ...budget, category: trimmedName } : budget
      );

      await Promise.all([
        localStorage.setItem(getCategoriesKey(profileId), JSON.stringify(updatedCategories)),
        localStorage.setItem(getTransactionsKey(profileId), JSON.stringify(updatedTransactions)),
        localStorage.setItem(getBudgetsKey(profileId), JSON.stringify(updatedBudgets)),
      ]);
    }
  },

  getValidCategories: () => {
    return [...DEFAULT_CATEGORIES, ...get().data.categories];
  },

  addFixedExpense: async (fixedExpense) => {
    const newFixedExpense: FixedExpense = {
      ...fixedExpense,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileId: localStorage.getItem(PROFILE_STORAGE_KEY) || '',
    };

    set((state) => ({
      data: {
        ...state.data,
        fixedExpenses: [...state.data.fixedExpenses, newFixedExpense],
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(
        localStorage.getItem(`fins_profile_${profileId}_fixedExpenses`) || '[]'
      );
      localStorage.setItem(
        `fins_profile_${profileId}_fixedExpenses`,
        JSON.stringify([...currentData, newFixedExpense])
      );
    }

    return newFixedExpense;
  },

  updateFixedExpense: async (id, updatedFixedExpense) => {
    set((state) => {
      const fixedExpenses = state.data.fixedExpenses.map((expense: FixedExpense) =>
        expense.id === id
          ? { ...expense, ...updatedFixedExpense, updatedAt: new Date().toISOString() }
          : expense
      );
      return {
        data: {
          ...state.data,
          fixedExpenses,
        },
      };
    });

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(
        localStorage.getItem(`fins_profile_${profileId}_fixedExpenses`) || '[]'
      );
      const updatedData = currentData.map((expense: FixedExpense) =>
        expense.id === id
          ? { ...expense, ...updatedFixedExpense, updatedAt: new Date().toISOString() }
          : expense
      );
      localStorage.setItem(`fins_profile_${profileId}_fixedExpenses`, JSON.stringify(updatedData));
    }

    const updated = get().data.fixedExpenses.find((expense: FixedExpense) => expense.id === id);
    return updated || null;
  },

  deleteFixedExpense: async (id) => {
    set((state) => ({
      data: {
        ...state.data,
        fixedExpenses: state.data.fixedExpenses.filter(
          (expense: FixedExpense) => expense.id !== id
        ),
      },
    }));

    const profileId = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileId) {
      const currentData = JSON.parse(
        localStorage.getItem(`fins_profile_${profileId}_fixedExpenses`) || '[]'
      );
      const updatedData = currentData.filter((expense: FixedExpense) => expense.id !== id);
      localStorage.setItem(`fins_profile_${profileId}_fixedExpenses`, JSON.stringify(updatedData));
    }
  },

  toggleFixedExpenseActive: async (id) => {
    const expense = get().data.fixedExpenses.find((expense: FixedExpense) => expense.id === id);
    if (expense) {
      await get().updateFixedExpense(id, { active: !expense.active });
    }
  },

  getActiveFixedExpenses: () => {
    return get().data.fixedExpenses.filter((expense: FixedExpense) => expense.active);
  },
}));
