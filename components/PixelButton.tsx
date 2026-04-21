
import React from 'react';

interface PixelButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  className?: string;
  disabled?: boolean;
}

const PixelButton: React.FC<PixelButtonProps> = ({ onClick, children, color = 'bg-pink-500', className = '', disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative px-6 py-3 text-white transition-all active:translate-y-1
        pixel-border ${color} ${className}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}
      `}
      style={{ lineHeight: '1.5' }}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
      {/* Pixel shading effect */}
      <div className="absolute inset-0 border-b-4 border-black/20 pointer-events-none" />
    </button>
  );
};

export default PixelButton;
