import React, { useState, useEffect, useMemo } from 'react';
import { Book, Mic, Upload as UploadIcon, AlertOctagon, Settings as SettingsIcon, Layout, ChevronRight, FileText, X, History } from 'lucide-react';
import { WordBook, AppView, Settings, ErrorRecord, Word, HistoryRecord } from './types';
import { FileUpload } from './components/FileUpload';
import { StudyMode } from './components/StudyMode';
import { DictationMode } from './components/DictationMode';
import { ErrorLog } from './components/ErrorLog';
import { HistoryView } from './components/HistoryView';

const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 20,
  dictationSpeed: 1.0,
};

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [books, setBooks] = useState<WordBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  
  // Temporary state for review mode
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [isReviewingErrors, setIsReviewingErrors] = useState(false);

  // Persistence
  useEffect(() => {
    const savedBooks = localStorage.getItem('zenvocab_books');
    const savedErrors = localStorage.getItem('zenvocab_errors');
    const savedSettings = localStorage.getItem('zenvocab_settings');
    const savedHistory = localStorage.getItem('zenvocab_history');

    if (savedBooks) {
        // Migration: Ensure learnedWordIds exists
        const parsedBooks = JSON.parse(savedBooks);
        const migratedBooks = parsedBooks.map((b: any) => ({
            ...b,
            learnedWordIds: b.learnedWordIds || []
        }));
        setBooks(migratedBooks);
    }
    if (savedErrors) setErrors(JSON.parse(savedErrors));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('zenvocab_books', JSON.stringify(books));
    localStorage.setItem('zenvocab_errors', JSON.stringify(errors));
    localStorage.setItem('zenvocab_settings', JSON.stringify(settings));
    localStorage.setItem('zenvocab_history', JSON.stringify(history));
  }, [books, errors, settings, history]);

  const activeBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);
  
  // Progress calculation
  const activeBookProgress = useMemo(() => {
    if (!activeBook || activeBook.words.length === 0) return 0;
    return Math.round((activeBook.learnedWordIds.length / activeBook.words.length) * 100);
  }, [activeBook]);

  // Update book progress when words are learned
  const updateLearnedWords = (learnedIds: string[]) => {
    if (!selectedBookId || learnedIds.length === 0) return;
    
    setBooks(prevBooks => prevBooks.map(book => {
        if (book.id === selectedBookId) {
            // Merge existing and new, remove duplicates
            const updatedLearned = Array.from(new Set([...book.learnedWordIds, ...learnedIds]));
            return { ...book, learnedWordIds: updatedLearned };
        }
        return book;
    }));
  };

  const handleStudyComplete = (result: { reviewedCount: number; errors: ErrorRecord[]; learnedIds: string[] }) => {
    // Save to Error Log
    setErrors(prev => [...prev, ...result.errors]);
    // Save to Learned Progress
    updateLearnedWords(result.learnedIds);

    // Save History
    if (activeBook || isReviewingErrors) {
        const accuracy = result.reviewedCount > 0 
            ? Math.round(((result.reviewedCount - result.errors.length) / result.reviewedCount) * 100) 
            : 0;

        const newRecord: HistoryRecord = {
            id: crypto.randomUUID(),
            date: Date.now(),
            type: 'study',
            bookName: isReviewingErrors ? '错词本复习' : activeBook?.name || '未知',
            totalWords: result.reviewedCount,
            accuracy: Math.max(0, accuracy)
        };
        setHistory(prev => [newRecord, ...prev]);
    }

    alert(`恭喜！完成了 ${result.reviewedCount} 个单词的学习。本次掌握 ${result.learnedIds.length} 个新单词，正确率 ${Math.round(((result.reviewedCount - result.errors.length) / result.reviewedCount) * 100)}%。`);
    setIsReviewingErrors(false);
    setView('home');
  };

  const handleDictationComplete = (result: { totalCount: number; errors: ErrorRecord[]; learnedIds: string[] }) => {
    setErrors(prev => [...prev, ...result.errors]);
    updateLearnedWords(result.learnedIds);

    // Save History
    if (activeBook || isReviewingErrors) {
        const accuracy = result.totalCount > 0 
            ? Math.round(((result.totalCount - result.errors.length) / result.totalCount) * 100)
            : 0;

        const newRecord: HistoryRecord = {
            id: crypto.randomUUID(),
            date: Date.now(),
            type: 'dictation',
            bookName: isReviewingErrors ? '错词本复习' : activeBook?.name || '未知',
            totalWords: result.totalCount,
            accuracy: Math.max(0, accuracy)
        };
        setHistory(prev => [newRecord, ...prev]);
    }

    const finalAccuracy = result.totalCount > 0 
        ? ((1 - result.errors.length / result.totalCount) * 100).toFixed(0) 
        : "0";
        
    alert(`听写结束！正确率 ${finalAccuracy}%。`);
    setIsReviewingErrors(false);
    setView('home');
  };

  const startErrorReview = (words: Word[], mode: 'study' | 'dictation') => {
     setReviewWords(words);
     setIsReviewingErrors(true);
     if (mode === 'study') {
         setView('study-active');
     } else {
         setView('dictation-active');
     }
  };

  // Get words for session (excluding learned ones unless in review mode)
  const getSessionWords = () => {
      if (isReviewingErrors) return reviewWords;
      if (!activeBook) return [];
      
      return activeBook.words.filter(w => !activeBook.learnedWordIds.includes(w.id));
  };

  /* ----- VIEW RENDERING ----- */

  if (view === 'upload') {
    return (
      <FileUpload 
        onBooksAdded={(newBooks) => {
          setBooks(prev => [...prev, ...newBooks]);
          setView('home');
        }} 
        onBack={() => setView('home')} 
      />
    );
  }

  if (view === 'study-active') {
    const wordsToStudy = getSessionWords();
    
    if (wordsToStudy.length === 0) {
        setTimeout(() => {
            alert("该词书所有单词已学完！");
            setView('home');
        }, 100);
        return null;
    }

    return (
      <StudyMode 
        words={wordsToStudy} 
        targetCount={isReviewingErrors ? wordsToStudy.length : settings.dailyGoal} 
        onComplete={handleStudyComplete}
        onExit={() => { setIsReviewingErrors(false); setView('home'); }}
      />
    );
  }

  if (view === 'dictation-active') {
     const wordsToStudy = getSessionWords();
     
     if (wordsToStudy.length === 0) {
        setTimeout(() => {
            alert("该词书所有单词已学完！");
            setView('home');
        }, 100);
        return null;
    }

     return (
       <DictationMode
         words={wordsToStudy}
         targetCount={isReviewingErrors ? wordsToStudy.length : settings.dailyGoal}
         initialSpeed={settings.dictationSpeed}
         onComplete={handleDictationComplete}
         onExit={() => { setIsReviewingErrors(false); setView('home'); }}
       />
     );
  }

  if (view === 'errors') {
    return (
      <ErrorLog 
        errors={errors} 
        onBack={() => setView('home')} 
        onReview={startErrorReview}
        onClear={() => setErrors([])}
      />
    );
  }

  if (view === 'history') {
      return (
          <HistoryView 
            history={history}
            onBack={() => setView('home')}
            onClear={() => setHistory([])}
          />
      )
  }

  // Home / Dashboard
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Hero Section */}
      <header className="bg-white p-8 pb-12 rounded-b-[3rem] shadow-sm animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
             <div className="flex items-center space-x-3">
               <Layout className="text-primary" size={32} />
               <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ZenVocab</h1>
             </div>
             <div className="text-sm text-slate-400 font-medium">
               今日目标: {settings.dailyGoal} 词
             </div>
          </div>
          
          <h2 className="text-4xl font-extrabold text-slate-800 mb-2">
            Keep Learning.
          </h2>
          <p className="text-slate-500 text-lg mb-8">静心背诵，日积跬步。</p>

          {/* Book Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            {books.length === 0 ? (
               <div className="flex items-center text-slate-400">
                  <FileText className="mr-3" />
                  <span>暂无单词书，请先上传</span>
               </div>
            ) : (
                <div className="flex-1 overflow-x-auto flex space-x-2 pb-1 scrollbar-hide">
                    {books.map(book => (
                        <button 
                          key={book.id}
                          onClick={() => setSelectedBookId(book.id)}
                          className={`
                            relative whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all
                            ${selectedBookId === book.id 
                                ? 'bg-slate-800 text-white shadow-md pl-4 pr-10' // Extra padding for progress text
                                : 'bg-white text-slate-600 hover:bg-slate-200'}
                          `}
                        >
                          {book.name}
                          {selectedBookId === book.id && (
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/60">
                                {Math.round((book.learnedWordIds.length / book.words.length) * 100)}%
                             </span>
                          )}
                        </button>
                    ))}
                </div>
            )}
             <button 
                onClick={() => setView('upload')}
                className="ml-4 p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
             >
               <UploadIcon size={20} />
             </button>
          </div>
          
          {/* Active Book Progress Bar */}
          {activeBook && (
            <div className="mt-6 animate-scale-in">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-700">{activeBook.name} 学习进度</span>
                    <span className="text-sm text-slate-400">{activeBook.learnedWordIds.length} / {activeBook.words.length} 词</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-secondary transition-all duration-700 ease-out"
                        style={{ width: `${activeBookProgress}%` }}
                    />
                </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid Actions */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-8 animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          
          {/* Study Card */}
          <div 
             onClick={() => {
                if (!selectedBookId) return alert('请先选择一本单词书');
                if (!activeBook) return;
                const unlearned = activeBook.words.filter(w => !activeBook.learnedWordIds.includes(w.id));
                if (unlearned.length === 0) return alert('恭喜！该书所有单词已学完。');
                
                setView('study-active');
             }}
             className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
             <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
               <Book size={28} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">背单词</h3>
             <p className="text-slate-400 text-sm mb-4">智能记忆曲线，模糊词汇自动重现。</p>
             <div className="flex items-center text-indigo-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
               <span>开始背诵</span>
               <ChevronRight size={16} />
             </div>
          </div>

           {/* Dictation Card */}
           <div 
             onClick={() => {
                if (!selectedBookId) return alert('请先选择一本单词书');
                if (!activeBook) return;
                const unlearned = activeBook.words.filter(w => !activeBook.learnedWordIds.includes(w.id));
                if (unlearned.length === 0) return alert('恭喜！该书所有单词已学完。');

                setView('dictation-active');
             }}
             className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
             <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
               <Mic size={28} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">听写模式</h3>
             <p className="text-slate-400 text-sm mb-4">听音辨词，强化拼写记忆。</p>
             <div className="flex items-center text-emerald-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
               <span>开始听写</span>
               <ChevronRight size={16} />
             </div>
          </div>

           {/* Errors Card */}
           <div 
             onClick={() => setView('errors')}
             className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
             <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform">
               <AlertOctagon size={28} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">错词本</h3>
             <p className="text-slate-400 text-sm mb-4">共积累 {errors.length} 个错词，点击复习。</p>
             <div className="flex items-center text-rose-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
               <span>查看记录</span>
               <ChevronRight size={16} />
             </div>
          </div>

           {/* History Card */}
           <div 
             onClick={() => setView('history')}
             className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
             <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
               <History size={28} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">学习历史</h3>
             <p className="text-slate-400 text-sm mb-4">查看背诵与听写的历史记录及正确率。</p>
             <div className="flex items-center text-amber-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
               <span>查看历史</span>
               <ChevronRight size={16} />
             </div>
          </div>

        </div>

        {/* Quick Settings */}
        <div className="mt-12 bg-white rounded-3xl p-6 border border-slate-100">
           <div className="flex items-center space-x-2 text-slate-800 mb-6">
              <SettingsIcon size={20} />
              <h3 className="font-bold text-lg">学习设置</h3>
           </div>
           
           <div className="space-y-6">
              <div>
                 <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-sm">每日背诵/听写目标 (词)</span>
                    <span className="font-bold text-slate-800">{settings.dailyGoal}</span>
                 </div>
                 <div className="flex items-center space-x-4">
                    <input 
                        type="range" 
                        min="5" max="100" step="5" 
                        value={settings.dailyGoal}
                        onChange={(e) => setSettings({...settings, dailyGoal: parseInt(e.target.value)})}
                        className="flex-1 accent-primary h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <input 
                        type="number" 
                        value={settings.dailyGoal}
                        onChange={(e) => setSettings({...settings, dailyGoal: parseInt(e.target.value)})}
                        className="w-20 p-2 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-primary outline-none"
                    />
                 </div>
              </div>

               <div>
                 <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-sm">默认朗读速度</span>
                    <span className="font-bold text-slate-800">{settings.dictationSpeed}x</span>
                 </div>
                 <input 
                    type="range" 
                    min="0.5" max="2.0" step="0.1" 
                    value={settings.dictationSpeed}
                    onChange={(e) => setSettings({...settings, dictationSpeed: parseFloat(e.target.value)})}
                    className="w-full accent-emerald-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                 />
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}