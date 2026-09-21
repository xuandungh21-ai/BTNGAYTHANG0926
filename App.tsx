import React, { useState } from 'react';
import XLSX from 'xlsx';
import { FileDown, AlertCircle, ClipboardCopy, Check, Palette, Calendar, RefreshCcw, Trash2, X, Sparkles, BrainCircuit, Zap, Type } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ResultTable from './components/ResultTable';
import { extractPdfData } from './services/geminiService';
import { transformData, formatDateRange } from './utils/formatters';
import { ProcessedRecord, ProcessingStatus, DateFormatType } from './types';

const App: React.FC = () => {
  const [records, setRecords] = useState<ProcessedRecord[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [bgColor, setBgColor] = useState('#f8fafc');
  const [textColor, setTextColor] = useState('#0f172a'); // Default slate-900
  const [dateFormat, setDateFormat] = useState<DateFormatType>('quoted');
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileProcessing = async (file: File) => {
    setLastFile(file);
    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    
    try {
      // Step 1: Extract Data using Gemini
      const extractedList = await extractPdfData(file);

      // Step 2: Transform Data according to format rules
      const newRecords = extractedList.map(raw => transformData(file.name, raw, dateFormat));

      setRecords(prev => [...prev, ...newRecords]);
      setStatus(ProcessingStatus.SUCCESS);
      setLastFile(null); // Clear retry file on success
    } catch (error: any) {
      console.error(error);
      let message = "Có lỗi xảy ra khi xử lý file.";

      // Map specific error codes from service to user-friendly messages
      switch (error.message) {
        case "SERVICE_UNAVAILABLE":
          message = "Máy chủ AI hiện đang chịu tải cao tạm thời (503 Service Unavailable). Hệ thống đã thử lại nhưng chưa thành công. Vui lòng đợi vài giây và bấm 'Thử lại file này'.";
          break;
        case "QUOTA_EXHAUSTED":
          message = "Lỗi giới hạn: Bạn đã sử dụng hết hạn mức (quota) của API Gemini. Vui lòng đợi một lát hoặc thử lại sau.";
          break;
        case "API_KEY_ERROR":
          message = "Lỗi xác thực: API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra cấu hình.";
          break;
        case "INVALID_JSON_FORMAT":
          message = "Lỗi định dạng: AI không thể trích xuất dữ liệu có cấu trúc từ file này. Nguyên nhân có thể do file bị mờ, scan lệch hoặc không chứa thông tin hồ sơ.";
          break;
        case "EMPTY_RESPONSE":
          message = "Lỗi phản hồi: AI không trả về dữ liệu nào.";
          break;
        case "FAILED_TO_READ_FILE":
          message = "Lỗi trình duyệt: Không thể đọc file này. Vui lòng thử lại.";
          break;
        case "NETWORK_ERROR":
          message = "Lỗi kết nối mạng hoặc file quá lớn. Vui lòng kiểm tra internet hoặc thử nén file nhỏ hơn.";
          break;
        case "BAD_REQUEST":
          message = "Yêu cầu không hợp lệ. File có thể bị hỏng.";
          break;
        default:
          if (error.message?.includes("Network")) {
            message = "Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền internet.";
          } else if (error.message) {
            let cleanMsg = error.message;
            try {
              if (cleanMsg.includes("{")) {
                const jsonMatch = cleanMsg.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed?.error?.message) {
                    cleanMsg = parsed.error.message;
                  }
                }
              }
            } catch {
              // keep as is
            }
            message = `Lỗi hệ thống: ${cleanMsg}`;
          } else {
            message = "Lỗi hệ thống không xác định. Vui lòng thử lại sau.";
          }
      }
      
      setErrorMsg(message);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleRetry = () => {
    if (lastFile) {
      handleFileProcessing(lastFile);
    }
  };

  const handleRemoveRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleClearAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmClear = () => {
    setRecords([]);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
    setLastFile(null);
    setShowDeleteConfirm(false);
  };

  const handleDateFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFormat = e.target.value as DateFormatType;
    setDateFormat(newFormat);
    // Update existing records to reflect the new format
    setRecords(prev => prev.map(record => ({
      ...record,
      formattedDateRange: formatDateRange(record.rawDateStart, record.rawDateEnd, newFormat)
    })));
  };

  const handleCopyData = async () => {
    if (records.length === 0) return;

    // Create a string with Hồ sơ số, Date Range and Page Count
    const textData = records.map(r => 
      `${r.hoSoSo}\t${r.formattedDateRange}\t${r.formattedPageCount}`
    ).join('\n');

    try {
      await navigator.clipboard.writeText(textData);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      alert("Không thể sao chép vào bộ nhớ tạm.");
    }
  };

  const handleExportExcel = () => {
    if (records.length === 0) return;

    // Map data to the exact columns requested for Excel
    const excelData = records.map((r, index) => ({
      "STT": index + 1,
      "Tên File": r.fileName,
      "Hồ sơ số": r.hoSoSo,
      "Ngày bắt đầu - Ngày kết thúc": r.formattedDateRange,
      "Số trang": r.formattedPageCount
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const cellStyle = {
      font: {
        name: "Times New Roman",
        sz: 14,
        color: { rgb: "000000" }
      },
      alignment: {
        vertical: "center",
        wrapText: true
      },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellRef]) continue;
        worksheet[cellRef].s = cellStyle;
      }
    }
    
    const wscols = [
      { wch: 8 },  // STT
      { wch: 40 }, // FileName
      { wch: 25 }, // HoSoSo
      { wch: 45 }, // Date Range
      { wch: 15 }  // Page Count
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DuLieuBocTach");

    const now = new Date();
    const timestamp = `${now.getDate()}${now.getMonth()+1}${now.getFullYear()}_${now.getHours()}${now.getMinutes()}`;
    XLSX.writeFile(workbook, `BocTachPDF_${timestamp}.xlsx`);
  };

  return (
    <div 
      className="min-h-screen pb-20 transition-all duration-500 ease-in-out relative overflow-hidden"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div 
          className="absolute inset-0 opacity-[0.3]"
          style={{ 
            backgroundImage: `radial-gradient(${textColor === '#ffffff' ? '#ffffff' : '#64748b'} 1px, transparent 1px)`, 
            backgroundSize: '32px 32px' 
          }}
        ></div>
      </div>

      <header className="glass sticky top-0 z-30 transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-1.5 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-800 tracking-tight hidden sm:block">PDF Extractor Pro</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/50 border border-gray-300 rounded-lg px-2 py-1.5 hover:bg-white hover:border-blue-300 transition-all shadow-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select 
                value={dateFormat}
                onChange={handleDateFormatChange}
                className="bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer"
                title="Định dạng ngày tháng"
              >
                <option value="quoted">'DD/MM - DD/MM (Excel)</option>
                <option value="plain">DD/MM - DD/MM</option>
                <option value="startOnly">DD/MM (Chỉ ngày đầu)</option>
                <option value="iso">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white/50 border border-gray-300 rounded-full px-2 py-1 shadow-sm">
              <div className="relative flex items-center group cursor-pointer" title="Chọn màu chữ">
                 <input
                   type="color"
                   id="textColorPicker"
                   value={textColor}
                   onChange={(e) => setTextColor(e.target.value)}
                   className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer z-20"
                 />
                 <div className="p-1.5 rounded-full hover:bg-white transition-all group-hover:scale-110">
                   <Type className="w-4 h-4 text-gray-600" />
                 </div>
              </div>
              
              <div className="w-px h-4 bg-gray-300"></div>

              <div className="relative flex items-center group cursor-pointer" title="Chọn màu nền">
                 <input
                   type="color"
                   id="bgColorPicker"
                   value={bgColor}
                   onChange={(e) => setBgColor(e.target.value)}
                   className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer z-20"
                 />
                 <div className="p-1.5 rounded-full hover:bg-white transition-all group-hover:scale-110">
                   <Palette className="w-4 h-4 text-gray-600" />
                 </div>
              </div>
            </div>

            {records.length > 0 && (
              <>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:-translate-y-0.5 transition-all font-medium shadow-sm text-sm"
                  title="Xóa tất cả kết quả"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Xóa</span>
                </button>
                <button
                  onClick={handleCopyData}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium shadow-sm border text-sm hover:-translate-y-0.5 ${
                    isCopied 
                      ? "bg-blue-50 text-blue-700 border-blue-200" 
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-300"
                  }`}
                  title="Sao chép Hồ sơ, Thời gian và Số trang"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isCopied ? "Đã chép" : "Sao chép"}</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 hover:shadow-green-200 hover:-translate-y-0.5 hover:shadow-lg transition-all font-medium text-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-8 shadow-2xl mb-12 text-white animate-in slide-in-from-top-4 duration-700 animate-gradient-xy">
           <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white opacity-20 blur-3xl animate-pulse"></div>
           <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-blue-300 opacity-20 blur-3xl"></div>
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide uppercase shadow-lg hover:bg-white/20 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    Powered by Google Gemini 3.0 Pro
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white drop-shadow-md">
                    Bóc tách dữ liệu <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">siêu tốc</span>
                  </h2>
                  <p className="text-blue-50 max-w-xl text-lg font-light leading-relaxed">
                    Hệ thống AI tự động nhận diện và trích xuất thông tin chính xác từ văn bản hành chính chỉ trong tích tắc.
                  </p>
              </div>
              
              <div className="hidden md:flex relative group items-center justify-center p-4">
                 <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-700 animate-pulse"></div>
                 <div className="relative bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl group-hover:scale-105 transition-transform duration-300 animate-float">
                    <BrainCircuit className="w-20 h-20 text-white drop-shadow-xl" />
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-white/30">
                      <Zap className="w-3 h-3 fill-current" />
                      AI PRO
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="animate-in slide-in-from-bottom-4 duration-700 delay-100">
          <FileUpload 
            onFileSelected={handleFileProcessing} 
            isProcessing={status === ProcessingStatus.PROCESSING}
            hasError={!!errorMsg}
            onRetry={handleRetry}
            fileName={lastFile?.name}
          />
        </div>

        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-700 shadow-lg animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              </div>
              <div>
                <p className="font-bold">Xử lý thất bại</p>
                <p className="text-sm mt-1 text-red-600 opacity-90 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
            {lastFile && (
              <button 
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-bold text-red-700 hover:bg-red-50 transition-colors shadow-sm whitespace-nowrap hover:shadow-md"
              >
                <RefreshCcw className="w-4 h-4" />
                Thử lại
              </button>
            )}
          </div>
        )}

        {records.length > 0 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
            <ResultTable data={records} onRemove={handleRemoveRecord} textColor={textColor} />
          </div>
        )}

        {records.length === 0 && status !== ProcessingStatus.PROCESSING && !errorMsg && (
          <div className="text-center mt-8 opacity-60 grayscale-[0.5] hover:grayscale-0 transition-all duration-500 animate-in fade-in duration-700 delay-200">
             <div className="relative inline-block group cursor-default">
               <div className="absolute -inset-6 bg-blue-100 rounded-full blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
               <img 
                 src="https://cdn-icons-png.flaticon.com/512/337/337946.png" 
                 alt="Spreadsheet placeholder" 
                 className="w-24 h-24 mx-auto mb-4 relative z-10 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300"
               />
             </div>
             <p className="font-medium text-lg mt-2" style={{ color: textColor === '#ffffff' ? '#e2e8f0' : '#64748b' }}>Chưa có dữ liệu. Hãy tải file lên để bắt đầu.</p>
          </div>
        )}
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 scale-100 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-red-600">
                      <div className="p-3 bg-red-50 rounded-full border border-red-100">
                          <AlertCircle className="w-6 h-6" /> 
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Xác nhận xóa</h3>
                  </div>
                  <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-gray-600 mb-8 leading-relaxed">
                    Bạn có chắc chắn muốn xóa toàn bộ <strong>{records.length}</strong> bản ghi đã bóc tách không?<br/>
                    <span className="text-sm text-gray-500">Hành động này không thể hoàn tác.</span>
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-medium transition-colors shadow-sm"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={confirmClear}
                        className="px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Xóa tất cả
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;