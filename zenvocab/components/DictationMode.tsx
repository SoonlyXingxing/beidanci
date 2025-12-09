import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Check, X, ArrowRight, Settings as SettingsIcon, Home, RotateCcw } from 'lucide-react';
import { Word, ErrorRecord } from '../types';

interface DictationModeProps {
  words: Word[];
  targetCount: number;
  initialSpeed: number;
  onComplete: (result: { totalCount: number; errors: ErrorRecord[]; learnedIds: string[] }) => void;
  onExit: () => void;
}

export const DictationMode: React.FC<DictationModeProps> = ({ words, targetCount, initialSpeed, onComplete, onExit }) => {
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [speed, setSpeed] = useState(initialSpeed);
  const [sessionErrors, setSessionErrors] = useState<ErrorRecord[]>([]);
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [showSpeedSettings, setShowSpeedSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Shuffle and slice
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    setQueue(shuffled.slice(0, targetCount));
  }, [words, targetCount]);

  const currentWord = queue[currentIndex];

  const playAudio = useCallback((word: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-GB'; // British English
    utterance.rate = speed;
    window.speechSynthesis.speak(utterance);
    // Refocus input after audio starts
    inputRef.current?.focus();
  }, [speed]);

  useEffect(() => {
    if (currentWord) {
      setTimeout(() => playAudio(currentWord.text), 500);
    }
  }, [currentWord, playAudio]);

  const nextWord = useCallback(() => {
    setFeedback('none');
    setInput('');
    if (currentIndex + 1 >= queue.length) {
      onComplete({
        totalCount: queue.length,
        errors: sessionErrors,
        learnedIds: learnedIds
      });
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, queue.length, onComplete, sessionErrors, learnedIds]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentWord) return;
    
    if (feedback !== 'none') {
        return;
    }

    const isCorrect = input.trim().toLowerCase() === currentWord.text.toLowerCase();

    if (isCorrect) {
      setFeedback('correct');
      // Mark as learned
      setLearnedIds(prev => [...prev, currentWord.id]);
      // Remove auto advance
    } else {
      setFeedback('incorrect');
      setSessionErrors(prev => [...prev, {
        wordId: currentWord.id,
        wordText: currentWord.text,
        wordDefinition: currentWord.definition,
        wordPhonetic: currentWord.phonetic,
        date: new Date().toISOString().split('T')[0],
        type: 'dictation'
      }]);
    }
  };

  // Keyboard shortcut: Enter to next when feedback is shown
  // Tab to replay audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to next
      if (e.key === 'Enter' && feedback !== 'none') {
        e.preventDefault();
        e.stopPropagation();
        nextWord();
      }
      
      // Tab to replay
      if (e.key === 'Tab') {
        e.preventDefault();
        if (currentWord) {
            playAudio(currentWord.text);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback, nextWord, currentWord, playAudio]);

  if (!currentWord) return <div className="flex justify-center items-center h-full">准备中...</div>;

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto p-6">
       {/* Header */}
       <div className="flex justify-between items-center mb-12">
        <button onClick={onExit} className="p-2 text-slate-400 hover:text-slate-800"><Home/></button>
        <span className="font-mono text-slate-300">
          {currentIndex + 1} / {queue.length}
        </span>
        <div className="relative">
          <button 
            onClick={() => setShowSpeedSettings(!showSpeedSettings)} 
            className="p-2 text-slate-400 hover:text-slate-800"
          >
            <SettingsIcon size={24} />
          </button>
          
          {showSpeedSettings && (
            <div className="absolute right-0 top-12 bg-white shadow-xl border border-slate-100 p-4 rounded-xl w-48 z-10 animate-fade-in-up">
              <label className="block text-sm text-slate-600 mb-2">朗读速度: {speed.toFixed(1)}x</label>
              <input 
                type="range" 
                min="0.5" 
                max="2.0" 
                step="0.1" 
                value={speed} 
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center pt-10">
        
        {/* Audio Button (Large) */}
        <button 
          onClick={() => playAudio(currentWord.text)}
          className="mb-12 p-8 bg-white rounded-full shadow-lg text-primary hover:shadow-xl hover:scale-105 transition-all duration-300 border border-slate-100"
        >
          <Volume2 size={48} />
        </button>

        {/* Input */}
        <form onSubmit={handleSubmit} className="w-full relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={feedback !== 'none'}
            className={`
              w-full text-center text-3xl font-bold bg-transparent border-b-4 outline-none pb-2 transition-colors
              ${feedback === 'none' ? 'border-slate-200 text-slate-800 focus:border-primary' : ''}
              ${feedback === 'correct' ? 'border-emerald-500 text-emerald-600' : ''}
              ${feedback === 'incorrect' ? 'border-rose-500 text-rose-500' : ''}
            `}
            placeholder="Type word..."
            autoFocus
            autoComplete="off"
          />
        </form>

        {/* Feedback Display */}
        <div className="mt-12 h-24 w-full flex flex-col items-center justify-center">
          {feedback === 'correct' && (
            <div className="flex flex-col items-center animate-bounce-short">
              <div className="flex items-center space-x-2 text-emerald-500">
                <Check size={32} />
                <span className="text-2xl font-bold">正确</span>
              </div>
              <p className="text-slate-500 mt-2 text-lg font-medium">{currentWord.definition}</p>
              <p className="text-slate-400 text-xs mt-2 animate-pulse">按 Enter 下一个</p>
            </div>
          )}

          {feedback === 'incorrect' && (
             <div className="flex flex-col items-center animate-shake">
               <div className="flex items-center space-x-2 text-rose-500 mb-2">
                 <X size={32} />
                 <span className="text-2xl font-bold">错误</span>
               </div>
               <p className="text-slate-400">正确答案: <span className="text-slate-800 font-bold text-xl ml-2">{currentWord.text}</span></p>
               <p className="text-slate-400 text-sm mt-1">{currentWord.definition}</p>
               
               <button 
                onClick={() => nextWord()}
                className="mt-6 flex items-center space-x-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
               >
                 <span>下一个 (Enter)</span>
                 <ArrowRight size={16} />
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};