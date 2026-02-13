/**
 * Componente de Lista de Transações
 * Refatorado com design system padronizado
 */

import React, { memo } from 'react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { getCategoryColor, CATEGORY_ICON_MAP } from '@/utils/categoryIcons';
import { CATEGORY_ICONS } from '@/types/categories';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { TransactionListSkeleton } from './ui/Skeleton';
import { Trash2, Edit2 } from 'lucide-react';

// Função local para obter ícone da categoria (igual ao do Transactions.tsx)
const getCategoryIconComponent = (
  categoryName: string,
  storeCategories: ReturnType<typeof useCategoriesStore.getState>['categories']
) => {
  if (!categoryName) {
    return CATEGORY_ICONS[CATEGORY_ICONS.length - 1]?.component || null;
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
    if (iconData) return iconData.component;
  }

  // Fallback: usar mapeamento centralizado
  let iconId = CATEGORY_ICON_MAP[categoryName];
  if (!iconId) {
    const matchKey = Object.keys(CATEGORY_ICON_MAP).find(
      (key) => key.toLowerCase().normalize('NFD') === normalizedCategory
    );
    if (matchKey) {
      iconId = CATEGORY_ICON_MAP[matchKey];
    }
  }
  if (iconId) {
    const iconData = CATEGORY_ICONS.find((icon: { id: string }) => icon.id === iconId);
    if (iconData) return iconData.component;
  }

  // Fallback: buscar por palavra-chave
  for (const [categoryKey, id] of Object.entries(CATEGORY_ICON_MAP)) {
    const normalizedKey = categoryKey.toLowerCase().normalize('NFD');
    if (normalizedCategory.includes(normalizedKey) || normalizedKey.includes(normalizedCategory)) {
      const iconData = CATEGORY_ICONS.find((icon: { id: string }) => icon.id === id);
      if (iconData) return iconData.component;
    }
  }

  return CATEGORY_ICONS[CATEGORY_ICONS.length - 1]?.component || null;
};

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: number) => void;
  onEdit?: (transaction: Transaction) => void;
  showActions?: boolean;
  loading?: boolean;
  selectedIds?: number[];
  onSelect?: (id: number) => void;
  disabled?: boolean;
}

export const TransactionList = memo(function TransactionList({
  transactions,
  onDelete,
  onEdit,
  showActions = true,
  loading = false,
  selectedIds = [],
  onSelect,
  disabled = false,
}: TransactionListProps) {
  console.log('TransactionList received transactions:', transactions);
  if (loading) {
    return <TransactionListSkeleton count={5} />;
  }

  if (transactions.length === 0) {
    return (
      <div className="empty-state border border-dashed border-border rounded-lg flex-1 flex flex-col items-center justify-center min-h-[250px]">
        <div className="empty-state__icon">
          <span className="text-xl">💸</span>
        </div>
        <p className="empty-state__title">Nenhuma transação encontrada</p>
        <p className="empty-state__description">Comece adicionando sua primeira transação</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 flex-1">
      <div className="space-y-2">
        {transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            onDelete={onDelete}
            onEdit={onEdit}
            showActions={showActions}
            isSelected={selectedIds.includes(tx.id)}
            onSelect={onSelect}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
});

// Componente individual de transação
interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: (id: number) => void;
  onEdit?: (transaction: Transaction) => void;
  showActions?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  disabled?: boolean;
}

const TransactionItem = memo(function TransactionItem({
  transaction,
  onDelete,
  onEdit,
  showActions,
  isSelected = false,
  onSelect,
  disabled = false,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const { categories: storeCategories } = useCategoriesStore();

  // Usa a função local que busca ícones customizados
  const IconComponent = getCategoryIconComponent(transaction.category, storeCategories);

  // Obtém cor customizada da categoria se existir
  const color = getCategoryColor(transaction.category);
  const categoryFromStore = storeCategories.find((cat) => cat.name === transaction.category);
  const categoryColor = categoryFromStore?.color || color;

  const handleClick = () => {
    if (onSelect && !disabled) {
      onSelect(transaction.id);
    }
  };

  const cardClasses = [
    'card-base',
    'card-transaction',
    isIncome ? 'card-transaction--income' : 'card-transaction--expense',
    isSelected ? 'card-transaction--selected' : '',
    disabled ? 'card-transaction--disabled' : '',
    onSelect ? 'cursor-pointer' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={isSelected}
    >
      <div className="card-content">
        <div className="card-icon" style={{ backgroundColor: `${categoryColor}20` }}>
          {IconComponent && (
            <IconComponent size={20} style={{ color: categoryColor }} className="lucide-icon" />
          )}
        </div>

        <div className="card-info">
          <p className="card-title">{transaction.desc}</p>
          <p className="card-meta">
            <span className="truncate max-w-[100px] sm:max-w-none">{transaction.category}</span>
            <span className="card-meta-separator">•</span>
            <span className="flex-shrink-0">
              {(() => {
                const date = new Date(transaction.date);
                // Ajusta a data para fuso horário local para evitar deslocamento
                date.setTime(date.getTime() + date.getTimezoneOffset() * 60000);
                return date.toLocaleDateString('pt-BR');
              })()}
            </span>
          </p>
        </div>
      </div>

      <div className="card-actions">
        <p className={`card-amount ${isIncome ? 'card-amount--income' : 'card-amount--expense'}`}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>

        {showActions && (onDelete || onEdit) && (
          <>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(transaction);
                }}
                className="card-action-btn card-action-btn--primary"
                title="Editar transação"
                aria-label="Editar transação"
                disabled={disabled}
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(transaction.id);
                }}
                className="card-action-btn card-action-btn--danger"
                title="Excluir transação"
                aria-label="Excluir transação"
                disabled={disabled}
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// Versão resumida para uso em listas compactas
interface TransactionListCompactProps {
  transactions: Transaction[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export const TransactionListCompact = memo(function TransactionListCompact({
  transactions,
  maxItems = 3,
  showViewAll = true,
  onViewAll,
}: TransactionListCompactProps) {
  const { categories: storeCategories } = useCategoriesStore();

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma transação recente</p>;
  }

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems);

  return (
    <div className="space-y-1">
      {recentTransactions.map((tx) => {
        const IconComponent = getCategoryIconComponent(tx.category, storeCategories);
        const color = getCategoryColor(tx.category);
        const categoryFromStore = storeCategories.find((cat) => cat.name === tx.category);
        const categoryColor = categoryFromStore?.color || color;

        return (
          <div key={tx.id} className="card-compact">
            <div className="card-compact__content">
              {IconComponent && (
                <div className="card-compact__icon">
                  <IconComponent
                    size={16}
                    style={{ color: categoryColor }}
                    className="lucide-icon"
                  />
                </div>
              )}
              <span className="card-compact__title">{tx.desc}</span>
            </div>
            <span
              className={`card-compact__amount ${
                tx.type === 'income' ? 'card-amount--income' : 'card-amount--expense'
              }`}
            >
              {tx.type === 'income' ? '+' : '-'}
              {formatCurrency(tx.amount)}
            </span>
          </div>
        );
      })}

      {showViewAll && transactions.length > maxItems && (
        <button
          onClick={onViewAll}
          className="w-full py-2 text-xs text-primary hover:text-primary/80 transition-colors text-center"
        >
          Ver todas ({transactions.length})
        </button>
      )}
    </div>
  );
});

export default TransactionList;
