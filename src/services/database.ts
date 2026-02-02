import Dexie, { Table } from 'dexie';
import { Profile, Transaction, Budget, Goal, Notification, AppData } from '@/types';

class FinsDB extends Dexie {
  profiles!: Table<Profile>;
  transactions!: Table<Transaction>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  notifications!: Table<Notification>;
  categories!: Table<{ id: number; name: string; profileId: string }>;

  constructor() {
    super('FinsDB');
    this.version(1).stores({
      profiles: 'id, name, avatar, color, passwordHash, createdAt, lastAccess',
      transactions: 'id, desc, amount, type, category, date, profileId',
      budgets: 'category, limit, profileId',
      goals: 'id, name, target, current, profileId',
      notifications: 'id, type, title, message, read, date, profileId',
      categories: '++id, name, profileId'
    });
  }
}

export const db = new FinsDB();

// Migration from localStorage to Dexie
export async function migrateLocalStorage() {
  const profilesKey = 'ecofinance_profiles';
  const activeProfileKey = 'ecofinance_active_profile';
  
  const storedProfiles = localStorage.getItem(profilesKey);
  if (storedProfiles) {
    try {
      const profiles: Profile[] = JSON.parse(storedProfiles);
      for (const profile of profiles) {
        await db.profiles.add(profile);
        
        // Migrate profile-specific data
        const transactionsKey = `ecofinance_${profile.id}_transactions`;
        const budgetsKey = `ecofinance_${profile.id}_budgets`;
        const goalsKey = `ecofinance_${profile.id}_goals`;
        const categoriesKey = `ecofinance_${profile.id}_categories`;
        const notificationsKey = `ecofinance_${profile.id}_notifications`;
        
        const transactionsData = localStorage.getItem(transactionsKey);
        if (transactionsData) {
          const transactions: Transaction[] = JSON.parse(transactionsData);
          for (const tx of transactions) {
            await db.transactions.add({ ...tx, profileId: profile.id });
          }
        }
        
        const budgetsData = localStorage.getItem(budgetsKey);
        if (budgetsData) {
          const budgets: Budget[] = JSON.parse(budgetsData);
          for (const budget of budgets) {
            await db.budgets.add({ ...budget, profileId: profile.id });
          }
        }
        
        const goalsData = localStorage.getItem(goalsKey);
        if (goalsData) {
          const goals: Goal[] = JSON.parse(goalsData);
          for (const goal of goals) {
            await db.goals.add({ ...goal, profileId: profile.id });
          }
        }
        
        const categoriesData = localStorage.getItem(categoriesKey);
        if (categoriesData) {
          const categories: string[] = JSON.parse(categoriesData);
          for (const category of categories) {
            await db.categories.add({ id: Date.now(), name: category, profileId: profile.id });
          }
        }
        
        const notificationsData = localStorage.getItem(notificationsKey);
        if (notificationsData) {
          const notifications: Notification[] = JSON.parse(notificationsData);
          for (const notification of notifications) {
            await db.notifications.add({ ...notification, profileId: profile.id });
          }
        }
      }
      
      console.log('LocalStorage migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }
  
  const activeProfileId = localStorage.getItem(activeProfileKey);
  if (activeProfileId) {
    localStorage.setItem('ecofinance_active_profile', activeProfileId);
  }
}

// Data access methods
export async function getAppData(profileId: string): Promise<AppData> {
  const [transactions, budgets, goals, categories, notifications] = await Promise.all([
    db.transactions.where('profileId').equals(profileId).toArray(),
    db.budgets.where('profileId').equals(profileId).toArray(),
    db.goals.where('profileId').equals(profileId).toArray(),
    db.categories.where('profileId').equals(profileId).toArray(),
    db.notifications.where('profileId').equals(profileId).toArray()
  ]);
  
  return {
    transactions,
    budgets,
    goals,
    categories: categories.map(cat => cat.name),
    notifications
  };
}

export async function saveAppData(profileId: string, data: Partial<AppData>) {
  if (data.transactions) {
    await Promise.all([
      db.transactions.where('profileId').equals(profileId).delete(),
      ...data.transactions.map(tx => db.transactions.add({ ...tx, profileId }))
    ]);
  }
  
  if (data.budgets) {
    await Promise.all([
      db.budgets.where('profileId').equals(profileId).delete(),
      ...data.budgets.map(budget => db.budgets.add({ ...budget, profileId }))
    ]);
  }
  
  if (data.goals) {
    await Promise.all([
      db.goals.where('profileId').equals(profileId).delete(),
      ...data.goals.map(goal => db.goals.add({ ...goal, profileId }))
    ]);
  }
  
  if (data.categories) {
    await Promise.all([
      db.categories.where('profileId').equals(profileId).delete(),
      ...data.categories.map(name => db.categories.add({ id: Date.now(), name, profileId }))
    ]);
  }
  
  if (data.notifications) {
    await Promise.all([
      db.notifications.where('profileId').equals(profileId).delete(),
      ...data.notifications.map(notif => db.notifications.add({ ...notif, profileId }))
    ]);
  }
}

export async function addTransaction(profileId: string, transaction: Omit<Transaction, 'id' | 'profileId'>) {
  const newTransaction: Transaction = {
    ...transaction,
    id: Date.now(),
    profileId
  };
  await db.transactions.add(newTransaction);
  return newTransaction;
}

export async function deleteTransaction(id: number) {
  await db.transactions.delete(id);
}

export async function addGoal(profileId: string, goal: Omit<Goal, 'id' | 'profileId' | 'current'>) {
  const newGoal: Goal = {
    ...goal,
    id: Date.now(),
    current: 0,
    profileId
  };
  await db.goals.add(newGoal);
  return newGoal;
}

export async function updateGoal(id: number, updatedGoal: Partial<Goal>) {
  await db.goals.update(id, updatedGoal);
  return db.goals.get(id);
}

export async function deleteGoal(id: number) {
  await db.goals.delete(id);
}

export async function addGoalValue(id: number, amount: number) {
  const goal = await db.goals.get(id);
  if (goal) {
    const updatedGoal = { ...goal, current: goal.current + amount };
    await db.goals.update(id, updatedGoal);
    return updatedGoal;
  }
  return null;
}

export async function addBudget(profileId: string, budget: Omit<Budget, 'profileId'>) {
  await db.budgets.add({ ...budget, profileId });
}

export async function updateBudget(profileId: string, oldCategory: string, newBudget: Budget) {
  await Promise.all([
    db.budgets.where({ profileId, category: oldCategory }).delete(),
    db.budgets.add({ ...newBudget, profileId }),
    db.transactions.where({ profileId, category: oldCategory }).modify(tx => {
      tx.category = newBudget.category;
    }),
    db.categories.where({ profileId, name: oldCategory }).modify(cat => {
      cat.name = newBudget.category;
    })
  ]);
}

export async function deleteBudget(profileId: string, category: string) {
  await Promise.all([
    db.budgets.where({ profileId, category }).delete(),
    db.transactions.where({ profileId, category }).modify(tx => {
      tx.category = 'Outros';
    }),
    db.categories.where({ profileId, name: category }).delete()
  ]);
}

export async function addCategory(profileId: string, categoryName: string) {
  await db.categories.add({ id: Date.now(), name: categoryName, profileId });
}

export async function deleteCategory(profileId: string, categoryName: string) {
  await Promise.all([
    db.categories.where({ profileId, name: categoryName }).delete(),
    db.transactions.where({ profileId, category: categoryName }).modify(tx => {
      tx.category = 'Outros';
    }),
    db.budgets.where({ profileId, category: categoryName }).delete()
  ]);
}

export async function editCategory(profileId: string, oldName: string, newName: string) {
  await Promise.all([
    db.categories.where({ profileId, name: oldName }).modify(cat => {
      cat.name = newName;
    }),
    db.transactions.where({ profileId, category: oldName }).modify(tx => {
      tx.category = newName;
    }),
    db.budgets.where({ profileId, category: oldName }).modify(budget => {
      budget.category = newName;
    })
  ]);
}

export async function addNotification(profileId: string, notification: Omit<Notification, 'id' | 'profileId'>) {
  const newNotification: Notification = {
    ...notification,
    id: Date.now(),
    read: false,
    profileId
  };
  await db.notifications.add(newNotification);
  return newNotification;
}

export async function markNotificationsAsRead(profileId: string) {
  await db.notifications.where({ profileId, read: false }).modify(notif => {
    notif.read = true;
  });
}

export async function clearAllNotifications(profileId: string) {
  await db.notifications.where({ profileId }).delete();
}
