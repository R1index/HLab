import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src: string;
  alt: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);

  // Reset error if src changes (important for re-using components in lists/gacha)
  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 border border-slate-700 overflow-hidden relative ${className}`}>
         {/* Sci-fi grid background for placeholder */}
         <div className="absolute inset-0 opacity-20" 
              style={{ 
                  backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent)',
                  backgroundSize: '20px 20px'
              }} 
         />
         <User className="w-1/2 h-1/2 text-cyan-500/50 z-10" />
         <div className="absolute bottom-1 right-1 text-[8px] font-mono text-cyan-800 uppercase">NO SIGNAL</div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};