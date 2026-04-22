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
const WRONG_FEEDBACK_MS = 1600;
const QUESTION_CARD_ENTER_MS = 1050;
const CONFETTI_MS = 1800;
const NEXT_QUESTION_COUNTDOWN_SECONDS = 3;
const MIN_LANDMARK_VISIBILITY = 0.35;
// Dev switch: set this to true to let body/head pose trigger game actions again.
// Camera, abstract background, and body silhouette stay enabled either way.
const BODY_INTERACTION_ENABLED = false;
const CORRECT_CUES = ['Great job!', 'Excellent!', 'Amazing!'];
const CONFETTI_PIECES = [
  { left: 8, color: '#fde047', delay: 0, rotate: -12 },
  { left: 16, color: '#fb7185', delay: 90, rotate: 18 },
  { left: 25, color: '#60a5fa', delay: 40, rotate: 8 },
  { left: 34, color: '#34d399', delay: 130, rotate: -22 },
  { left: 44, color: '#f97316', delay: 20, rotate: 28 },
  { left: 55, color: '#a78bfa', delay: 100, rotate: -18 },
  { left: 65, color: '#22d3ee', delay: 60, rotate: 14 },
  { left: 75, color: '#facc15', delay: 150, rotate: -8 },
  { left: 85, color: '#f472b6', delay: 35, rotate: 24 },
  { left: 93, color: '#4ade80', delay: 115, rotate: -26 },
] as const;

const applySelectedVoice = (utterance: SpeechSynthesisUtterance, selectedVoiceURI: string) => {
  if (!selectedVoiceURI) {
    utterance.lang = 'en-US';
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'en-US';
    return;
  }

  utterance.lang = 'en-US';
};

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
  const [wrongBlockIdxs, setWrongBlockIdxs] = useState<number[]>([]);
  const [canAnswer, setCanAnswer] = useState(false);
  const [isQuestionEntering, setIsQuestionEntering] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [correctCountdown, setCorrectCountdown] = useState<number | null>(null);
  const [isPoseDetected, setIsPoseDetected] = useState(false);

  const scoreRef = useRef({ correct: 0, wrong: 0 });
  const poseInstance = useRef<any>(null);
  const cameraInstance = useRef<any>(null);
  const lastHitTime = useRef(0);
  const hasWrongAttemptRef = useRef(false);
  const isResolvingRef = useRef(false);
  const questionFlowRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const gameStateRef = useRef({ isGameStarted: false, feedback: null as Feedback, canAnswer: false });
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
    gameStateRef.current = { isGameStarted, feedback, canAnswer };
  }, [isGameStarted, feedback, canAnswer]);

  const playSound = useCallback(async (type: 'correct' | 'wrong') => {
    try {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (sharedAudioCtx.state === 'suspended') {
        await sharedAudioCtx.resume();
      }

      const ctx = sharedAudioCtx;
      const now = ctx.currentTime + 0.01;

      if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        const playBellTone = (frequency: number, startTime: number, volume: number) => {
          const bellOsc = ctx.createOscillator();
          const bellGain = ctx.createGain();
          bellOsc.connect(bellGain);
          bellGain.connect(ctx.destination);
          bellOsc.type = 'sine';
          bellOsc.frequency.setValueAtTime(frequency, startTime);
          bellOsc.frequency.exponentialRampToValueAtTime(frequency * 0.985, startTime + 0.28);
          bellGain.gain.setValueAtTime(0.0001, startTime);
          bellGain.gain.linearRampToValueAtTime(volume, startTime + 0.018);
          bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
          bellOsc.start(startTime);
          bellOsc.stop(startTime + 0.32);
        };

        playBellTone(880, now, 0.15);
        playBellTone(660, now + 0.22, 0.13);
      }
    } catch (e) {
      console.warn('Audio Context failed', e);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return Promise.resolve();
    return new Promise<void>(resolve => {
      let isSettled = false;
      const finish = () => {
        if (isSettled) return;
        isSettled = true;
        window.clearTimeout(fallbackTimer);
        resolve();
      };
      const fallbackTimer = window.setTimeout(finish, Math.max(1200, text.length * 220));

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        applySelectedVoice(utterance, selectedVoiceURI);
        utterance.rate = 0.85;
        utterance.pitch = 1.1;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech Synthesis failed', err);
        finish();
      }
    });
  }, [selectedVoiceURI]);

  const playCorrectCue = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
      const cue = CORRECT_CUES[Math.floor(Math.random() * CORRECT_CUES.length)];
      const utterance = new SpeechSynthesisUtterance(cue);
      applySelectedVoice(utterance, selectedVoiceURI);
      utterance.rate = 0.98;
      utterance.pitch = 1.35;
      utterance.volume = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Correct cue speech failed', err);
      playSound('correct');
    }
  }, [playSound, selectedVoiceURI]);

  useEffect(() => {
    if (isLoading || !isGameStarted || !question) return;

    const flowId = questionFlowRef.current + 1;
    questionFlowRef.current = flowId;
    setCanAnswer(false);
    setIsQuestionEntering(true);
    setFeedback(null);
    setSelectedBlockIdx(null);
    setWrongBlockIdxs([]);
    setShowConfetti(false);
    setCorrectCountdown(null);
    hasWrongAttemptRef.current = false;
    isResolvingRef.current = false;

    const timer = window.setTimeout(async () => {
      if (questionFlowRef.current !== flowId) return;
      setIsQuestionEntering(false);
      await speak(question.correctWord);
      if (questionFlowRef.current !== flowId || isResolvingRef.current) return;
      setCanAnswer(true);
      lastHitTime.current = Date.now();
    }, QUESTION_CARD_ENTER_MS);

    return () => window.clearTimeout(timer);
  }, [currentQuestionIdx, isLoading, isGameStarted, question, speak]);

  const handleStartGame = useCallback(() => {
    if (gameStateRef.current.isGameStarted) return;
    setIsGameStarted(true);
    lastHitTime.current = Date.now();
  }, []);

  useEffect(() => {
    handleStartGameRef.current = handleStartGame;
  }, [handleStartGame]);

  const selectAnswer = useCallback((optionIndex: number) => {
    if (!question || !canAnswer || feedback === 'correct' || isResolvingRef.current) return;

    const selectedOption = question.options[optionIndex];
    if (!selectedOption) return;

    lastHitTime.current = Date.now();

    const isCorrect = selectedOption.word === question.correctWord;
    setSelectedBlockIdx(optionIndex);

    if (!isCorrect) {
      if (!hasWrongAttemptRef.current) {
        hasWrongAttemptRef.current = true;
        const nextScore = { ...scoreRef.current, wrong: scoreRef.current.wrong + 1 };
        scoreRef.current = nextScore;
        setScore(nextScore);
      }

      setWrongBlockIdxs(prev => prev.includes(optionIndex) ? prev : [...prev, optionIndex]);
      setCanAnswer(false);
      setFeedback('wrong');
      playSound('wrong');
      queueTimer(() => {
        if (!isResolvingRef.current) {
          setFeedback(currentFeedback => currentFeedback === 'wrong' ? null : currentFeedback);
          setSelectedBlockIdx(null);
          setCanAnswer(true);
          lastHitTime.current = Date.now();
        }
      }, WRONG_FEEDBACK_MS);
      return;
    }

    isResolvingRef.current = true;
    setCanAnswer(false);
    if (!hasWrongAttemptRef.current) {
      const nextScore = { ...scoreRef.current, correct: scoreRef.current.correct + 1 };
      scoreRef.current = nextScore;
      setScore(nextScore);
    }

    setFeedback('correct');
    setShowConfetti(true);
    setCorrectCountdown(null);
    playCorrectCue();

    queueTimer(() => {
      setShowConfetti(false);
      setCorrectCountdown(NEXT_QUESTION_COUNTDOWN_SECONDS);

      for (let remaining = NEXT_QUESTION_COUNTDOWN_SECONDS - 1; remaining >= 1; remaining--) {
        queueTimer(() => setCorrectCountdown(remaining), (NEXT_QUESTION_COUNTDOWN_SECONDS - remaining) * 1000);
      }

      queueTimer(() => {
        const nextIdx = currentQuestionIdx + 1;
        if (nextIdx < level.questions.length) {
          setCurrentQuestionIdx(nextIdx);
          setFeedback(null);
          setSelectedBlockIdx(null);
          setWrongBlockIdxs([]);
          setShowConfetti(false);
          setCorrectCountdown(null);
          hasWrongAttemptRef.current = false;
          isResolvingRef.current = false;
          lastHitTime.current = Date.now();
        } else {
          onEnd({
            correct: scoreRef.current.correct,
            wrong: scoreRef.current.wrong,
            total: level.questions.length
          });
        }
      }, NEXT_QUESTION_COUNTDOWN_SECONDS * 1000);
    }, CONFETTI_MS);
  }, [canAnswer, currentQuestionIdx, feedback, level.questions.length, onEnd, playCorrectCue, playSound, question, queueTimer]);

  useEffect(() => {
    selectAnswerRef.current = selectAnswer;
  }, [selectAnswer]);

  const getBlockStatus = (idx: number): BlockStatus => {
    if (feedback === 'correct' && idx === selectedBlockIdx) return 'correct';
    if (wrongBlockIdxs.includes(idx)) return 'wrong';
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

      if (BODY_INTERACTION_ENABLED && pointerDetected && isOnStart && now - lastHitTime.current > HIT_COOLDOWN_MS) {
        handleStartGameRef.current();
      }
    } else if (BODY_INTERACTION_ENABLED && pointerDetected && gameStateRef.current.canAnswer && gameStateRef.current.feedback !== 'correct' && !isResolvingRef.current) {
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
          <h2 className="text-4xl md:text-6xl font-normal text-pink-600 mb-5">Waking up the magic...</h2>
          <p className="text-2xl md:text-3xl text-gray-600 max-w-2xl leading-snug">Please allow camera access!</p>
        </div>
      )}

      <div className="relative w-full h-full bg-gray-900 overflow-hidden">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="w-full h-full object-cover" />

        <div className="absolute top-6 left-6 z-30 flex flex-wrap gap-5">
          <div className="bg-white/95 px-7 py-4 rounded-2xl pixel-border text-2xl md:text-3xl font-normal shadow-lg">Stars: {score.correct}</div>
          {isGameStarted && (
            <div className="bg-white/95 px-7 py-4 rounded-2xl pixel-border text-2xl md:text-3xl font-normal shadow-lg">
              {currentQuestionIdx + 1}/{level.questions.length}
            </div>
          )}
        </div>

        <button onClick={onQuit} className="absolute top-6 right-6 z-30 bg-red-500 text-white px-7 py-4 rounded-2xl pixel-border text-xl md:text-2xl font-normal hover:bg-red-600 active:scale-95 transition-all shadow-lg">
          QUIT
        </button>

        {!isGameStarted && !isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            <button
              onClick={handleStartGame}
              className={`absolute left-1/2 -translate-x-1/2 pixel-border pointer-events-auto transition-all duration-200 active:translate-y-1 ${BODY_INTERACTION_ENABLED && isPoseDetected ? 'bg-green-500 hover:bg-green-400' : 'bg-sky-500 hover:bg-sky-400'} text-white font-normal shadow-2xl`}
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
              {!BODY_INTERACTION_ENABLED ? (
                <>
                  <h3 className="text-4xl md:text-5xl font-normal text-sky-600 mb-3">Ready?</h3>
                  <p className="text-2xl md:text-3xl text-gray-700 leading-tight">Click <span className="text-sky-600 font-normal">START</span>, then click the answer blocks.</p>
                </>
              ) : isPoseDetected ? (
                <>
                  <h3 className="text-4xl md:text-5xl font-normal text-green-600 mb-3">I see you!</h3>
                  <p className="text-2xl md:text-3xl text-gray-700 leading-tight">Hit <span className="text-green-600 font-normal">START</span> with your head, or tap it.</p>
                </>
              ) : (
                <>
                  <h3 className="text-4xl md:text-5xl font-normal text-orange-600 mb-3">Ready?</h3>
                  <p className="text-2xl md:text-3xl text-gray-700 leading-tight">Stand back, or tap <span className="text-sky-600 font-normal">START</span>.</p>
                </>
              )}
            </div>
          </div>
        )}

        {isGameStarted && !isLoading && question && (
          <>
            <button
              onClick={() => { void speak(question.correctWord); }}
              disabled={!canAnswer}
              className="absolute bottom-10 md:bottom-14 left-1/2 -translate-x-1/2 z-30 bg-pink-500 text-white px-12 py-7 rounded-[2.5rem] pixel-border shadow-2xl hover:bg-pink-400 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[260px] md:min-w-[330px] disabled:opacity-60 disabled:cursor-default"
            >
              <div className="text-base md:text-xl font-normal mb-1 opacity-90">Listen</div>
              <div className="flex items-center gap-4">
                <span className="text-5xl md:text-6xl">🔊</span>
                <span className="text-4xl md:text-5xl font-normal">PLAY</span>
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
                  disabled={!canAnswer || feedback === 'correct'}
                  isEntering={isQuestionEntering}
                  entryDelayMs={idx * 120}
                />
              ))}
            </div>
          </>
        )}

        {feedback && question && (
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 text-center px-12 md:px-20 py-8 md:py-12 rounded-[2.5rem] pixel-border shadow-2xl pointer-events-none overflow-hidden ${feedback === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {feedback === 'correct' && showConfetti && (
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                {CONFETTI_PIECES.map((piece, idx) => (
                  <span
                    key={idx}
                    className="confetti-piece"
                    style={{
                      left: `${piece.left}%`,
                      backgroundColor: piece.color,
                      animationDelay: `${piece.delay}ms`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="relative z-10 text-5xl md:text-7xl font-normal">
              {feedback === 'correct' ? 'YEAH!' : 'TRY AGAIN!'}
            </div>
            <div className="relative z-10 mt-4 text-2xl md:text-4xl font-normal opacity-90">
              {feedback === 'correct' ? 'Great jump!' : 'Choose another card.'}
            </div>
            {feedback === 'correct' && correctCountdown !== null && (
              <div className="relative z-10 mt-5 text-xl md:text-3xl font-normal opacity-90">
                Next question in {correctCountdown}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameView;
