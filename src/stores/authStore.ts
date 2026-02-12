import { create } from 'zustand';
import { Profile } from '@/types';
import {
  PROFILE_STORAGE_KEY,
  PROFILES_LIST_KEY,
  getTransactionsKey,
  getBudgetsKey,
  getGoalsKey,
  getCategoriesKey,
  getNotificationsKey,
  getProfileDataKey,
} from '@/config/storage';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  profiles: Profile[];
  login: (profileId: string, password: string) => Promise<boolean>;
  logout: () => void;
  createProfile: (
    name: string,
    password: string,
    avatar?: string,
    color?: string
  ) => Promise<Profile | null>;
  updateProfile: (profileId: string, data: Partial<Profile>) => Promise<Profile | null>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  validatePassword: (profileId: string, password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Carregar perfis do localStorage
  const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');

  // Carregar usuário ativo do localStorage
  const activeProfileId = localStorage.getItem(PROFILE_STORAGE_KEY);
  const activeProfile = activeProfileId
    ? profiles.find((p: Profile) => p.id === activeProfileId)
    : null;

  return {
    user: activeProfile || null,
    loading: false,
    profiles,

    login: async (profileId, password) => {
      set({ loading: true });
      try {
        const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');
        const profile = profiles.find((p: Profile) => p.id === profileId);

        if (!profile) {
          throw new Error('Profile not found');
        }

        const isValid = await verifyPasswordHash(password, profile.passwordHash);
        if (isValid) {
          // Update last access time
          profile.lastAccess = new Date().toISOString();
          const updatedProfiles = profiles.map((p: Profile) => (p.id === profileId ? profile : p));
          localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(updatedProfiles));

          // Store active profile
          localStorage.setItem(PROFILE_STORAGE_KEY, profileId);

          // Clear welcome toast flag to show it on login
          sessionStorage.removeItem('welcome_shown');

          set({ user: profile, profiles: updatedProfiles });
          return true;
        }

        return false;
      } finally {
        set({ loading: false });
      }
    },

    logout: () => {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      sessionStorage.removeItem('welcome_shown');
      set({ user: null });
    },

    createProfile: async (name, password, avatar = '👤', color = '#F4A261') => {
      set({ loading: true });
      try {
        const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');

        // Validate name
        if (!name.trim()) {
          throw new Error('Nome do perfil é obrigatório');
        }

        // Check if profile with same name exists
        if (profiles.some((p: Profile) => p.name.toLowerCase() === name.toLowerCase())) {
          throw new Error('Já existe um perfil com este nome');
        }

        const passwordHash = await hashPassword(password);

        const newProfile: Profile = {
          id: Date.now().toString(),
          name: name.trim(),
          avatar,
          color,
          passwordHash,
          createdAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
        };

        profiles.push(newProfile);
        localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));

        // Initialize profile data
        const initialData = {
          transactions: [],
          budget: [],
          goals: [],
          categories: [],
        };

        localStorage.setItem(
          getTransactionsKey(newProfile.id),
          JSON.stringify(initialData.transactions)
        );
        localStorage.setItem(getBudgetsKey(newProfile.id), JSON.stringify(initialData.budget));
        localStorage.setItem(getGoalsKey(newProfile.id), JSON.stringify(initialData.goals));
        localStorage.setItem(
          getCategoriesKey(newProfile.id),
          JSON.stringify(initialData.categories)
        );
        localStorage.setItem(getNotificationsKey(newProfile.id), JSON.stringify([]));

        set({ user: newProfile, profiles });
        localStorage.setItem(PROFILE_STORAGE_KEY, newProfile.id);

        return newProfile;
      } catch {
        return null;
      } finally {
        set({ loading: false });
      }
    },

    updateProfile: async (profileId, data) => {
      set({ loading: true });
      try {
        const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');
        const index = profiles.findIndex((p: Profile) => p.id === profileId);

        if (index === -1) {
          throw new Error('Profile not found');
        }

        const updatedProfile = { ...profiles[index], ...data };
        profiles[index] = updatedProfile;
        localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));

        if (get().user?.id === profileId) {
          set({ user: updatedProfile, profiles });
        } else {
          set({ profiles });
        }

        return updatedProfile;
      } catch (error) {
        return null;
      } finally {
        set({ loading: false });
      }
    },

    deleteProfile: async (profileId) => {
      set({ loading: true });
      try {
        const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');
        const updatedProfiles = profiles.filter((p: Profile) => p.id !== profileId);
        localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(updatedProfiles));

        // Remove profile data
        ['transactions', 'budgets', 'goals', 'categories', 'notifications'].forEach((key) => {
          localStorage.removeItem(getProfileDataKey(profileId, `_${key}`));
        });

        if (get().user?.id === profileId) {
          set({ user: null, profiles: updatedProfiles });
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        } else {
          set({ profiles: updatedProfiles });
        }

        return true;
      } catch (error) {
        return false;
      } finally {
        set({ loading: false });
      }
    },

    validatePassword: async (profileId, password) => {
      try {
        const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');
        const profile = profiles.find((p: Profile) => p.id === profileId);

        if (!profile) {
          return false;
        }

        return await verifyPasswordHash(password, profile.passwordHash);
      } catch (error) {
        return false;
      }
    },
  };
});

// Password hashing functions
async function hashPassword(password: string): Promise<string> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex + ':' + salt;
}

async function verifyPasswordHash(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) {
    // Fallback to old hash format (base64)
    return btoa(password + 'ecofinance_v1_secure_salt_2024') === storedHash;
  }

  const [hash, salt] = storedHash.split(':');
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex === hash;
}
