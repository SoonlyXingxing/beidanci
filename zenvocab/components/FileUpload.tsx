import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, FileType } from 'lucide-react';
import { parseVocabularyFile } from '../services/geminiService';
import { WordBook } from '../types';

// Declare mammoth global from CDN
declare const mammoth: any;

interface FileUploadProps {
  onBooksAdded: (books: WordBook[]) => void;
  onBack: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onBooksAdded, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<{ content: string; mimeType: string; isBase64: boolean }> => {
    return new Promise((resolve, reject) => {
      // 10MB Limit
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error(`文件 ${file.name} 过大 (超过 10MB)`));
        return;
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // Handle Word Documents (.docx) using Mammoth
      if (fileExtension === 'docx') {
        const reader = new FileReader();
        reader.onload = function(event) {
          const arrayBuffer = event.target?.result;
          mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then((result: any) => {
              resolve({
                content: result.value, // The raw text
                mimeType: 'text/plain',
                isBase64: false
              });
            })
            .catch((err: any) => reject(new Error(`Word文档解析失败: ${err.message}`)));
        };
        reader.onerror = () => reject(new Error("读取文件失败"));
        reader.readAsArrayBuffer(file);
        return;
      }

      // Handle Text Files
      const textTypes = ['text/plain', 'text/csv', 'text/markdown', 'application/json', 'text/tab-separated-values'];
      const isText = textTypes.includes(file.type) || ['txt', 'md', 'csv', 'json'].includes(fileExtension || '');

      const reader = new FileReader();

      reader.onload = () => {
        if (isText) {
          resolve({
            content: reader.result as string,
            mimeType: 'text/plain',
            isBase64: false
          });
        } else {
          // For binary files (PDF, Images), we send base64
          const result = reader.result as string;
          // Remove "data:*/*;base64," prefix
          const base64 = result.split(',')[1];
          resolve({
            content: base64,
            mimeType: file.type || 'application/octet-stream',
            isBase64: true
          });
        }
      };

      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);
    setError(null);
    const newBooks: WordBook[] = [];
    const errorMessages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        setCurrentFileName(file.name);
        
        try {
          const { content, mimeType, isBase64 } = await readFile(file);
          const words = await parseVocabularyFile(file.name, content, mimeType, isBase64);
          
          if (words.length > 0) {
              newBooks.push({
                  id: crypto.randomUUID(),
                  name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
                  words: words,
                  learnedWordIds: [], // Initialize learned words
                  createdAt: Date.now()
              });
          } else {
             errorMessages.push(`文件 ${file.name} 中未发现单词。`);
          }
        } catch (err: any) {
          console.error(`Error processing ${file.name}:`, err);
          errorMessages.push(`解析 ${file.name} 失败: ${err.message || '未知错误'}`);
        }
      }

      if (newBooks.length === 0) {
          setError(errorMessages.length > 0 ? errorMessages.join(' ') : "未能从文件中识别出任何单词，请检查文件内容是否清晰。");
      } else {
          if (errorMessages.length > 0) {
            alert(`部分文件处理失败:\n${errorMessages.join('\n')}`);
          }
          onBooksAdded(newBooks);
      }
    } catch (err: any) {
      console.error(err);
      setError("处理过程中发生致命错误，请重试。");
    } finally {
      setIsProcessing(false);
      setCurrentFileName('');
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-fade-in bg-slate-50">
      <div className="text-center space-y-2 max-w-2xl">
        <h2 className="text-3xl font-bold text-slate-800">导入单词书</h2>
        <p className="text-slate-500">
          支持 PDF, Word(.docx), TXT, CSV 及图片格式。<br/>
          AI 将自动提取文件中的单词、音标和释义。
        </p>
      </div>

      <div className="w-full max-w-xl">
        <label 
          className={`
            relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-3xl cursor-pointer 
            transition-all duration-300 overflow-hidden
            ${isProcessing ? 'border-primary/30 bg-white cursor-wait' : 'border-slate-300 bg-white hover:border-primary hover:bg-indigo-50/30 shadow-sm hover:shadow-md'}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center z-10">
            {isProcessing ? (
              <div className="flex flex-col items-center w-full">
                <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
                <p className="mb-2 text-lg font-bold text-primary">正在智能解析...</p>
                <p className="text-sm text-slate-500 mb-4 max-w-xs truncate">
                   正在处理: {currentFileName}
                </p>
                {/* Progress Bar */}
                <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-primary transition-all duration-500 ease-out"
                     style={{ width: `${(currentFileIndex / totalFiles) * 100}%` }}
                   />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  文件 {currentFileIndex} / {totalFiles}
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                   <Upload size={32} />
                </div>
                <p className="mb-2 text-xl text-slate-700 font-bold">点击上传 或 拖拽文件</p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                   <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">PDF</span>
                   <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">Word</span>
                   <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">PNG/JPG</span>
                   <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">TXT/CSV</span>
                </div>
              </>
            )}
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            multiple 
            accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </div>

      {error && (
        <div className="flex items-start space-x-3 text-rose-500 bg-rose-50 px-6 py-4 rounded-xl max-w-xl w-full border border-rose-100 shadow-sm animate-fade-in-up">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-800 transition-colors flex items-center space-x-2">
        <span>返回主菜单</span>
      </button>
    </div>
  );
};