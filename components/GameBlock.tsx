
import React from 'react';
import { WordOption } from '../types';

interface GameBlockProps {
  option: WordOption;
  x: number;
  y: number;
  width: number;
  height: number;
  isHit: boolean;
  status: 'correct' | 'wrong' | 'revealedCorrect' | 'none';
  onSelect: () => void;
  disabled: boolean;
}

const GameBlock: React.FC<GameBlockProps> = ({ option, x, y, width, height, isHit, status, onSelect, disabled }) => {
  const getBgColor = () => {
    if (status === 'correct') return 'bg-green-500';
    if (status === 'revealedCorrect') return 'bg-emerald-400';
    if (status === 'wrong') return 'bg-red-500';
    return 'bg-yellow-400';
  };

  const wordSize = Math.max(18, Math.min(width * 0.16, 42));
  const imageSize = Math.max(42, Math.min(width * 0.28, 78));

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={`Choose ${option.word}`}
      className={`absolute pixel-border pointer-events-auto flex flex-col items-center justify-center transition-transform duration-150 ${getBgColor()} ${isHit ? 'scale-110' : 'scale-100'} rounded-2xl shadow-2xl active:translate-y-1 disabled:cursor-default`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 20
      }}
    >
      <span className="mb-2 leading-none" style={{ fontSize: `${imageSize}px` }}>{option.image}</span>
      <span className="text-black font-black text-center px-3 break-words uppercase" style={{ fontSize: `${wordSize}px`, lineHeight: 1.05 }}>
        {option.word}
      </span>
      <div className="absolute inset-0 border-t-8 border-white/40 pointer-events-none rounded-2xl" />
      <div className="absolute inset-0 border-b-8 border-black/20 pointer-events-none rounded-2xl" />
    </button>
  );
};

export default GameBlock;
