
import React from 'react';
import { WordOption } from '../types';

interface GameBlockProps {
  option: WordOption;
  x: number;
  y: number;
  width: number;
  height: number;
  isHit: boolean;
  status: 'correct' | 'wrong' | 'none';
}

const GameBlock: React.FC<GameBlockProps> = ({ option, x, y, width, height, isHit, status }) => {
  const getBgColor = () => {
    if (status === 'correct') return 'bg-green-500';
    if (status === 'wrong') return 'bg-red-500';
    return 'bg-yellow-400';
  };

  return (
    <div
      className={`absolute pixel-border flex flex-col items-center justify-center transition-transform duration-100 ${getBgColor()} ${isHit ? 'scale-110' : 'scale-100'} rounded-2xl`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 20
      }}
    >
      <span className="text-5xl mb-2">{option.image}</span>
      <span className="text-lg text-black font-black text-center px-2 break-words uppercase tracking-tighter">{option.word}</span>
      <div className="absolute inset-0 border-t-8 border-white/40 pointer-events-none rounded-2xl" />
      <div className="absolute inset-0 border-b-8 border-black/20 pointer-events-none rounded-2xl" />
    </div>
  );
};

export default GameBlock;
