import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Trash2, PlayCircle, BarChart2, Mic, Book } from 'lucide-react';
import { ErrorRecord, Word } from '../types';

interface ErrorLogProps {
  errors: ErrorRecord[];
  onBack: () => void;
  onReview: (words: Word[], mode: 'study' | 'dictation') => void;
  onClear: () => void;
}

export const ErrorLog: React.FC<ErrorLogProps> = ({ errors, onBack, onReview, onClear }) => {
  const [filter, setFilter] = useState<'all' | 'learning' | 'dictation'>('all');
  const [showModeSelect, setShowModeSelect] = useState(false);

  const filteredErrors = useMemo(() => {
    if (filter === 'all') return errors;
    return errors.filter(e => e.type === filter);
  }, [errors, filter]);

  // Group by Date
  const groupedErrors = useMemo(() => {
    const groups: { [key: string]: ErrorRecord[] } = {};
    filteredErrors.forEach(err => {
      if (!groups[err.date]) groups[err.date] = [];
      groups[err.date].push(err);
    });
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredErrors]);

  const accuracy = useMemo(() => {
      return filteredErrors.length;
  }, [filteredErrors]);

  const handleStartReviewClick = () => {
    setShowModeSelect(true);
  };

  const confirmReview = (mode: 'study' | 'dictation') => {
    // Convert errors back to Words
    const reviewWords: Word[] = filteredErrors.map(e => ({
        id: e.wordId,
        text: e.wordText,
        definition: e.wordDefinition,
        phonetic: e.wordPhonetic
    }));
    // Remove duplicates
    const uniqueWords = Array.from(new Map(reviewWords.map(item => [item.id, item])).values());
    onReview(uniqueWords, mode);
    setShowModeSelect(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-slate-600 hover:text-primary transition-colors">
            <ArrowLeft size={20} className="mr-1" />
            返回
          </button>
          <h1 className="text-xl font-bold text-slate-800">错词本</h1>
          <button onClick={onClear} className="text-rose-500 text-sm hover:underline">清空记录</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Stats & Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-rose-50 rounded-full text-rose-500">
                 <BarChart2 size={24} />
               </div>
               <div>
                 <p className="text-slate-500 text-sm">当前筛选错误总数</p>
                 <p className="text-3xl font-bold text-slate-800">{accuracy}</p>
               </div>
            </div>

            <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                {(['all', 'learning', 'dictation'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {f === 'all' ? '全部' : f === 'learning' ? '背诵' : '听写'}
                    </button>
                ))}
            </div>

            <button 
                onClick={handleStartReviewClick}
                disabled={filteredErrors.length === 0}
                className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
            >
                <PlayCircle size={20} />
                <span>复习错词</span>
            </button>
          </div>

          {/* List */}
          {groupedErrors.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
               <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
               <p>太棒了！没有错词记录。</p>
            </div>
          ) : (
             <div className="space-y-8">
                {groupedErrors.map(([date, records]) => (
                    <div key={date}>
                        <div className="flex items-center mb-4">
                             <div className="w-2 h-2 rounded-full bg-slate-300 mr-2"></div>
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {records.map((record, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-primary/30 transition-colors shadow-sm flex justify-between items-start group">
                                    <div>
                                        <div className="flex items-baseline space-x-2">
                                            <h4 className="text-lg font-bold text-slate-800">{record.wordText}</h4>
                                            <span className="text-xs text-slate-400 font-mono">{record.wordPhonetic}</span>
                                        </div>
                                        <p className="text-slate-600 mt-1 text-sm">{record.wordDefinition}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${record.type === 'learning' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                                        {record.type === 'learning' ? '背诵' : '听写'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
             </div>
          )}
        </div>
      </div>

      {/* Mode Select Modal */}
      {showModeSelect && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-scale-in">
            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">选择复习模式</h3>
            <div className="space-y-4">
               <button 
                 onClick={() => confirmReview('study')}
                 className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors group"
               >
                 <div className="flex items-center space-x-3">
                   <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm"><Book size={20}/></div>
                   <span className="font-bold text-indigo-900">背诵模式</span>
                 </div>
                 <ArrowLeft size={16} className="rotate-180 text-indigo-300 group-hover:text-indigo-500 transition-colors"/>
               </button>

               <button 
                 onClick={() => confirmReview('dictation')}
                 className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors group"
               >
                 <div className="flex items-center space-x-3">
                   <div className="p-2 bg-white rounded-lg text-emerald-500 shadow-sm"><Mic size={20}/></div>
                   <span className="font-bold text-emerald-900">听写模式</span>
                 </div>
                 <ArrowLeft size={16} className="rotate-180 text-emerald-300 group-hover:text-emerald-500 transition-colors"/>
               </button>
            </div>
            <button 
              onClick={() => setShowModeSelect(false)}
              className="mt-6 w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};