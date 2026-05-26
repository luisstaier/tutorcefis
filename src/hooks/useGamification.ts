import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export type Level = {
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
};

export const LEVELS: Level[] = [
  { name: 'Iniciante', minXP: 0, maxXP: 200, icon: '📚' },
  { name: 'Estudante', minXP: 201, maxXP: 500, icon: '⭐' },
  { name: 'Avançado', minXP: 501, maxXP: 900, icon: '🎯' },
  { name: 'Expert', minXP: 901, maxXP: Infinity, icon: '🏆' },
];

export const useGamification = () => {
  const [xp, setXp] = useState<number>(() => {
    const saved = localStorage.getItem('tutor_cefis_xp');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('tutor_cefis_xp', xp.toString());
  }, [xp]);

  const addXp = (amount: number, reason: string) => {
    setXp(prev => {
      const newXp = prev + amount;
      toast.success(`+${amount} XP! 🎉`, {
        description: reason,
        duration: 3000,
      });
      return newXp;
    });
  };

  const currentLevel = LEVELS.find(l => xp >= l.minXP && xp <= l.maxXP) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1] || null;
  
  const progress = nextLevel 
    ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 
    : 100;

  return { xp, addXp, currentLevel, nextLevel, progress };
};
