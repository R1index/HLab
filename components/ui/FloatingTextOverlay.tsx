import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface FloatingItem {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

interface FloatingTextContextType {
  spawnText: (x: number, y: number, text: string, color?: string, size?: 'sm' | 'md' | 'lg') => void;
}

const FloatingTextContext = createContext<FloatingTextContextType | null>(null);

export const useFloatingText = () => {
  const context = useContext(FloatingTextContext);
  if (!context) throw new Error('useFloatingText must be used within FloatingTextProvider');
  return context;
};

export const FloatingTextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<FloatingItem[]>([]);
  const counter = useRef(0);

  // Spawns text slightly above the input coordinates (y - 40)
  const spawnText = useCallback((x: number, y: number, text: string, color = 'text-white', size: 'sm' | 'md' | 'lg' = 'md') => {
    const id = counter.current++;
    // Offset Y by 40px to show above cursor/finger
    const spawnY = y - 40;
    
    setItems(prev => [...prev, { id, x, y: spawnY, text, color, size }]);

    // Auto cleanup
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== id));
    }, 1000);
  }, []);

  return (
    <FloatingTextContext.Provider value={{ spawnText }}>
      {children}
      {/* Overlay Container - z-50 to be above normal UI but below Modals (z-100) */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {items.map(item => (
          <div
            key={item.id}
            className={`absolute font-bold select-none animate-float-up ${item.color} ${
              item.size === 'lg' ? 'text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 
              item.size === 'sm' ? 'text-xs' : 'text-base'
            }`}
            style={{ 
                left: item.x, 
                top: item.y,
                textShadow: '1px 1px 0 #000' 
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    </FloatingTextContext.Provider>
  );
};