import React from 'react';
import { ArrowLeft, Trash2, Clock, Book, Mic, Calendar } from 'lucide-react';
import { HistoryRecord } from '../types';

interface HistoryViewProps {
  history: HistoryRecord[];
  onBack: () => void;
  onClear: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack, onClear }) => {
  // Sort by date descending
  const sortedHistory = [...history].sort((a, b) => b.date - a.date);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (acc >= 70) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-rose-500 bg-rose-50 border-rose-100';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-slate-600 hover:text-primary transition-colors">
            <ArrowLeft size={20} className="mr-1" />
            返回
          </button>
          <h1 className="text-xl font-bold text-slate-800">学习历史</h1>
          <button onClick={onClear} className="text-rose-500 text-sm hover:underline flex items-center">
            <Trash2 size={16} className="mr-1"/>
            清空
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
               <Clock size={48} className="mx-auto mb-4 opacity-50" />
               <p>暂无学习记录，快去背单词吧！</p>
            </div>
          ) : (
             <div className="space-y-4">
               {sortedHistory.map((record) => (
                 <div key={record.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow animate-fade-in-up">
                    <div className="flex items-center space-x-4">
                       <div className={`p-3 rounded-full ${record.type === 'study' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {record.type === 'study' ? <Book size={20} /> : <Mic size={20} />}
                       </div>
                       <div>
                          <div className="flex items-center space-x-2">
                             <h3 className="font-bold text-slate-800">{record.bookName || '未知词书'}</h3>
                             <span className="text-xs text-slate-400 font-normal px-2 py-0.5 bg-slate-100 rounded-full">
                                {record.type === 'study' ? '背诵' : '听写'}
                             </span>
                          </div>
                          <div className="flex items-center text-slate-400 text-xs mt-1 space-x-3">
                             <div className="flex items-center">
                                <Calendar size={12} className="mr-1"/>
                                {formatDate(record.date)}
                             </div>
                             <span>共 {record.totalWords} 词</span>
                          </div>
                       </div>
                    </div>

                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border ${getAccuracyColor(record.accuracy)}`}>
                        <span className="text-xl font-bold">{record.accuracy}%</span>
                        <span className="text-[10px] opacity-80">正确率</span>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};