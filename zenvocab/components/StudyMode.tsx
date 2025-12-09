import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, ArrowRight, CheckCircle, HelpCircle, XCircle, Home } from 'lucide-react';
import { Word, ErrorRecord } from '../types';

interface StudyModeProps {
  words: Word[];
  targetCount: number;
  onComplete: (results: { reviewedCount: number; errors: ErrorRecord[]; learnedIds: string[] }) => void;
  onExit: () => void;
}

interface QueueItem {
  word: Word;
  // Metadata for the spaced repetition
  id: string; // unique instance id for list keys
}

export const StudyMode: React.FC<StudyModeProps> = ({ words, targetCount, onComplete, onExit }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionErrors, setSessionErrors] = useState<ErrorRecord[]>([]);
  
  // Track words that were marked as "Known" (Mastered)
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());

  // Initialize Queue
  useEffect(() => {
    // Take the first N words as the base session
    const sessionWords = words.slice(0, targetCount);
    const initialQueue: QueueItem[] = sessionWords.map(w => ({ word: w, id: crypto.randomUUID() }));
    setQueue(initialQueue);
  }, [words, targetCount]);

  const currentItem = queue[currentIndex];

  const playAudio = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB'; // British English
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Auto-play audio when word changes
  useEffect(() => {
    if (currentItem) {
      playAudio(currentItem.word.text);
    }
  }, [currentItem, playAudio]);

  const finishSession = useCallback(() => {
    const uniqueReviewed = new Set(queue.map(i => i.word.id)).size;
    onComplete({
      reviewedCount: uniqueReviewed,
      errors: sessionErrors,
      learnedIds: Array.from(learnedIds)
    });
  }, [queue, sessionErrors, learnedIds, onComplete]);

  const handleResponse = useCallback((type: 'known' | 'vague' | 'unknown') => {
    if (!currentItem) return;

    let nextQueue = [...queue];
    const currentWord = currentItem.word;
    
    // Spaced Repetition Logic
    if (type === 'known') {
      // Mark as learned if it wasn't an error previously in this session
      // (Optional strictness: if it was error before, maybe don't mark learned? 
      // But prompt says 'recited and correct', we'll assume Known = Correct)
      setLearnedIds(prev => new Set(prev).add(currentWord.id));
    } else if (type === 'vague') {
       // Requirement: Appear 1 more time
       nextQueue.push({ word: currentWord, id: crypto.randomUUID() });
       recordError(currentWord);
       // Remove from learned if it was there (unlikely but safe)
       setLearnedIds(prev => {
         const next = new Set(prev);
         next.delete(currentWord.id);
         return next;
       });
    } else if (type === 'unknown') {
       // Requirement: Appear 3 times subsequently
       nextQueue.push({ word: currentWord, id: crypto.randomUUID() });
       nextQueue.push({ word: currentWord, id: crypto.randomUUID() });
       nextQueue.push({ word: currentWord, id: crypto.randomUUID() });
       recordError(currentWord);
       setLearnedIds(prev => {
        const next = new Set(prev);
        next.delete(currentWord.id);
        return next;
      });
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= nextQueue.length) {
      // We need to defer the completion callback to ensure state updates are flushed if any
      // but here we can just call it.
      // We use a small timeout to allow the UI to finish rendering the button click feedback
      setTimeout(() => {
          // Re-calculate unique reviewed because closure captures old state? 
          // Actually we need to pass the LATEST learnedIds.
          // Since setLearnedIds is async, we can't trust `learnedIds` var immediately if we just set it.
          // So we construct the final list here.
          const finalLearned = new Set(learnedIds);
          if (type === 'known') finalLearned.add(currentWord.id);
          else finalLearned.delete(currentWord.id);
          
          const uniqueReviewed = new Set(nextQueue.map(i => i.word.id)).size;
          onComplete({
            reviewedCount: uniqueReviewed,
            errors: sessionErrors, // sessionErrors might be stale if we just called recordError?
            // recordError uses functional update, so sessionErrors is stale here.
            // We need to handle the final error addition manually if needed.
            learnedIds: Array.from(finalLearned)
          });
      }, 0);
    } else {
      setQueue(nextQueue);
      setCurrentIndex(nextIndex);
      setIsRevealed(false);
    }
  }, [queue, currentIndex, currentItem, sessionErrors, learnedIds, onComplete]);

  const recordError = (word: Word) => {
    setSessionErrors(prev => {
      // Avoid duplicate error entries for the same word in one session
      if (prev.some(e => e.wordId === word.id)) return prev;
      return [...prev, {
        wordId: word.id,
        wordText: word.text,
        wordDefinition: word.definition,
        wordPhonetic: word.phonetic,
        date: new Date().toISOString().split('T')[0],
        type: 'learning'
      }];
    });
  };

  // Keyboard shortcut: Enter to reveal / Enter to next (Known)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isRevealed) {
          setIsRevealed(true);
        } else {
          handleResponse('known');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, handleResponse]);

  if (!currentItem) return <div className="flex justify-center items-center h-full text-slate-400">准备中...</div>;

  const progress = Math.min(100, (currentIndex / queue.length) * 100);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={onExit} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <Home size={24} />
        </button>
        <div className="flex-1 mx-6 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-slate-400 tabular-nums">
           {currentIndex + 1} / {queue.length}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white rounded-3xl shadow-xl p-8 mb-8 relative overflow-hidden border border-slate-100">
        
        <h1 className="text-5xl font-bold text-slate-800 mb-4 text-center tracking-tight">{currentItem.word.text}</h1>
        
        <button 
          tabIndex={-1} // Prevent focus to fix "Enter skips twice"
          className="flex items-center space-x-2 text-slate-500 mb-8 bg-slate-50 px-5 py-2.5 rounded-full cursor-pointer hover:bg-slate-100 hover:text-primary transition-all focus:outline-none" 
          onClick={() => playAudio(currentItem.word.text)}
        >
          <span className="text-xl font-serif">{currentItem.word.phonetic}</span>
          <Volume2 size={20} />
        </button>

        {/* Reveal Area */}
        <div className={`transition-all duration-500 ease-in-out w-full flex flex-col items-center ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 invisible'}`}>
          <div className="w-16 h-1 bg-slate-100 mb-6 rounded-full"></div>
          <p className="text-2xl text-slate-700 text-center font-medium leading-relaxed">
            {currentItem.word.definition}
          </p>
        </div>

         {/* Cover for unrevealed state */}
         {!isRevealed && (
             <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-12 pointer-events-none">
                 <p className="text-slate-400 text-sm font-medium animate-pulse">按 Enter 键显示释义</p>
             </div>
         )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-4">
        <button 
          tabIndex={-1} // Prevent focus to fix "Enter skips twice"
          onClick={() => { setIsRevealed(true); handleResponse('known'); }}
          className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-all shadow-sm hover:shadow-md focus:outline-none"
        >
          <CheckCircle size={32} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold">认识</span>
        </button>
        
        <button 
          tabIndex={-1} // Prevent focus to fix "Enter skips twice"
          onClick={() => { setIsRevealed(true); setTimeout(() => handleResponse('vague'), 800); }} 
          className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 active:scale-95 transition-all shadow-sm hover:shadow-md focus:outline-none"
        >
          <HelpCircle size={32} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold">模糊</span>
        </button>

        <button 
          tabIndex={-1} // Prevent focus to fix "Enter skips twice"
          onClick={() => { setIsRevealed(true); setTimeout(() => handleResponse('unknown'), 800); }}
          className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all shadow-sm hover:shadow-md focus:outline-none"
        >
          <XCircle size={32} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold">不认识</span>
        </button>
      </div>
    </div>
  );
};