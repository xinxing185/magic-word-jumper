import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Level, GameScore } from '../types';
import GameBlock from './GameBlock';

interface GameViewProps {
  level: Level;
  selectedVoiceURI: string;
  onEnd: (score: GameScore) => void;
  onQuit: () => void;
}

// MediaPipe globals available from index.html scripts
declare const Pose: any;
declare const Camera: any;

type Feedback = 'correct' | 'wrong' | null;
type BlockStatus = 'correct' | 'wrong' | 'revealedCorrect' | 'none';
type ScreenPoint = { x: number; y: number; visible: boolean };

let sharedAudioCtx: AudioContext | null = null;

const HIT_COOLDOWN_MS = 1400;
const CORRECT_ADVANCE_MS = 950;
const WRONG_ADVANCE_MS = 1700;
const MIN_LANDMARK_VISIBILITY = 0.35;

const FALLBACK_LIMB_CHAINS = [
  [11, 13, 15],
  [12, 14, 16],
  [23, 25, 27],
  [24, 26, 28],
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toScreenPoint = (landmark: any, width: number, height: number): ScreenPoint => ({
  x: clamp((1 - landmark.x) * width, 0, width),
  y: clamp(landmark.y * height, 0, height),
  visible: landmark.visibility === undefined || landmark.visibility >= MIN_LANDMARK_VISIBILITY,
});

const getPoint = (landmarks: any[], index: number, width: number, height: number): ScreenPoint | null => {
  const landmark = landmarks[index];
  if (!landmark) return null;
  return toScreenPoint(landmark, width, height);
};

const drawMirroredImage = (ctx: CanvasRenderingContext2D, image: CanvasImageSource, width: number, height: number) => {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();
};

const createCanvasLayer = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawAbstractBackground = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource | undefined,
  segmentationMask: CanvasImageSource | undefined,
  width: number,
  height: number
) => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (image && segmentationMask) {
    const backgroundLayer = createCanvasLayer(width, height);
    const backgroundCtx = backgroundLayer.getContext('2d');

    if (backgroundCtx) {
      drawMirroredImage(backgroundCtx, image, width, height);
      backgroundCtx.globalCompositeOperation = 'destination-out';
      drawMirroredImage(backgroundCtx, segmentationMask, width, height);

      ctx.globalAlpha = 0.22;
      ctx.drawImage(backgroundLayer, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = 'rgba(37, 99, 235, 0.62)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const createFilledMaskLayer = (
  segmentationMask: CanvasImageSource,
  width: number,
  height: number,
  color: string,
  offsetX = 0,
  offsetY = 0
) => {
  const layer = createCanvasLayer(width, height);
  const layerCtx = layer.getContext('2d');
  if (!layerCtx) return layer;

  layerCtx.save();
  layerCtx.translate(width, 0);
  layerCtx.scale(-1, 1);
  layerCtx.drawImage(segmentationMask, offsetX, offsetY, width, height);
  layerCtx.restore();
  layerCtx.globalCompositeOperation = 'source-in';
  layerCtx.fillStyle = color;
  layerCtx.fillRect(0, 0, width, height);

  return layer;
};

const drawBodySilhouette = (ctx: CanvasRenderingContext2D, segmentationMask: CanvasImageSource, width: number, height: number) => {
  const bodyLayer = createFilledMaskLayer(segmentationMask, width, height, 'rgba(0, 0, 0, 0.6)');
  ctx.drawImage(bodyLayer, 0, 0);
};

const drawRoundedShapePath = (ctx: CanvasRenderingContext2D, points: Array<ScreenPoint | null>, lineWidth: number, color: string) => {
  const visiblePoints = points.filter((point): point is ScreenPoint => Boolean(point?.visible));
  if (visiblePoints.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
  visiblePoints.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
};

const drawFallbackBodyShape = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
  const point = (index: number) => getPoint(landmarks, index, width, height);
  const shoulderL = point(11);
  const shoulderR = point(12);
  const hipL = point(23);
  const hipR = point(24);
  const nose = point(0);
  const eyeL = point(2);
  const eyeR = point(5);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  FALLBACK_LIMB_CHAINS.forEach(chain => {
    const chainPoints = chain.map(index => point(index));
    drawRoundedShapePath(ctx, chainPoints, clamp(width * 0.065, 38, 86), 'rgba(0, 0, 0, 0.44)');
  });

  if (shoulderL?.visible && shoulderR?.visible && hipL?.visible && hipR?.visible) {
    ctx.beginPath();
    ctx.moveTo(shoulderL.x, shoulderL.y);
    ctx.lineTo(shoulderR.x, shoulderR.y);
    ctx.lineTo(hipR.x, hipR.y);
    ctx.lineTo(hipL.x, hipL.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
    ctx.fill();
  }

  if (nose?.visible && eyeL?.visible && eyeR?.visible) {
    const eyeCenterX = (eyeL.x + eyeR.x) / 2;
    const eyeCenterY = (eyeL.y + eyeR.y) / 2;
    const eyeDistance = Math.hypot(eyeL.x - eyeR.x, eyeL.y - eyeR.y);
    const headRadius = clamp(eyeDistance * 1.8, 28, 86);
    const headY = eyeCenterY - headRadius * 0.18;

    ctx.beginPath();
    ctx.arc(eyeCenterX, headY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(nose.x, nose.y, clamp(width * 0.011, 7, 16), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
  }

  ctx.restore();
};

const GameView: React.FC<GameViewProps> = ({ level, selectedVoiceURI, onEnd, onQuit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
  const [revealedCorrectIdx, setRevealedCorrectIdx] = useState<number | null>(null);
  const [isPoseDetected, setIsPoseDetected] = useState(false);

  const scoreRef = useRef({ correct: 0, wrong: 0 });
  const poseInstance = useRef<any>(null);
  const cameraInstance = useRef<any>(null);
  const lastHitTime = useRef(0);
  const isResolvingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const gameStateRef = useRef({ isGameStarted: false, feedback: null as Feedback });
  const selectAnswerRef = useRef<(index: number) => void>(() => {});
  const handleStartGameRef = useRef<() => void>(() => {});

  const question = level.questions[currentQuestionIdx];

  const blockGap = clamp(dimensions.width * 0.03, 12, 76);
  const availableWidth = Math.max(260, dimensions.width - 32);
  const desiredBlockWidth = clamp(dimensions.width * 0.24, 150, 320);
  const maxBlockWidth = Math.max(84, (availableWidth - blockGap * 2) / 3);
  const blockWidth = Math.min(desiredBlockWidth, maxBlockWidth);
  const blockHeight = clamp(blockWidth * 0.72, 96, 230);
  const blocksY = clamp(dimensions.height * 0.18, 110, 220);
  const totalBlocksWidth = blockWidth * 3 + blockGap * 2;
  const blockStartX = (dimensions.width - totalBlocksWidth) / 2;
  const startButtonW = Math.min(clamp(dimensions.width * 0.34, 280, 520), Math.max(240, dimensions.width - 48));
  const startButtonH = clamp(startButtonW * 0.32, 96, 170);
  const startButtonTop = clamp(dimensions.height * 0.09, 62, 110);

  const queueTimer = useCallback((callback: () => void, delay: number) => {
    const timerId = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter(id => id !== timerId);
      callback();
    }, delay);
    timersRef.current.push(timerId);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    gameStateRef.current = { isGameStarted, feedback };
  }, [isGameStarted, feedback]);

  const playSound = useCallback((type: 'correct' | 'wrong' | 'pop') => {
    try {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }

      const ctx = sharedAudioCtx;
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
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio Context failed', e);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
      }
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech Synthesis failed', err);
    }
  }, [selectedVoiceURI]);

  useEffect(() => {
    if (!isLoading && isGameStarted && question && feedback === null) {
      const timer = window.setTimeout(() => speak(question.correctWord), 500);
      return () => window.clearTimeout(timer);
    }
  }, [currentQuestionIdx, isLoading, isGameStarted, question, feedback, speak]);

  const handleStartGame = useCallback(() => {
    if (gameStateRef.current.isGameStarted) return;
    playSound('pop');
    setIsGameStarted(true);
    lastHitTime.current = Date.now();
  }, [playSound]);

  useEffect(() => {
    handleStartGameRef.current = handleStartGame;
  }, [handleStartGame]);

  const selectAnswer = useCallback((optionIndex: number) => {
    if (!question || feedback !== null || isResolvingRef.current) return;

    const selectedOption = question.options[optionIndex];
    if (!selectedOption) return;

    isResolvingRef.current = true;
    lastHitTime.current = Date.now();

    const correctIndex = question.options.findIndex(opt => opt.word === question.correctWord);
    const isCorrect = selectedOption.word === question.correctWord;
    const nextScore = isCorrect
      ? { ...scoreRef.current, correct: scoreRef.current.correct + 1 }
      : { ...scoreRef.current, wrong: scoreRef.current.wrong + 1 };

    scoreRef.current = nextScore;
    setScore(nextScore);
    setSelectedBlockIdx(optionIndex);
    setRevealedCorrectIdx(correctIndex);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    playSound(isCorrect ? 'correct' : 'wrong');

    if (!isCorrect) {
      queueTimer(() => speak(question.correctWord), 350);
    }

    queueTimer(() => {
      const nextIdx = currentQuestionIdx + 1;
      if (nextIdx < level.questions.length) {
        setCurrentQuestionIdx(nextIdx);
        setFeedback(null);
        setSelectedBlockIdx(null);
        setRevealedCorrectIdx(null);
        isResolvingRef.current = false;
        lastHitTime.current = Date.now();
      } else {
        onEnd({
          correct: scoreRef.current.correct,
          wrong: scoreRef.current.wrong,
          total: level.questions.length
        });
      }
    }, isCorrect ? CORRECT_ADVANCE_MS : WRONG_ADVANCE_MS);
  }, [currentQuestionIdx, feedback, level.questions.length, onEnd, playSound, question, queueTimer, speak]);

  useEffect(() => {
    selectAnswerRef.current = selectAnswer;
  }, [selectAnswer]);

  const getBlockStatus = (idx: number): BlockStatus => {
    if (feedback === null) return 'none';
    if (idx === selectedBlockIdx) return feedback === 'correct' ? 'correct' : 'wrong';
    if (feedback === 'wrong' && idx === revealedCorrectIdx) return 'revealedCorrect';
    return 'none';
  };

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !results) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;

    drawAbstractBackground(ctx, results.image, results.segmentationMask, width, height);

    const now = Date.now();
    let fx = -100;
    let fy = -100;
    let pointerDetected = false;

    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      const landmarks = results.poseLandmarks;
      const nose = landmarks[0];
      const leftEye = landmarks[2];
      const rightEye = landmarks[5];

      if (nose && leftEye && rightEye) {
        const eyesY = ((leftEye.y + rightEye.y) / 2) * height;
        const eyesX = ((1 - leftEye.x) + (1 - rightEye.x)) / 2 * width;
        const noseY = nose.y * height;
        const faceHeight = Math.abs(noseY - eyesY);

        fx = clamp(eyesX, 0, width);
        fy = clamp(eyesY - faceHeight * 1.5, 0, height);
        pointerDetected = true;
      }
    }

    setIsPoseDetected(pointerDetected);

    if (pointerDetected && results.poseLandmarks) {
      if (results.segmentationMask) {
        drawBodySilhouette(ctx, results.segmentationMask, width, height);
      } else {
        drawFallbackBodyShape(ctx, results.poseLandmarks, width, height);
      }
    }

    if (!gameStateRef.current.isGameStarted) {
      const startX = width / 2 - startButtonW / 2;
      const startY = startButtonTop;
      const isOnStart = fx > startX && fx < startX + startButtonW && fy > startY && fy < startY + startButtonH;

      if (pointerDetected && isOnStart && now - lastHitTime.current > HIT_COOLDOWN_MS) {
        handleStartGameRef.current();
      }
    } else if (pointerDetected && gameStateRef.current.feedback === null && !isResolvingRef.current) {
      if (now - lastHitTime.current > HIT_COOLDOWN_MS) {
        for (let idx = 0; idx < 3; idx++) {
          const bX = blockStartX + idx * (blockWidth + blockGap);
          const bY = blocksY;
          const isOnBlock = fx > bX && fx < bX + blockWidth && fy > bY && fy < bY + blockHeight + 24;

          if (isOnBlock) {
            selectAnswerRef.current(idx);
            break;
          }
        }
      }
    }

    if (pointerDetected) {
      ctx.save();
      const cursorSize = clamp(width * 0.08, 56, 132);
      ctx.font = `${cursorSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.fillText('🍄', fx, fy);
      ctx.restore();
    }
  }, [blockGap, blockHeight, blockStartX, blockWidth, blocksY, dimensions, startButtonH, startButtonTop, startButtonW]);

  useEffect(() => {
    let active = true;
    const startMediaPipe = async () => {
      try {
        if (typeof Pose === 'undefined' || typeof Camera === 'undefined') {
          console.error('MediaPipe scripts not loaded yet');
          return;
        }

        const pose = new Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: true,
          smoothSegmentation: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((res: any) => {
          if (active) onResults(res);
        });

        poseInstance.current = pose;

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (active && videoRef.current && poseInstance.current && videoRef.current.readyState >= 2) {
                await poseInstance.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          cameraInstance.current = camera;
          await camera.start();
          if (active) setIsLoading(false);
        }
      } catch (err) {
        console.error('Camera/Pose initialization failed', err);
        if (active) setIsLoading(false);
      }
    };

    startMediaPipe();

    return () => {
      active = false;
      timersRef.current.forEach(timerId => window.clearTimeout(timerId));
      timersRef.current = [];
      if (cameraInstance.current) cameraInstance.current.stop();
      if (poseInstance.current) poseInstance.current.close();
      window.speechSynthesis.cancel();
    };
  }, [onResults]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 font-['Fredoka'] overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-cyan-200 z-[100] flex flex-col items-center justify-center p-10 text-center">
          <div className="text-8xl md:text-9xl animate-bounce mb-8">🪄</div>
          <h2 className="text-4xl md:text-6xl font-black text-pink-600 mb-5">Waking up the magic...</h2>
          <p className="text-2xl md:text-3xl text-gray-600 max-w-2xl leading-snug">Please allow camera access!</p>
        </div>
      )}

      <div className="relative w-full h-full bg-gray-900 overflow-hidden">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="w-full h-full object-cover" />

        <div className="absolute top-6 left-6 z-30 flex flex-wrap gap-5">
          <div className="bg-white/95 px-7 py-4 rounded-2xl pixel-border text-2xl md:text-3xl font-black shadow-lg">Stars: {score.correct}</div>
          {isGameStarted && (
            <div className="bg-white/95 px-7 py-4 rounded-2xl pixel-border text-2xl md:text-3xl font-black shadow-lg">
              {currentQuestionIdx + 1}/{level.questions.length}
            </div>
          )}
        </div>

        <button onClick={onQuit} className="absolute top-6 right-6 z-30 bg-red-500 text-white px-7 py-4 rounded-2xl pixel-border text-xl md:text-2xl font-black hover:bg-red-600 active:scale-95 transition-all shadow-lg">
          QUIT
        </button>

        {!isGameStarted && !isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            <button
              onClick={handleStartGame}
              className={`absolute left-1/2 -translate-x-1/2 pixel-border pointer-events-auto transition-all duration-200 active:translate-y-1 ${isPoseDetected ? 'bg-green-500 hover:bg-green-400' : 'bg-sky-500 hover:bg-sky-400'} text-white font-black shadow-2xl`}
              style={{
                top: `${startButtonTop}px`,
                width: `${startButtonW}px`,
                height: `${startButtonH}px`,
                fontSize: `${clamp(startButtonH * 0.38, 32, 60)}px`,
                borderRadius: '16px'
              }}
            >
              START
              <div className="absolute inset-0 border-t-4 border-white/30 rounded-xl" />
            </button>
            <div className="absolute bottom-12 md:bottom-20 left-1/2 -translate-x-1/2 z-30 bg-white/95 p-8 md:p-10 rounded-3xl pixel-border text-center max-w-2xl shadow-2xl pointer-events-none">
              {isPoseDetected ? (
                <>
                  <h3 className="text-4xl md:text-5xl font-black text-green-600 mb-3">I see you!</h3>
                  <p className="text-2xl md:text-3xl text-gray-700 leading-tight">Hit <span className="text-green-600 font-black">START</span> with your head, or tap it.</p>
                </>
              ) : (
                <>
                  <h3 className="text-4xl md:text-5xl font-black text-orange-600 mb-3">Ready?</h3>
                  <p className="text-2xl md:text-3xl text-gray-700 leading-tight">Stand back, or tap <span className="text-sky-600 font-black">START</span>.</p>
                </>
              )}
            </div>
          </div>
        )}

        {isGameStarted && !isLoading && question && (
          <>
            <button onClick={() => speak(question.correctWord)} className="absolute bottom-10 md:bottom-14 left-1/2 -translate-x-1/2 z-30 bg-pink-500 text-white px-12 py-7 rounded-[2.5rem] pixel-border animate-bounce shadow-2xl hover:bg-pink-400 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[260px] md:min-w-[330px]">
              <div className="text-base md:text-xl font-black mb-1 opacity-90">Listen</div>
              <div className="flex items-center gap-4">
                <span className="text-5xl md:text-6xl">🔊</span>
                <span className="text-4xl md:text-5xl font-black">PLAY</span>
              </div>
              <div className="absolute inset-0 border-t-4 border-white/30 rounded-[2.5rem] pointer-events-none" />
            </button>
            <div className="absolute inset-0 pointer-events-none">
              {question.options.map((opt, idx) => (
                <GameBlock
                  key={idx + currentQuestionIdx}
                  option={opt}
                  x={blockStartX + idx * (blockWidth + blockGap)}
                  y={blocksY}
                  width={blockWidth}
                  height={blockHeight}
                  isHit={selectedBlockIdx === idx}
                  status={getBlockStatus(idx)}
                  onSelect={() => selectAnswer(idx)}
                  disabled={feedback !== null}
                />
              ))}
            </div>
          </>
        )}

        {feedback && question && (
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 text-center px-12 md:px-20 py-8 md:py-12 rounded-[2.5rem] pixel-border shadow-2xl ${feedback === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <div className="text-5xl md:text-7xl font-black">
              {feedback === 'correct' ? 'YEAH!' : `LOOK! ${question.correctWord}`}
            </div>
            <div className="mt-4 text-2xl md:text-4xl font-black opacity-90">
              {feedback === 'correct' ? 'Great jump!' : 'Green block is right!'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameView;
