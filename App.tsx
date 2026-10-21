import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Languages,
  HelpCircle,
  Users,
  PhoneCall,
  Sparkles,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  BookOpen,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { QUESTIONS, PRIZE_LADDER } from './questions.ts';
import { sound } from './sound.ts';
import {
  GameStatus,
  LifelineState,
  AudienceVote,
  PhoneFriendAdvice,
  UserAnswerRecord,
} from './types.ts';

export default function App() {
  // Game progression state
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('INTRO');
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isLockingIn, setIsLockingIn] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswerRecord[]>([]);

  // Sound and translations settings
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);
  const [alwaysShowRu, setAlwaysShowRu] = useState<boolean>(false);
  const [showQuestionRu, setShowQuestionRu] = useState<boolean>(false);
  const [activeOptionRu, setActiveOptionRu] = useState<Record<string, boolean>>({});

  // Lifelines state
  const [lifelines, setLifelines] = useState<LifelineState>({
    fiftyFiftyUsed: false,
    audienceUsed: false,
    phoneUsed: false,
  });
  const [disabledOptions, setDisabledOptions] = useState<('A' | 'B' | 'C' | 'D')[]>([]);
  const [audienceModalData, setAudienceModalData] = useState<AudienceVote[] | null>(null);
  const [phoneModalData, setPhoneModalData] = useState<PhoneFriendAdvice | null>(null);

  // UI helpers
  const [showLadderMobile, setShowLadderMobile] = useState<boolean>(false);
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null);

  const currentQ = useMemo(() => QUESTIONS[currentIdx], [currentIdx]);

  // Sync mute state
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Start the game
  const handleStartGame = () => {
    setCurrentIdx(0);
    setGameStatus('PLAYING');
    setSelectedOption(null);
    setIsLockingIn(false);
    setUserAnswers([]);
    setDisabledOptions([]);
    setLifelines({
      fiftyFiftyUsed: false,
      audienceUsed: false,
      phoneUsed: false,
    });
    setShowQuestionRu(false);
    setActiveOptionRu({});
    sound.playSelect();
    sound.startHeartbeat();
  };

  // Option click handler
  const handleOptionClick = (optionId: 'A' | 'B' | 'C' | 'D') => {
    if (gameStatus !== 'PLAYING' || isLockingIn || disabledOptions.includes(optionId)) return;

    sound.playSelect();
    setSelectedOption(optionId);
  };

  // Lock-in answer handler
  const handleLockInAnswer = () => {
    if (!selectedOption || gameStatus !== 'PLAYING' || isLockingIn) return;

    setIsLockingIn(true);
    sound.stopHeartbeat();
    sound.playLockIn();

    // Dramatic 1.2s delay for TV suspense
    setTimeout(() => {
      const isCorrect = selectedOption === currentQ.correctAnswer;
      setIsLockingIn(false);
      setGameStatus('REVEALED');

      if (isCorrect) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }

      setUserAnswers((prev) => [
        ...prev,
        {
          questionId: currentQ.id,
          selectedOption,
          isCorrect,
          timeSpentSeconds: 0,
        },
      ]);
    }, 1200);
  };

  // Next question or finish
  const handleNextQuestion = () => {
    if (currentIdx + 1 < QUESTIONS.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setDisabledOptions([]);
      setGameStatus('PLAYING');
      setShowQuestionRu(false);
      setActiveOptionRu({});
      sound.playSelect();
      sound.startHeartbeat();
    } else {
      // Completed all 30 questions!
      sound.stopHeartbeat();
      sound.playVictory();
      setGameStatus('SUMMARY');
    }
  };

  // Lifeline: 50:50
  const handleUseFiftyFifty = () => {
    if (lifelines.fiftyFiftyUsed || gameStatus !== 'PLAYING') return;

    sound.playLifeline();
    const wrongOptions = currentQ.options
      .filter((opt) => opt.id !== currentQ.correctAnswer)
      .map((opt) => opt.id);

    // Shuffle and pick 2 wrong options to eliminate
    const shuffledWrong = [...wrongOptions].sort(() => 0.5 - Math.random());
    const toDisable = shuffledWrong.slice(0, 2);

    setDisabledOptions(toDisable);
    setLifelines((prev) => ({ ...prev, fiftyFiftyUsed: true }));
  };

  // Lifeline: Ask Audience
  const handleUseAudience = () => {
    if (lifelines.audienceUsed || gameStatus !== 'PLAYING') return;

    sound.playLifeline();
    const correct = currentQ.correctAnswer;
    const correctPercentage = Math.floor(Math.random() * 20) + 65; // 65% - 85%
    const remaining = 100 - correctPercentage;

    const otherOptions = (['A', 'B', 'C', 'D'] as const).filter((opt) => opt !== correct);
    const p1 = Math.floor(Math.random() * (remaining - 4)) + 2;
    const p2 = Math.floor(Math.random() * (remaining - p1 - 2)) + 1;
    const p3 = remaining - p1 - p2;

    const votes: AudienceVote[] = [
      { option: correct, percentage: correctPercentage },
      { option: otherOptions[0], percentage: p1 },
      { option: otherOptions[1], percentage: p2 },
      { option: otherOptions[2], percentage: p3 },
    ].sort((a, b) => a.option.localeCompare(b.option)) as AudienceVote[];

    setAudienceModalData(votes);
    setLifelines((prev) => ({ ...prev, audienceUsed: true }));
  };

  // Lifeline: Call a friend
  const handleUsePhone = () => {
    if (lifelines.phoneUsed || gameStatus !== 'PLAYING') return;

    sound.playLifeline();
    const friendAdvice: PhoneFriendAdvice = {
      friendName: 'Carlos (Guía de viajes en Madrid)',
      confidence: 90,
      recommendedOption: currentQ.correctAnswer,
      messageEs: `¡Hola! Conozco muy bien esta situación. Sin duda alguna elegiría la opción ${currentQ.correctAnswer}: "${currentQ.options.find((o) => o.id === currentQ.correctAnswer)?.textEs}". ¡Es la solución más lógica y segura!`,
      messageRu: `Привет! Я отлично знаю эту ситуацию. Не сомневаясь, выбрал бы вариант ${currentQ.correctAnswer}: "${currentQ.options.find((o) => o.id === currentQ.correctAnswer)?.textRu}". Это самый логичный и безопасный выбор!`,
    };

    setPhoneModalData(friendAdvice);
    setLifelines((prev) => ({ ...prev, phoneUsed: true }));
  };

  // Toggle Russian translation for an individual option
  const toggleOptionTranslation = (optId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveOptionRu((prev) => ({
      ...prev,
      [optId]: !prev[optId],
    }));
  };

  // Clean up sound heartbeat on unmount
  useEffect(() => {
    return () => {
      sound.stopHeartbeat();
    };
  }, []);

  // Total correct count
  const correctCount = userAnswers.filter((a) => a.isCorrect).length;
  const currentPrize = currentIdx > 0 ? PRIZE_LADDER[currentIdx - 1]?.amount : '0 €';

  return (
    <div className="min-h-screen studio-bg studio-rings flex flex-col text-slate-100 select-none">
      {/* Top Bar Navigation */}
      <header className="border-b border-blue-900/40 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400/80 bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold text-lg">
            €
          </div>
          <div>
            <h1 className="text-sm md:text-base font-extrabold tracking-wide uppercase bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              ¿Quién Quiere Ser Millonario?
            </h1>
            <p className="text-[11px] text-blue-300/80 hidden sm:block">
              Español Nivel A2–B1 · 30 Situaciones de Viaje y Turismo
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Always show RU translations toggle */}
          <button
            onClick={() => setAlwaysShowRu(!alwaysShowRu)}
            title="Mostrar u ocultar traducción rusa en toda la pantalla"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              alwaysShowRu
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-sm shadow-amber-500/20'
                : 'bg-blue-950/50 text-blue-200/80 border-blue-800/40 hover:bg-blue-900/40'
            }`}
          >
            <Languages className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Traducción RU:</span>
            <span>{alwaysShowRu ? 'Activada' : 'Manual'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-300 hover:text-white hover:bg-blue-900/60 transition-colors"
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            aria-label="Sonido"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Prize Ladder Mobile Toggle */}
          {gameStatus !== 'INTRO' && gameStatus !== 'SUMMARY' && (
            <button
              onClick={() => setShowLadderMobile(!showLadderMobile)}
              className="lg:hidden px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-400/40 text-amber-300"
            >
              {PRIZE_LADDER[currentIdx]?.amount}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 w-full max-w-7xl mx-auto relative">
        {/* =========================================================================
            SCREEN 1: INTRO / START SCREEN
           ========================================================================= */}
        {gameStatus === 'INTRO' && (
          <div className="w-full max-w-3xl my-auto bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 md:p-10 shadow-2xl shadow-blue-950 backdrop-blur-md text-center">
            {/* Medallion Logo */}
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 mx-auto rounded-full border-4 border-amber-400/90 bg-gradient-to-b from-blue-900 via-slate-950 to-blue-950 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Sparkles className="w-14 h-14 text-amber-300 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider">
                Nivel A2–B1
              </div>
            </div>

            <h2 className="text-2xl md:text-4xl font-extrabold tracking-wide text-white mb-2 uppercase">
              ¿Qué harías en esta situación?
            </h2>
            <p className="text-sm md:text-base text-amber-200/90 font-medium mb-6 max-w-xl mx-auto">
              30 preguntas situacionales sobre viajes, vacaciones, restaurantes y hoteles con traducción completa al ruso
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto mb-8 text-xs text-blue-200">
              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Juego Continuo Sin Bloqueos:</strong> Si fallas una respuesta, el juego sigue adelante para que aprendas los 30 casos.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-start gap-2.5">
                <Languages className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Traducción a Demanda:</strong> Haz clic en cualquier pregunta u opción para ver su traducción exacta al ruso.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Comodines Clásicos:</strong> 50:50, Consulta al Público y Llamada a un Amigo en cualquier momento.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-start gap-2.5">
                <Award className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Gran Premio de 1.000.000 €:</strong> Escala clásica de 30 niveles con hitos seguros para tu banco.
                </span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="px-8 py-4 rounded-xl font-extrabold text-base md:text-lg text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-xl shadow-amber-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Comenzar el juego · Начать игру</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            SCREEN 2: ACTIVE GAMEPLAY
           ========================================================================= */}
        {(gameStatus === 'PLAYING' || gameStatus === 'REVEALED') && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-start justify-center">
            {/* Left/Center Column: Quiz Arena */}
            <div className="flex-1 w-full flex flex-col items-center">
              {/* Lifeline Buttons Bar */}
              <div className="flex items-center justify-center gap-4 mb-4">
                {/* 50:50 */}
                <button
                  onClick={handleUseFiftyFifty}
                  disabled={lifelines.fiftyFiftyUsed || gameStatus !== 'PLAYING'}
                  title="50:50 — Elimina dos respuestas incorrectas"
                  className={`w-14 h-12 md:w-16 md:h-14 rounded-full border-2 flex flex-col items-center justify-center font-extrabold text-xs transition-all shadow-md ${
                    lifelines.fiftyFiftyUsed
                      ? 'border-slate-700 bg-slate-900/60 text-slate-600 cursor-not-allowed line-through'
                      : 'border-amber-400/80 bg-gradient-to-b from-blue-900 to-slate-950 text-amber-300 hover:border-amber-300 hover:scale-105 shadow-amber-500/20'
                  }`}
                >
                  <span className="text-sm md:text-base font-black">50:50</span>
                </button>

                {/* Ask Audience */}
                <button
                  onClick={handleUseAudience}
                  disabled={lifelines.audienceUsed || gameStatus !== 'PLAYING'}
                  title="Consulta al Público — Votación de la sala"
                  className={`w-14 h-12 md:w-16 md:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-md ${
                    lifelines.audienceUsed
                      ? 'border-slate-700 bg-slate-900/60 text-slate-600 cursor-not-allowed'
                      : 'border-amber-400/80 bg-gradient-to-b from-blue-900 to-slate-950 text-amber-300 hover:border-amber-300 hover:scale-105 shadow-amber-500/20'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase mt-0.5">Público</span>
                </button>

                {/* Call Friend */}
                <button
                  onClick={handleUsePhone}
                  disabled={lifelines.phoneUsed || gameStatus !== 'PLAYING'}
                  title="Llamada al Amigo — Consejo de un experto"
                  className={`w-14 h-12 md:w-16 md:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-md ${
                    lifelines.phoneUsed
                      ? 'border-slate-700 bg-slate-900/60 text-slate-600 cursor-not-allowed'
                      : 'border-amber-400/80 bg-gradient-to-b from-blue-900 to-slate-950 text-amber-300 hover:border-amber-300 hover:scale-105 shadow-amber-500/20'
                  }`}
                >
                  <PhoneCall className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase mt-0.5">Amigo</span>
                </button>
              </div>

              {/* Category & Step Header */}
              <div className="w-full max-w-3xl flex items-center justify-between text-xs md:text-sm text-blue-300/90 mb-2 px-3">
                <span className="font-semibold text-amber-300/90 uppercase tracking-wide">
                  {currentQ.partTitleEs}
                </span>
                <span className="font-mono bg-blue-950/80 border border-blue-800/40 px-2.5 py-0.5 rounded-full text-blue-200">
                  {currentIdx + 1} / 30 · <strong className="text-amber-400">{PRIZE_LADDER[currentIdx]?.amount}</strong>
                </span>
              </div>

              {/* ================= QUESTION BOX ================= */}
              <div className="w-full max-w-3xl relative mb-6">
                {/* Connecting horizontal line */}
                <div className="absolute top-1/2 -left-4 -right-4 h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent -z-10" />

                <div
                  onClick={() => setShowQuestionRu(!showQuestionRu)}
                  className="lozenge-shape border-2 border-amber-400/70 bg-gradient-to-b from-blue-950 via-slate-950 to-blue-950 p-6 md:p-8 text-center shadow-xl shadow-blue-950/80 cursor-pointer group hover:border-amber-300 transition-all"
                  title="Haz clic para ver u ocultar la traducción al ruso"
                >
                  {/* Topic badge */}
                  <div className="text-xs uppercase tracking-widest text-amber-400/90 font-bold mb-2 flex items-center justify-center gap-2">
                    <span>{currentQ.topicEs}</span>
                    {(alwaysShowRu || showQuestionRu) && (
                      <span className="text-slate-400 font-normal">({currentQ.topicRu})</span>
                    )}
                  </div>

                  {/* Spanish Main Question */}
                  <h2 className="text-lg md:text-2xl font-bold leading-snug text-white tracking-wide">
                    {currentQ.questionEs}
                  </h2>

                  {/* Russian Translation Accordion */}
                  {(alwaysShowRu || showQuestionRu) && (
                    <div className="mt-4 pt-3 border-t border-blue-800/40 text-sm md:text-base text-amber-200/90 font-medium">
                      🇷🇺 {currentQ.questionRu}
                    </div>
                  )}

                  {/* Click affordance indicator */}
                  {!alwaysShowRu && (
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-blue-400/70 group-hover:text-blue-300 transition-colors">
                      <Languages className="w-3.5 h-3.5" />
                      <span>{showQuestionRu ? 'Ocultar traducción' : 'Clic para traducir al ruso'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= 4 OPTIONS GRID ================= */}
              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
                {currentQ.options.map((option) => {
                  const isSelected = selectedOption === option.id;
                  const isDisabled = disabledOptions.includes(option.id);
                  const isCorrect = option.id === currentQ.correctAnswer;
                  const isRevealed = gameStatus === 'REVEALED';
                  const showTranslation = alwaysShowRu || activeOptionRu[option.id];

                  // Determine card appearance classes
                  let stateClass =
                    'border-amber-400/60 bg-gradient-to-b from-blue-950 via-slate-950 to-blue-950 hover:border-amber-300 hover:bg-blue-900/50';

                  if (isSelected && isLockingIn) {
                    stateClass = 'option-selected text-white';
                  } else if (isRevealed) {
                    if (isCorrect) {
                      stateClass = 'option-correct font-semibold';
                    } else if (isSelected && !isCorrect) {
                      stateClass = 'option-wrong font-semibold';
                    } else {
                      stateClass = 'border-slate-800 bg-slate-950/60 opacity-40';
                    }
                  } else if (isSelected) {
                    stateClass = 'border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/50';
                  } else if (isDisabled) {
                    stateClass = 'border-slate-800 bg-slate-950/40 opacity-20 cursor-not-allowed pointer-events-none';
                  }

                  return (
                    <div
                      key={option.id}
                      onClick={() => handleOptionClick(option.id)}
                      className={`lozenge-shape border-2 p-3.5 md:p-4 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${stateClass}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Option Letter Amber Badge */}
                        <span className="w-6 h-6 rounded-sm bg-amber-500/20 border border-amber-400/60 text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {option.id}
                        </span>

                        {/* Spanish Text */}
                        <div className="flex-1 pr-7">
                          <p className="text-sm md:text-base font-medium leading-snug text-white">
                            {option.textEs}
                          </p>

                          {/* Russian Translation on demand */}
                          {showTranslation && (
                            <p className="mt-2 text-xs md:text-sm text-amber-200/90 font-normal border-t border-blue-900/50 pt-1.5">
                              🇷🇺 {option.textRu}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Small RU translation toggle button on the option */}
                      {!alwaysShowRu && !isDisabled && (
                        <button
                          type="button"
                          onClick={(e) => toggleOptionTranslation(option.id, e)}
                          title="Traducir esta opción"
                          className="absolute top-2.5 right-3 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-700/60 bg-blue-950/80 text-blue-300 hover:text-white hover:border-amber-400 transition-colors"
                        >
                          {showTranslation ? 'ES' : 'RU'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ================= CONTROLS & REVEAL SECTION ================= */}
              <div className="w-full max-w-3xl flex flex-col items-center">
                {/* Lock-In Button (While Playing) */}
                {gameStatus === 'PLAYING' && (
                  <button
                    onClick={handleLockInAnswer}
                    disabled={!selectedOption || isLockingIn}
                    className={`px-8 py-3.5 rounded-xl font-extrabold text-sm md:text-base uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
                      selectedOption && !isLockingIn
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 hover:scale-105 cursor-pointer'
                        : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {isLockingIn
                        ? 'Comprobando respuesta... · Проверка...'
                        : selectedOption
                        ? `Confirmar opción ${selectedOption} · Зафиксировать ответ`
                        : 'Elige una opción · Выберите вариант'}
                    </span>
                  </button>
                )}

                {/* Explanation Card & Continue Button (When Revealed) */}
                {gameStatus === 'REVEALED' && (
                  <div className="w-full bg-slate-900/90 border border-blue-800/70 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-3.5 mb-3">
                      {selectedOption === currentQ.correctAnswer ? (
                        <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-red-500/20 border border-red-400/50 text-red-400 shrink-0">
                          <XCircle className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-base font-bold ${
                              selectedOption === currentQ.correctAnswer ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {selectedOption === currentQ.correctAnswer
                              ? '¡Correcto y muy sensato!'
                              : `Respuesta sensata: Opción ${currentQ.correctAnswer}`}
                          </h3>
                          <span className="text-xs text-blue-300/70">
                            {selectedOption === currentQ.correctAnswer
                              ? '(Правильный и разумный выбор)'
                              : '(Игра продолжается!)'}
                          </span>
                        </div>

                        {/* Spanish Explanation */}
                        <p className="text-sm text-slate-200 mt-1">{currentQ.explanationEs}</p>
                        {/* Russian Explanation */}
                        <p className="text-xs text-amber-200/90 mt-1">🇷🇺 {currentQ.explanationRu}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={handleNextQuestion}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <span>
                          {currentIdx + 1 < QUESTIONS.length
                            ? 'Siguiente pregunta · Следующий вопрос'
                            : 'Ver resultados finales · Результаты'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column / Desktop Prize Ladder */}
            <aside className="hidden lg:flex flex-col w-64 bg-slate-950/80 border border-blue-900/60 rounded-2xl p-4 shadow-xl backdrop-blur-md shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Escala de Premios
                </span>
                <span className="text-xs text-blue-300 font-mono">
                  {correctCount}/{currentIdx + (gameStatus === 'REVEALED' ? 1 : 0)} aciertos
                </span>
              </div>

              {/* Ladder items reversed (30 down to 1) */}
              <div className="flex flex-col gap-1 max-h-[520px] overflow-y-auto pr-1">
                {[...PRIZE_LADDER].reverse().map((step) => {
                  const isCurrent = step.level === currentIdx + 1;
                  const isPassed = step.level <= currentIdx;
                  const isMilestone = step.isMilestone;

                  let itemClasses = 'text-blue-300/60';
                  if (isCurrent) {
                    itemClasses = 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/40 rounded';
                  } else if (isPassed) {
                    itemClasses = 'text-amber-300 font-medium';
                  } else if (isMilestone) {
                    itemClasses = 'text-white font-bold';
                  }

                  return (
                    <div
                      key={step.level}
                      className={`flex items-center justify-between px-2.5 py-1 text-xs rounded transition-colors ${itemClasses}`}
                    >
                      <span className="font-mono w-6 text-left">{step.level}</span>
                      <span className="font-bold tracking-wide">{step.amount}</span>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3: SUMMARY & FINAL REVIEW (ALL 30 QUESTIONS)
           ========================================================================= */}
        {gameStatus === 'SUMMARY' && (
          <div className="w-full max-w-4xl bg-slate-900/90 border border-amber-400/40 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-md">
            {/* Victory Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 mb-4">
                <Award className="w-10 h-10" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-wide">
                ¡Enhorabuena! · Поздравляем!
              </h2>
              <p className="text-sm md:text-base text-amber-200 mt-2">
                Has completado las 30 situaciones de viaje y turismo en español
              </p>

              {/* Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-6">
                <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/50">
                  <span className="text-[11px] text-blue-300 uppercase block">Respuestas Correctas</span>
                  <span className="text-2xl font-black text-emerald-400">{correctCount} / 30</span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/50">
                  <span className="text-[11px] text-blue-300 uppercase block">Premio Acumulado</span>
                  <span className="text-2xl font-black text-amber-300">
                    {correctCount >= 28 ? '1.000.000 €' : `${Math.round((correctCount / 30) * 1000000).toLocaleString('de-DE')} €`}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/50">
                  <span className="text-[11px] text-blue-300 uppercase block">Nivel Demostrado</span>
                  <span className="text-xl font-bold text-cyan-300">
                    {correctCount >= 25 ? 'B1 Avanzado' : correctCount >= 18 ? 'B1 Inicial' : 'A2 Consolidado'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/50">
                  <span className="text-[11px] text-blue-300 uppercase block">Comodines Usados</span>
                  <span className="text-xl font-bold text-yellow-300">
                    {(lifelines.fiftyFiftyUsed ? 1 : 0) + (lifelines.audienceUsed ? 1 : 0) + (lifelines.phoneUsed ? 1 : 0)} / 3
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                <button
                  onClick={handleStartGame}
                  className="px-6 py-3 rounded-xl font-extrabold text-sm md:text-base text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Jugar de nuevo · Сыграть снова</span>
                </button>
              </div>
            </div>

            {/* Comprehensive Review of all 30 scenarios */}
            <div className="pt-6 border-t border-slate-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>Revisión de las 30 situaciones (Bilingüe ES / RU)</span>
              </h3>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
                {QUESTIONS.map((q) => {
                  const answerRec = userAnswers.find((a) => a.questionId === q.id);
                  const isExpanded = expandedReviewId === q.id;

                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-blue-900/60 bg-blue-950/40 p-4 transition-colors hover:border-blue-700/60"
                    >
                      <div
                        onClick={() => setExpandedReviewId(isExpanded ? null : q.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                              answerRec?.isCorrect
                                ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300'
                                : 'bg-red-500/20 border border-red-400/60 text-red-300'
                            }`}
                          >
                            {q.id}
                          </span>
                          <div>
                            <h4 className="text-sm font-semibold text-white">
                              {q.topicEs} <span className="text-xs text-blue-300 font-normal">({q.topicRu})</span>
                            </h4>
                            <p className="text-xs text-slate-300 line-clamp-1">{q.questionEs}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {answerRec?.isCorrect ? (
                            <span className="text-emerald-400 font-medium hidden sm:inline">Correcto</span>
                          ) : (
                            <span className="text-red-400 font-medium hidden sm:inline">Revisar</span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Expanded Question Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-blue-900/40 text-xs space-y-3">
                          <div>
                            <p className="font-medium text-white">{q.questionEs}</p>
                            <p className="text-amber-200/90 mt-0.5">🇷🇺 {q.questionRu}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt) => {
                              const isSol = opt.id === q.correctAnswer;
                              const wasPicked = answerRec?.selectedOption === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  className={`p-2.5 rounded-lg border ${
                                    isSol
                                      ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200'
                                      : wasPicked
                                      ? 'border-red-500/60 bg-red-950/40 text-red-200'
                                      : 'border-slate-800 bg-slate-900/40 text-slate-400'
                                  }`}
                                >
                                  <div className="font-bold flex items-center justify-between">
                                    <span>
                                      {opt.id}: {opt.textEs}
                                    </span>
                                    {isSol && <span className="text-[10px] text-emerald-400 font-extrabold">✓ Sensata</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-300/80 mt-1">🇷🇺 {opt.textRu}</div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-2.5 rounded-lg bg-blue-900/30 border border-blue-700/30 text-blue-200">
                            <strong>Explicación:</strong> {q.explanationEs}
                            <div className="mt-1 text-amber-200/90">🇷🇺 {q.explanationRu}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODALS & OVERLAYS: AUDIENCE POLL & PHONE A FRIEND
         ========================================================================= */}

      {/* Modal: Ask the Audience */}
      {audienceModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-400/80 rounded-2xl p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-900/60 border border-amber-400/60 text-amber-300 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              Resultado de la Votación del Público
            </h3>
            <p className="text-xs text-blue-200/80 mb-6">
              El público del estudio ha votado de la siguiente manera:
            </p>

            {/* Voting Bar Chart */}
            <div className="space-y-3 mb-6">
              {audienceModalData.map((item) => (
                <div key={item.option} className="flex items-center gap-3">
                  <span className="w-6 font-extrabold text-amber-300 text-sm">{item.option}</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-lg overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className={`h-full rounded-md transition-all duration-700 ${
                        item.percentage > 50
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono font-bold text-sm text-white">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setAudienceModalData(null)}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-400 text-slate-950 hover:bg-yellow-300 transition-colors cursor-pointer"
            >
              Cerrar · Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Modal: Call a Friend */}
      {phoneModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-400/80 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{phoneModalData.friendName}</h3>
                <p className="text-xs text-emerald-400 font-medium">Llamada conectada · Confianza: {phoneModalData.confidence}%</p>
              </div>
            </div>

            <div className="my-5 p-4 rounded-xl bg-blue-950/60 border border-blue-800/40 space-y-2">
              <p className="text-sm text-slate-100 font-medium leading-relaxed">
                "{phoneModalData.messageEs}"
              </p>
              <p className="text-xs text-amber-200/90 pt-2 border-t border-blue-900/40">
                🇷🇺 "{phoneModalData.messageRu}"
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPhoneModalData(null)}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-400 text-slate-950 hover:bg-yellow-300 transition-colors cursor-pointer"
              >
                Entendido · Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Prize Ladder Drawer */}
      {showLadderMobile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="w-72 bg-slate-950 border-l border-blue-900 h-full p-4 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-blue-900 mb-3">
              <h3 className="text-sm font-bold uppercase text-amber-400">Escala de Premios</h3>
              <button
                onClick={() => setShowLadderMobile(false)}
                className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {[...PRIZE_LADDER].reverse().map((step) => {
                const isCurrent = step.level === currentIdx + 1;
                const isPassed = step.level <= currentIdx;
                const isMilestone = step.isMilestone;

                let itemClasses = 'text-blue-300/60';
                if (isCurrent) {
                  itemClasses = 'bg-amber-500 text-slate-950 font-black shadow rounded';
                } else if (isPassed) {
                  itemClasses = 'text-amber-300 font-medium';
                } else if (isMilestone) {
                  itemClasses = 'text-white font-bold';
                }

                return (
                  <div
                    key={step.level}
                    className={`flex items-center justify-between px-2.5 py-1 text-xs rounded ${itemClasses}`}
                  >
                    <span className="font-mono">{step.level}</span>
                    <span className="font-bold">{step.amount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
