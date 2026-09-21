import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, FileText, Loader2, RefreshCcw, AlertTriangle, File } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => Promise<void>;
  isProcessing: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  fileName?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isProcessing, hasError, onRetry, fileName }) => {
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  // Manage simulated progress bar
  useEffect(() => {
    let interval: number;
    if (isProcessing) {
      setProgress(0);
      interval = window.setInterval(() => {
        setProgress((prev) => {
          // Algorithm: Move fast initially, then slow down as it approaches 95%
          if (prev >= 95) return 95;
          const remaining = 95 - prev;
          // Step size is proportional to remaining distance (Zeno's paradox-like)
          const step = Math.max(0.5, remaining / 20); 
          return prev + step;
        });
      }, 200); // Update every 200ms
    } else {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        onFileSelected(file);
      } else {
        alert("Vui lòng chỉ chọn file PDF.");
      }
    }
  }, [onFileSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 transform hover:scale-[1.01] transition-transform duration-300">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
        ${dragActive 
            ? "border-blue-500 bg-blue-50/50 scale-[1.02] shadow-xl" 
            : (hasError 
                ? "border-red-300 bg-red-50/30 hover:bg-red-50/50 hover:border-red-400" 
                : "border-gray-300 bg-white/60 backdrop-blur-sm hover:bg-white/80 hover:border-blue-400 hover:shadow-lg")
        }
        ${isProcessing ? "opacity-90 cursor-not-allowed bg-gray-50/80" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={isProcessing ? undefined : handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-0"
          onChange={handleChange}
          accept="application/pdf"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center w-full px-12 relative z-10 pointer-events-none">
          {isProcessing ? (
            <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
              <div className="relative mb-6">
                 <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl animate-pulse"></div>
                 <Loader2 className="relative w-14 h-14 text-blue-600 animate-spin drop-shadow-sm" />
              </div>
              <p className="mb-1 text-lg text-gray-800 font-bold tracking-tight">Đang phân tích dữ liệu...</p>
              
              {fileName && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg mb-4 max-w-[90%]">
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-800 truncate">{fileName}</span>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-4">Vui lòng đợi trong giây lát</p>
              
              {/* Progress Bar */}
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-3 mt-1 overflow-hidden shadow-inner border border-gray-200">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  style={{ width: `${Math.round(progress)}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 mt-2 font-bold font-mono bg-blue-50 px-2 py-0.5 rounded-md">{Math.round(progress)}%</p>
            </div>
          ) : (
            <>
              {hasError ? (
                 <div className="p-4 bg-red-100 rounded-full mb-4 animate-in zoom-in duration-300">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                 </div>
              ) : (
                 <div className={`p-5 rounded-full mb-5 transition-all duration-300 ${dragActive ? "bg-blue-100 shadow-blue-200 shadow-lg scale-110" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100 shadow-sm"}`}>
                    <UploadCloud className={`w-12 h-12 transition-colors ${dragActive ? "text-blue-600" : "text-blue-500"}`} />
                 </div>
              )}
              
              <p className="mb-3 text-xl text-gray-700 font-semibold">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold hover:underline decoration-blue-200 underline-offset-4 transition-all">Chọn file PDF</span> hoặc kéo thả vào đây
              </p>
              <p className="text-sm text-gray-500 mb-2 font-medium bg-gray-100 px-3 py-1 rounded-full">Hỗ trợ định dạng .PDF</p>

              {hasError && fileName && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-lg mt-2 mb-4 animate-in slide-in-from-top-2">
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-xs font-semibold text-red-800 truncate max-w-[200px]">{fileName}</span>
                </div>
              )}

              {hasError && onRetry && (
                  <button
                    onClick={(e) => {
                        e.stopPropagation(); 
                        e.preventDefault(); 
                        onRetry();
                    }}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 hover:text-red-700 hover:shadow-md transition-all font-bold pointer-events-auto z-20"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Thử lại file này
                  </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;