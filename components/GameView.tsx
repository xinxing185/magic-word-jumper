
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Level, GameScore, Question } from '../types';
import GameBlock from './GameBlock';

interface GameViewProps {
  level: Level;
  selectedVoiceURI: string;
  onEnd: (score: GameScore) => void;
  onQuit: () => void;
}

// MediaPipe globals
declare const Pose: any;
declare const Camera: any;

const GameView: React.FC<GameViewProps> = ({ level, selectedVoiceURI, onEnd, onQuit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [hitBlockIdx, setHitBlockIdx] = useState<number | null>(null);
  const [isPoseDetected, setIsPoseDetected] = useState(false);

  const scoreRef = useRef({ correct: 0, wrong: 0 });
  const poseInstance = useRef<any>(null);
  const cameraInstance = useRef<any>(null);
  const foreheadPos = useRef({ x: -100, y: -100 });
  
  const question = level.questions[currentQuestionIdx];
  
  // Dynamic sizing
  const blockWidth = Math.min(dimensions.width * 0.22, 200);
  const blockHeight = blockWidth * 0.7;
  const blocksY = dimensions.height * 0.2;

  // Collision state to prevent double trigger
  const lastHitTime = useRef(0);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const playSound = (type: 'correct' | 'wrong' | 'pop') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct' || type === 'pop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(type === 'correct' ? 440 : 660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(type === 'correct' ? 880 : 1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  const speak = useCallback((text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoiceURI]);

  // Auto-play word when question changes or game starts
  useEffect(() => {
    if (!isLoading && isGameStarted && question) {
      const timer = setTimeout(() => speak(question.correctWord), 500);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIdx, isLoading, isGameStarted, question, speak]);

  const handleNextQuestion = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      scoreRef.current.correct++;
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      scoreRef.current.wrong++;
      setScore(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    if (currentQuestionIdx < level.questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIdx(prev => prev + 1);
        setFeedback(null);
        setHitBlockIdx(null);
      }, 1000);
    } else {
      setTimeout(() => {
        onEnd({
          correct: scoreRef.current.correct,
          wrong: scoreRef.current.wrong,
          total: level.questions.length
        });
      }, 1000);
    }
  }, [currentQuestionIdx, level.questions.length, onEnd]);

  const handleStartGame = () => {
    if (isGameStarted) return;
    playSound('pop');
    setIsGameStarted(true);
    lastHitTime.current = Date.now();
  };

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;

    // 1. Base Layer: Mirrored Camera
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, width, height);
    ctx.restore();

    // 2. Overlay Layer: Blue Mask
    ctx.save();
    ctx.fillStyle = 'rgba(92, 148, 252, 0.4)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const now = Date.now();
    let fx = -100;
    let fy = -100;

    // 3. Pose Processing
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      setIsPoseDetected(true);
      const landmarks = results.poseLandmarks;
      const nose = landmarks[0];
      const leftEye = landmarks[2];
      const rightEye = landmarks[5];

      const noseX_px = (1 - nose.x) * width;
      const noseY_px = nose.y * height;
      const eyesY_px = ((leftEye.y + rightEye.y) / 2) * height;
      const eyesX_px = ((1 - leftEye.x) + (1 - rightEye.x)) / 2 * width;
      
      const faceHeight = Math.abs(noseY_px - eyesY_px);
      fx = eyesX_px;
      fy = eyesY_px - (faceHeight * 1.5);
      foreheadPos.current = { x: fx, y: fy };
    } else {
      setIsPoseDetected(false);
      foreheadPos.current = { x: -100, y: -100 };
    }

    // 4. Game Logic (Head Hit Detection)
    if (!isGameStarted) {
      // Automatic start if head hits the button area
      const startW = Math.min(width * 0.4, 300);
      const startH = startW * 0.35;
      const startX = width / 2 - startW / 2;
      const startY = 80;

      if (isPoseDetected && fx > startX && fx < startX + startW && 
          fy > startY && fy < startY + startH) {
        if (now - lastHitTime.current > 1500) {
          handleStartGame();
        }
      }
    } else if (question) {
      const totalBlocksWidth = (blockWidth * 3) + (dimensions.width * 0.05 * 2);
      const startX = (dimensions.width - totalBlocksWidth) / 2 + (dimensions.width * 0.05);
      const blockMargin = dimensions.width * 0.05;

      question.options.forEach((opt, idx) => {
        const bX = startX + idx * (blockWidth + blockMargin);
        const bY = blocksY;
        
        if (feedback === null && now - lastHitTime.current > 1500) {
          if (fx > bX && fx < bX + blockWidth && 
              fy > bY && fy < bY + blockHeight + 10) {
            lastHitTime.current = now;
            setHitBlockIdx(idx);
            const isCorrect = opt.word === question.correctWord;
            setFeedback(isCorrect ? 'correct' : 'wrong');
            playSound(isCorrect ? 'correct' : 'wrong');
            handleNextQuestion(isCorrect);
          }
        }
      });
    }

    // 5. Cursor Layer
    if (isPoseDetected) {
      ctx.save();
      const cursorSize = Math.max(48, width * 0.08);
      ctx.font = `${cursorSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillText('🍄', fx, fy);
      ctx.restore();
    }

  }, [feedback, handleNextQuestion, question, isGameStarted, isLoading, isPoseDetected, dimensions, blockWidth, blockHeight, blocksY]);

  useEffect(() => {
    if (typeof Pose === 'undefined') return;

    let isMounted = true;

    const setupPose = async () => {
      poseInstance.current = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      poseInstance.current.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseInstance.current.onResults((results: any) => {
        if (isMounted) onResults(results);
      });

      if (videoRef.current) {
        cameraInstance.current = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseInstance.current && isMounted) {
              await poseInstance.current.send({ image: videoRef.current! });
            }
          },
          width: 640,
          height: 480,
        });

        await cameraInstance.current.start();
        if (isMounted) setIsLoading(false);
      }
    };

    setupPose();

    return () => {
      isMounted = false;
      if (cameraInstance.current) cameraInstance.current.stop();
      if (poseInstance.current) poseInstance.current.close();
      window.speechSynthesis.cancel();
    };
  }, [onResults]);

  // Derived style for the Start Button to match canvas coordinates
  const startButtonW = Math.min(dimensions.width * 0.4, 300);
  const startButtonH = startButtonW * 0.35;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 font-['Fredoka'] overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-cyan-200 z-[100] flex flex-col items-center justify-center p-10 text-center">
          <div className="text-8xl animate-bounce mb-8">🪄</div>
          <h2 className="text-4xl font-bold text-pink-600 mb-4">Waking up the magic...</h2>
          <p className="text-xl text-gray-500 max-w-xs leading-loose">
            Please allow camera access!
          </p>
        </div>
      )}

      <div className="relative w-full h-full bg-gray-900 overflow-hidden">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas 
          ref={canvasRef} 
          width={dimensions.width} 
          height={dimensions.height} 
          className="w-full h-full object-cover" 
        />

        {/* HUD */}
        <div className="absolute top-6 left-6 z-30 flex gap-4">
           <div className="bg-white/90 px-6 py-3 rounded-2xl pixel-border text-lg font-bold shadow-lg">
             Stars: {score.correct}
           </div>
           {isGameStarted && (
             <div className="bg-white/90 px-6 py-3 rounded-2xl pixel-border text-lg font-bold shadow-lg">
               {currentQuestionIdx + 1}/{level.questions.length}
             </div>
           )}
        </div>

        <button 
          onClick={onQuit}
          className="absolute top-6 right-6 z-30 bg-red-500 text-white px-6 py-3 rounded-2xl pixel-border text-lg font-bold hover:bg-red-600 active:scale-95 transition-all shadow-lg"
        >
          QUIT
        </button>

        {/* REAL START BUTTON - Clickable fallback */}
        {!isGameStarted && !isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            <button
              onClick={handleStartGame}
              className={`
                absolute left-1/2 -translate-x-1/2 pixel-border pointer-events-auto
                transition-all duration-200 active:translate-y-1
                ${isPoseDetected ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-400 opacity-80 cursor-pointer'}
                text-white font-bold shadow-2xl
              `}
              style={{
                top: '80px',
                width: `${startButtonW}px`,
                height: `${startButtonH}px`,
                fontSize: `${Math.max(18, startButtonH * 0.35)}px`,
                borderRadius: '12px'
              }}
            >
              {isPoseDetected ? 'START' : 'FORCE START'}
              <div className="absolute inset-0 border-t-4 border-white/30 rounded-lg" />
            </button>

            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-white/90 p-8 rounded-3xl pixel-border text-center max-w-md shadow-2xl pointer-events-none">
              {isPoseDetected ? (
                <>
                  <h3 className="text-3xl font-bold text-green-600 mb-2">I see you!</h3>
                  <p className="text-xl text-gray-600">Now hit <span className="text-green-600 font-bold">START</span> with your <span className="text-green-600 font-bold">Mushroom head</span> or just click it!</p>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-orange-600 mb-2">Can't see you yet...</h3>
                  <p className="text-xl text-gray-600 leading-relaxed">Try to stand back, or click the button above to start anyway!</p>
                </>
              )}
            </div>
          </div>
        )}

        {isGameStarted && !isLoading && question && (
          <>
            <button
              onClick={() => speak(question.correctWord)}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-pink-500 text-white px-10 py-6 rounded-[2.5rem] pixel-border animate-bounce shadow-2xl hover:bg-pink-400 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[200px]"
            >
              <div className="text-sm font-black mb-1 opacity-90 tracking-widest">Listen:</div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">🔊</span>
                <span className="text-3xl font-black">PLAY</span>
              </div>
              <div className="absolute inset-0 border-t-4 border-white/30 rounded-[2.5rem] pointer-events-none" />
            </button>

            <div className="absolute inset-0 pointer-events-none">
              {question.options.map((opt, idx) => {
                const totalBlocksWidth = (blockWidth * 3) + (dimensions.width * 0.05 * 2);
                const startX = (dimensions.width - totalBlocksWidth) / 2 + (dimensions.width * 0.05);
                const blockMargin = dimensions.width * 0.05;
                const x = startX + idx * (blockWidth + blockMargin);
                
                return (
                  <GameBlock
                    key={idx + currentQuestionIdx}
                    option={opt}
                    x={x}
                    y={blocksY}
                    width={blockWidth}
                    height={blockHeight}
                    isHit={hitBlockIdx === idx}
                    status={hitBlockIdx === idx ? feedback || 'none' : 'none'}
                  />
                );
              })}
            </div>
          </>
        )}

        {feedback && (
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 text-6xl font-black px-16 py-10 rounded-[2.5rem] pixel-border shadow-2xl ${feedback === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
             {feedback === 'correct' ? 'YEAH! 🎉' : 'TRY AGAIN! 😮'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameView;
