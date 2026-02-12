/**
 * Sistema de Migração de Dados
 * Gerencia versionamento e migração de dados do localStorage
 */

import { PROFILE_STORAGE_KEY, PROFILES_LIST_KEY, DATA_VERSION } from './storage';

// Versão atual do schema
export const CURRENT_SCHEMA_VERSION = DATA_VERSION;

// Tipos de migração
interface Migration {
  version: number;
  migrate: (data: any) => any;
}

// Lista de migrações
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    migrate: (data: any) => {
      // Migração de ecofinance -> fins
      // Renomear chaves no localStorage se necessário
      return data;
    },
  },
];

/**
 * Migra dados para a versão atual
 */
export function migrateData<T = any>(key: string, data: T): T {
  const storedVersion = getDataVersion(key);

  if (storedVersion >= CURRENT_SCHEMA_VERSION) {
    return data;
  }

  let migratedData = data;

  for (const migration of MIGRATIONS) {
    if (migration.version > storedVersion) {
      console.log(`[Migration] Aplicando migração v${migration.version}`);
      migratedData = migration.migrate(migratedData);
      setDataVersion(key, migration.version);
    }
  }

  return migratedData;
}

/**
 * Obtém a versão dos dados armazenados
 */
function getDataVersion(key: string): number {
  try {
    const versionKey = `${key}_version`;
    const version = localStorage.getItem(versionKey);
    return version ? parseInt(version, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Define a versão dos dados
 */
function setDataVersion(key: string, version: number): void {
  try {
    const versionKey = `${key}_version`;
    localStorage.setItem(versionKey, version.toString());
  } catch (error) {
    console.error('[Migration] Erro ao salvar versão:', error);
  }
}

/**
 * Migra perfis do antigo formato ecofinance
 */
export function migrateProfiles(): void {
  const oldProfiles = localStorage.getItem('ecofinance_profiles');
  const newProfiles = localStorage.getItem(PROFILES_LIST_KEY);

  if (oldProfiles && !newProfiles) {
    console.log('[Migration] Migrando perfis para novo formato');
    localStorage.setItem(PROFILES_LIST_KEY, oldProfiles);
    localStorage.setItem('ecofinance_profiles_version', '1');
  }
}

/**
 * Migra dados de um perfil específico
 */
export function migrateProfileData(profileId: string): void {
  const dataTypes = [
    'transactions',
    'budgets',
    'goals',
    'categories',
    'notifications',
    'fixedExpenses',
  ];

  dataTypes.forEach((type) => {
    const oldKey = `ecofinance_${profileId}_${type}`;
    const newKey = `fins_profile_${profileId}_${type}`;

    const oldData = localStorage.getItem(oldKey);
    const newData = localStorage.getItem(newKey);

    if (oldData && !newData) {
      console.log(`[Migration] Migrando ${type} do perfil ${profileId}`);
      localStorage.setItem(newKey, oldData);
      localStorage.setItem(`${newKey}_version`, '1');
    }
  });
}

/**
 * Verifica se há dados para migrar
 */
export function hasDataToMigrate(): boolean {
  const oldProfiles = localStorage.getItem('ecofinance_profiles');
  return !!oldProfiles;
}

/**
 * Executa todas as migrações necessárias
 */
export function runAllMigrations(): void {
  console.log('[Migration] Verificando migrações...');

  // Migrar perfis
  migrateProfiles();

  // Migrar dados de cada perfil
  try {
    const profiles = JSON.parse(localStorage.getItem(PROFILES_LIST_KEY) || '[]');
    profiles.forEach((profile: { id: string }) => {
      migrateProfileData(profile.id);
    });
  } catch (error) {
    console.error('[Migration] Erro ao migrar perfis:', error);
  }

  console.log('[Migration] Migrações concluídas');
}

/**
 * Limpa dados antigos do ecofinance
 */
export function clearOldEcoFinanceData(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ecofinance_') && !key.includes('profiles_version')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    console.log(`[Migration] Removido: ${key}`);
  });
}
