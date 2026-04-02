
import React, { useState, useEffect } from 'react';
import { GameState, Level, GameScore } from './types';
import { LEVELS } from './constants';
import PixelButton from './components/PixelButton';
import GameView from './components/GameView';
import { getEncouragement } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [score, setScore] = useState<GameScore>({ correct: 0, wrong: 0, total: 0 });
  const [encouragement, setEncouragement] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Fetch available voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(englishVoices);
      if (englishVoices.length > 0 && !selectedVoiceURI) {
        const defaultVoice = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Premium')) || englishVoices[0];
        setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  const handleLevelSelect = (level: Level) => {
    setSelectedLevel(level);
    setGameState(GameState.PLAYING);
    setScore({ correct: 0, wrong: 0, total: 0 });
  };

  const handleGameEnd = async (finalScore: GameScore) => {
    setScore(finalScore);
    setGameState(GameState.SETTLEMENT);
    const msg = await getEncouragement(finalScore.correct, finalScore.total);
    setEncouragement(msg);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center overflow-hidden relative font-['Fredoka'] bg-[#a5f3fc]">
      {/* Background Decor */}
      <div className="absolute top-10 left-10 text-6xl animate-bounce opacity-40">☁️</div>
      <div className="absolute top-40 right-20 text-4xl animate-pulse opacity-40">☁️</div>
      <div className="absolute bottom-20 left-1/4 text-5xl opacity-30">🌳</div>
      <div className="absolute bottom-10 right-1/4 text-5xl opacity-30">🌻</div>

      {gameState === GameState.MENU && (
        <div className="z-10 bg-white/95 p-6 md:p-10 rounded-[3rem] pixel-border text-center max-w-5xl w-full mx-4 shadow-2xl overflow-y-auto max-h-[92vh] flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-black text-pink-600 mb-2 leading-tight drop-shadow-sm uppercase tracking-tight">
            Magic Jumper! 🌟
          </h1>
          <p className="text-xl text-gray-500 mb-6 font-bold">Pick your Word Adventure!</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 w-full max-w-4xl px-2">
            {LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => handleLevelSelect(level)}
                className="
                  group relative flex flex-col items-center justify-center 
                  bg-white p-6 rounded-[2rem] pixel-border
                  hover:bg-yellow-50 transition-all active:translate-y-2
                  border-b-[12px] border-black/10 hover:border-b-[4px]
                "
              >
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  {level.thumbnail}
                </div>
                <div className="text-center">
                  <span className="block text-xl font-black text-gray-800 uppercase tracking-tighter leading-none mb-1">
                    {level.name.replace(/Level\s/i, '')}
                  </span>
                  <span className="block text-[14px] font-normal text-white bg-violet-500 px-3 py-1 rounded-full shadow-sm">
                    {level.category}
                  </span>
                </div>
                {/* 3D Highlight */}
                <div className="absolute inset-x-4 top-2 h-1 bg-white/40 rounded-full" />
              </button>
            ))}
          </div>

          <div className="w-full max-w-md bg-pink-50 p-6 rounded-[2rem] border-4 border-pink-100 shadow-inner">
            <label className="block text-xs text-pink-400 mb-3 uppercase font-black tracking-[0.2em]">Voice Teacher:</label>
            <div className="relative">
              <select 
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full p-4 rounded-2xl border-4 border-white bg-white text-lg font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-pink-200 cursor-pointer shadow-sm appearance-none"
              >
                {availableVoices.length > 0 ? (
                  availableVoices.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name.replace('Microsoft', '').replace('Google', '').trim()}
                    </option>
                  ))
                ) : (
                  <option>Default Voice</option>
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-pink-300">▼</div>
            </div>
          </div>
        </div>
      )}

      {gameState === GameState.PLAYING && selectedLevel && (
        <GameView 
          level={selectedLevel} 
          selectedVoiceURI={selectedVoiceURI}
          onEnd={handleGameEnd} 
          onQuit={() => setGameState(GameState.MENU)}
        />
      )}

      {gameState === GameState.SETTLEMENT && (
        <div className="z-10 bg-white/95 p-12 rounded-[3rem] pixel-border text-center max-w-xl w-full mx-4 shadow-2xl relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-8xl">🏆</div>
          <h2 className="text-5xl font-black text-violet-600 mb-10 mt-4 uppercase tracking-tighter">Big Win!</h2>
          
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="p-8 bg-green-50 rounded-3xl border-4 border-green-100">
              <div className="text-sm font-black text-green-500 uppercase tracking-widest mb-1">Stars</div>
              <div className="text-6xl font-black text-green-600">{score.correct}</div>
            </div>
            <div className="p-8 bg-orange-50 rounded-3xl border-4 border-orange-100">
              <div className="text-sm font-black text-orange-400 uppercase tracking-widest mb-1">Total</div>
              <div className="text-6xl font-black text-orange-500">{score.total}</div>
            </div>
          </div>

          <div className="mb-12 p-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[2rem] italic text-2xl text-gray-700 leading-tight font-medium border-4 border-white shadow-xl">
            "{encouragement || 'Preparing your special prize...'}"
          </div>

          <PixelButton onClick={() => setGameState(GameState.MENU)} className="w-full py-8 text-2xl rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase font-black">
            GO AGAIN! 🔄
          </PixelButton>
        </div>
      )}
    </div>
  );
};

export default App;
