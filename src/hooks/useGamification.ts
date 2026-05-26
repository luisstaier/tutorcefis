import { useState, useEffect, useCallback } from 'react';

export type Level = {
  name: string;
  minXP: number;
  maxXP: number;
};

export const LEVELS: Level[] = [
  { name: 'Iniciante', minXP: 0, maxXP: 200 },
  { name: 'Estudante', minXP: 201, maxXP: 500 },
  { name: 'Avançado', minXP: 501, maxXP: 900 },
  { name: 'Expert', minXP: 901, maxXP: Infinity },
];

export interface FloatingXP {
  id: number;
  amount: number;
}

export const useGamification = () => {
  const [xp, setXp] = useState<number>(() => {
    const saved = localStorage.getItem('tutor_cefis_xp');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [exploredSteps, setExploredSteps] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('tutor_cefis_progress_steps');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('tutor_cefis_xp', xp.toString());
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('tutor_cefis_progress_steps', JSON.stringify(Array.from(exploredSteps)));
  }, [exploredSteps]);

  const addXp = useCallback((amount: number) => {
    setXp(prev => prev + amount);
    const id = Date.now();
    setFloatingXPs(prev => [...prev, { id, amount }]);
    
    setTimeout(() => {
      setFloatingXPs(prev => prev.filter(f => f.id !== id));
    }, 2000);
  }, []);

  const markStepExplored = useCallback((stepIndex: number) => {
    if (!exploredSteps.has(stepIndex)) {
      setExploredSteps(prev => {
        const next = new Set(prev);
        next.add(stepIndex);
        return next;
      });
      // Maybe add small XP for exploration too if desired, 
      // but sticking to instructions for now
    }
  }, [exploredSteps]);

  const currentLevel = LEVELS.find(l => xp >= l.minXP && xp <= l.maxXP) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1] || null;
  
  const levelProgress = nextLevel 
    ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 
    : 100;

  return { 
    xp, 
    addXp, 
    currentLevel, 
    nextLevel, 
    levelProgress, 
    floatingXPs,
    exploredSteps,
    markStepExplored
  };
};