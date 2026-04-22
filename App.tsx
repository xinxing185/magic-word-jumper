
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Level, GameScore } from './types';
import { LEVELS } from './constants';
import PixelButton from './components/PixelButton';
import GameView from './components/GameView';
import { getEncouragement } from './services/geminiService';

const LEVEL_TONES = [
  {
    surface: 'bg-rose-50 hover:bg-rose-100',
    accent: 'bg-rose-500',
    text: 'text-rose-600',
    ring: 'group-hover:ring-rose-200',
  },
  {
    surface: 'bg-amber-50 hover:bg-amber-100',
    accent: 'bg-amber-400',
    text: 'text-amber-600',
    ring: 'group-hover:ring-amber-200',
  },
  {
    surface: 'bg-sky-50 hover:bg-sky-100',
    accent: 'bg-sky-500',
    text: 'text-sky-600',
    ring: 'group-hover:ring-sky-200',
  },
  {
    surface: 'bg-emerald-50 hover:bg-emerald-100',
    accent: 'bg-emerald-500',
    text: 'text-emerald-600',
    ring: 'group-hover:ring-emerald-200',
  },
  {
    surface: 'bg-violet-50 hover:bg-violet-100',
    accent: 'bg-violet-500',
    text: 'text-violet-600',
    ring: 'group-hover:ring-violet-200',
  },
  {
    surface: 'bg-orange-50 hover:bg-orange-100',
    accent: 'bg-orange-500',
    text: 'text-orange-600',
    ring: 'group-hover:ring-orange-200',
  },
] as const;

const TOTAL_QUESTIONS = LEVELS.reduce((total, level) => total + level.questions.length, 0);

const getLevelTitle = (level: Level) => level.name.replace(/^[^A-Za-z0-9]+/, '').trim();
const getLevelShortName = (level: Level) => getLevelTitle(level).replace(/^Level\s*/i, '');
const VOICE_PREVIEW_WORD = 'apple';

const TEACHER_VOICE_LOCALES = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IE', 'en-NZ', 'en-ZA', 'en-IN'];
const VOICE_LOCALE_LABELS: Record<string, string> = {
  'en-US': 'US',
  'en-GB': 'UK',
  'en-AU': 'AU',
  'en-CA': 'CA',
  'en-IE': 'IE',
  'en-NZ': 'NZ',
  'en-ZA': 'SA',
  'en-IN': 'IN',
};

const NATURAL_VOICE_KEYWORDS = [
  'natural',
  'neural',
  'premium',
  'enhanced',
  'google',
  'aria',
  'ava',
  'emma',
  'jenny',
  'samantha',
  'susan',
  'daniel',
  'karen',
  'moira',
  'tessa',
];

const NOVELTY_VOICE_KEYWORDS = [
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'pipe organ',
  'trinoids',
  'whisper',
  'zarvox',
];

const normalizeVoiceText = (value: string) => value.toLocaleLowerCase();

const isEnglishVoice = (voice: SpeechSynthesisVoice) => normalizeVoiceText(voice.lang).startsWith('en');

const isNoveltyVoice = (voice: SpeechSynthesisVoice) => {
  const name = normalizeVoiceText(voice.name);
  return NOVELTY_VOICE_KEYWORDS.some(keyword => name.includes(keyword));
};

const isNaturalVoice = (voice: SpeechSynthesisVoice) => {
  const name = normalizeVoiceText(voice.name);
  return NATURAL_VOICE_KEYWORDS.some(keyword => name.includes(keyword));
};

const getVoiceScore = (voice: SpeechSynthesisVoice) => {
  const localeIndex = TEACHER_VOICE_LOCALES.indexOf(voice.lang);
  const localeScore = localeIndex >= 0 ? (TEACHER_VOICE_LOCALES.length - localeIndex) * 8 : 0;
  return localeScore + (isNaturalVoice(voice) ? 35 : 0) + (voice.default ? 10 : 0) + (voice.localService ? 5 : 0);
};

const getTeacherVoices = (voices: SpeechSynthesisVoice[]) => {
  const uniqueEnglishVoices = Array.from(
    new Map(
      voices
        .filter(isEnglishVoice)
        .filter(voice => !isNoveltyVoice(voice))
        .map(voice => [voice.voiceURI, voice])
    ).values()
  );

  const preferredLocaleVoices = uniqueEnglishVoices.filter(voice => TEACHER_VOICE_LOCALES.includes(voice.lang));
  const candidateVoices = preferredLocaleVoices.length > 0 ? preferredLocaleVoices : uniqueEnglishVoices;

  return [...candidateVoices]
    .sort((a, b) => getVoiceScore(b) - getVoiceScore(a) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))
    .slice(0, 12);
};

const formatVoiceLabel = (voice: SpeechSynthesisVoice) => {
  const cleanName = voice.name
    .replace(/\b(Microsoft|Google|Apple)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const localeLabel = VOICE_LOCALE_LABELS[voice.lang] ?? voice.lang;
  const qualityLabel = isNaturalVoice(voice) ? 'Natural' : voice.localService ? 'Local' : 'Online';

  return `${cleanName} · ${localeLabel} · ${qualityLabel}`;
};

const applyVoiceToUtterance = (utterance: SpeechSynthesisUtterance, voiceURI: string) => {
  const voice = window.speechSynthesis.getVoices().find(candidate => candidate.voiceURI === voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'en-US';
    return;
  }

  utterance.lang = 'en-US';
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [score, setScore] = useState<GameScore>({ correct: 0, wrong: 0, total: 0 });
  const [encouragement, setEncouragement] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Browser and OS voice packs are loaded asynchronously in some engines.
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const teacherVoices = getTeacherVoices(voices);
      setAvailableVoices(teacherVoices);
      setSelectedVoiceURI(currentVoiceURI => {
        if (currentVoiceURI && teacherVoices.some(voice => voice.voiceURI === currentVoiceURI)) {
          return currentVoiceURI;
        }

        return teacherVoices[0]?.voiceURI ?? '';
      });
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

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

  const playVoicePreview = useCallback((voiceURI = selectedVoiceURI) => {
    if (!voiceURI) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(VOICE_PREVIEW_WORD);
      applyVoiceToUtterance(utterance, voiceURI);
      utterance.rate = 0.82;
      utterance.pitch = 1.08;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Voice preview failed', err);
    }
  }, [selectedVoiceURI]);

  const handleVoiceChange = useCallback((voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    playVoicePreview(voiceURI);
  }, [playVoicePreview]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden font-['Fredoka'] bg-[#b8eef8] text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-[26vh] bg-[#78c66d]" />
        <div className="absolute inset-x-0 bottom-[22vh] h-12 bg-[#f6d96d]" />
        <div className="menu-cloud menu-float-slow absolute left-[7%] top-[8%] text-5xl opacity-70">☁️</div>
        <div className="menu-cloud menu-float-medium absolute right-[10%] top-[13%] text-4xl opacity-60">☁️</div>
        <div className="menu-cloud menu-float-fast absolute right-[34%] top-[5%] text-3xl opacity-50">☁️</div>
        <div className="absolute bottom-[21vh] left-[8%] text-5xl opacity-80">🌳</div>
        <div className="absolute bottom-[20vh] right-[5%] text-5xl opacity-80">🌻</div>
        <div className="menu-word-tile absolute bottom-[9vh] left-[10%] rotate-[-8deg] bg-white px-4 py-3 text-3xl shadow-lg">cat</div>
        <div className="menu-word-tile absolute bottom-[16vh] left-[27%] rotate-[6deg] bg-[#fde68a] px-4 py-3 text-3xl shadow-lg">sun</div>
        <div className="menu-word-tile absolute bottom-[8vh] right-[18%] rotate-[9deg] bg-white px-4 py-3 text-3xl shadow-lg">jump</div>
      </div>

      {gameState === GameState.MENU && (
        <main className="relative z-10 h-screen w-full overflow-y-auto px-4 py-5 sm:px-7 lg:px-12">
          <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col justify-start gap-5 lg:justify-center">
            <div className="grid w-full grid-cols-1 items-center gap-7 lg:grid-cols-[minmax(320px,0.8fr)_minmax(590px,1.2fr)] lg:gap-10">
              <section className="menu-hero-copy max-w-xl pt-5 sm:pt-7 lg:pt-0">
                <div className="mb-5 inline-flex items-center gap-3 rounded-lg bg-white/75 px-4 py-2 text-base text-slate-700 shadow-sm backdrop-blur">
                  <span className="text-2xl leading-none">🎧</span>
                  Listen, read, and jump
                </div>
                <h1 className="text-[4rem] leading-[0.86] text-slate-950 sm:text-[5.7rem] lg:text-[6.8rem]">
                  Magic Word Jumper
                </h1>
                <p className="mt-5 max-w-md text-2xl leading-tight text-slate-700 sm:text-3xl">
                  A quick English word game built for big taps, bright choices, and happy repeats.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleLevelSelect(LEVELS[0])}
                    className="group inline-flex min-h-[64px] items-center justify-center gap-3 rounded-lg bg-slate-950 px-7 text-2xl text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-pink-600 active:translate-y-0"
                    aria-label={`Start ${getLevelTitle(LEVELS[0])}`}
                  >
                    Start
                    <span className="text-3xl transition-transform group-hover:translate-x-1">→</span>
                  </button>
                  <div className="text-base leading-tight text-slate-700 sm:text-lg">
                    <span className="block text-2xl text-slate-950">{LEVELS.length} trails</span>
                    {TOTAL_QUESTIONS} words ready
                  </div>
                </div>
                <div className="mt-8 grid max-w-md grid-cols-3 divide-x divide-slate-900/15 border-y-2 border-slate-900/15 py-4 text-center">
                  <div>
                    <div className="text-3xl text-pink-600">3</div>
                    <div className="text-sm uppercase text-slate-600">choices</div>
                  </div>
                  <div>
                    <div className="text-3xl text-amber-600">10</div>
                    <div className="text-sm uppercase text-slate-600">rounds</div>
                  </div>
                  <div>
                    <div className="text-3xl text-emerald-600">1</div>
                    <div className="text-sm uppercase text-slate-600">voice</div>
                  </div>
                </div>
              </section>

              <section aria-label="Choose a level" className="menu-level-board">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-3xl text-slate-950 sm:text-4xl">Choose a trail</h2>
                    <p className="text-lg text-slate-700">Every trail has 10 jump-friendly words.</p>
                  </div>
                  <span className="hidden text-5xl leading-none lg:block">🪄</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:gap-5">
                  {LEVELS.map((level, index) => {
                    const tone = LEVEL_TONES[index % LEVEL_TONES.length];

                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => handleLevelSelect(level)}
                        className={`menu-level-button group relative min-h-[136px] overflow-hidden rounded-lg p-4 text-left shadow-xl ring-4 ring-white/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${tone.surface} ${tone.ring} active:translate-y-1 sm:min-h-[158px] sm:p-5`}
                        style={{ animationDelay: `${index * 55}ms` }}
                      >
                        <div className={`absolute left-0 top-0 h-full w-2 ${tone.accent}`} />
                        <div className="relative flex h-full flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-5xl leading-none transition-transform duration-200 group-hover:scale-110 sm:text-6xl">
                              {level.thumbnail}
                            </span>
                            <span className={`rounded-lg bg-white/80 px-3 py-1 text-base ${tone.text}`}>
                              {getLevelShortName(level)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-2xl leading-none text-slate-950 sm:text-3xl">
                              {level.category}
                            </span>
                            <span className="mt-2 block text-base text-slate-600">
                              {level.questions.length} words
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="menu-voice-bar flex w-full flex-col gap-3 border-t-2 border-white/55 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-slate-800">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/80 text-2xl shadow-sm">🔊</span>
                <div>
                  <div className="text-xl text-slate-950">Voice teacher</div>
                  <div className="text-sm text-slate-600">Pick an English voice before the jump.</div>
                </div>
              </div>
              <div className="flex w-full gap-2 sm:max-w-xl">
                <div className="relative min-w-0 flex-1">
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border-4 border-white bg-white/90 px-5 py-4 pr-12 text-lg text-slate-800 shadow-lg outline-none transition focus:ring-4 focus:ring-pink-200"
                  >
                    {availableVoices.length > 0 ? (
                      availableVoices.map(voice => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {formatVoiceLabel(voice)}
                        </option>
                      ))
                    ) : (
                      <option value="">Default Voice</option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-2xl text-pink-500">⌄</div>
                </div>
                <button
                  type="button"
                  onClick={() => playVoicePreview()}
                  disabled={!selectedVoiceURI}
                  aria-label={`Preview voice with the word ${VOICE_PREVIEW_WORD}`}
                  title={`Preview: ${VOICE_PREVIEW_WORD}`}
                  className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-lg border-4 border-white bg-slate-950 text-2xl text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-pink-600 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </main>
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
        <div className="z-10 bg-white/95 p-10 md:p-14 rounded-[3rem] pixel-border text-center max-w-2xl w-full mx-4 shadow-2xl relative">
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 text-8xl md:text-9xl">🏆</div>
          <h2 className="text-5xl md:text-7xl font-normal text-violet-600 mb-10 mt-5 uppercase">Big Win!</h2>
          
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="p-8 md:p-10 bg-green-50 rounded-3xl border-4 border-green-100">
              <div className="text-base md:text-xl font-normal text-green-500 uppercase mb-2">Stars</div>
              <div className="text-6xl md:text-8xl font-normal text-green-600">{score.correct}</div>
            </div>
            <div className="p-8 md:p-10 bg-orange-50 rounded-3xl border-4 border-orange-100">
              <div className="text-base md:text-xl font-normal text-orange-400 uppercase mb-2">Total</div>
              <div className="text-6xl md:text-8xl font-normal text-orange-500">{score.total}</div>
            </div>
          </div>

          <div className="mb-12 p-8 md:p-10 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[2rem] italic text-2xl md:text-4xl text-gray-700 leading-tight font-normal border-4 border-white shadow-xl">
            "{encouragement || 'Preparing your special prize...'}"
          </div>

          <PixelButton onClick={() => setGameState(GameState.MENU)} className="w-full py-8 text-3xl md:text-4xl rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase font-normal">
            GO AGAIN! 🔄
          </PixelButton>
        </div>
      )}
    </div>
  );
};

export default App;
