import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Profile } from '@/types';
import { Trash2, MoreVertical } from 'lucide-react';

interface ProfileCardProps {
  profile: Profile;
  isSelected: boolean;
  isLastAccess?: boolean;
  onClick: () => void;
  onDelete: (profileId: string) => void;
}

export function ProfileCard({ profile, isSelected, isLastAccess, onClick, onDelete }: ProfileCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete(profile.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isSelected ? 1.02 : 1,
      }}
      whileHover={{ scale: isSelected ? 1.02 : 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        group relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-out
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
          : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
        }
      `}
      style={{ 
        '--tw-ring-color': profile.color,
      } as React.CSSProperties}
    >
      {/* Botão de menu de contexto - canto superior direito */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`
            p-2 rounded-full hover:bg-muted transition-all duration-200
            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {/* Menu dropdown */}
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-20"
          >
            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-3 text-left text-sm font-medium text-foreground bg-muted/50 hover:bg-muted dark:bg-muted/20 rounded-lg border border-border/50 flex items-center gap-2.5 transition-all duration-200 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
              Excluir perfil
            </button>
          </motion.div>
        )}
      </div>

      {/* Conteúdo do card */}
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <motion.div 
          className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl"
          style={{ backgroundColor: `${profile.color}20` }}
          animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
        >{profile.avatar.startsWith('data:image/') ? (<img src={profile.avatar} alt="" />) : profile.avatar}
        </motion.div>

        {/* Indicador de último acesso - posicionado antes do nome */}
        {isLastAccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full mb-2 font-medium"
          >
            Último acesso
          </motion.div>
        )}

        {/* Nome */}
        <p className={`text-lg font-semibold text-center ${isSelected ? 'text-primary' : ''}`}>
          {profile.name}
        </p>

        {/* Indicador de seleção */}
        {isSelected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mt-3"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </motion.div>
        )}
      </div>

      {/* Click overlay para fechar menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-[5]" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </motion.div>
  );
}
