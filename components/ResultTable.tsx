import React from 'react';
import { ProcessedRecord } from '../types';
import { Trash2, FileCheck } from 'lucide-react';

interface ResultTableProps {
  data: ProcessedRecord[];
  onRemove: (id: string) => void;
  textColor: string;
}

const ResultTable: React.FC<ResultTableProps> = ({ data, onRemove, textColor }) => {
  if (data.length === 0) return null;

  // Inline styles to strictly enforce the user's requirements
  const tableStyle: React.CSSProperties = {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '14pt', // Matches "Size 14" requirement
    color: textColor, // Use the selected text color
    borderCollapse: 'collapse',
    width: '100%',
  };

  const cellStyle: React.CSSProperties = {
    border: `1px solid ${textColor}`, // Border color follows text color for consistency
    padding: '8px 12px',
    verticalAlign: 'middle',
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.05)', // Transparent black for slight darkening regardless of bg
    textAlign: 'center',
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white/80 backdrop-blur-sm shadow-lg p-6 rounded-lg my-6 border border-gray-200">
      <div className="mb-4 flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: '"Times New Roman", Times, serif', color: textColor }}>
          <FileCheck className="w-6 h-6 text-green-600" />
          Kết quả bóc tách ({data.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: '60px' }}>STT</th>
              <th style={{ ...headerCellStyle, textAlign: 'left' }}>Hồ sơ số</th>
              <th style={{ ...headerCellStyle, width: '250px' }}>Thời gian</th>
              <th style={{ ...headerCellStyle, width: '120px' }}>Số trang</th>
              <th style={{ ...headerCellStyle, width: '80px' }}>Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  {index + 1}
                </td>
                <td style={cellStyle}>
                  {item.hoSoSo}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  {item.formattedDateRange}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  {item.formattedPageCount}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                    title="Xóa dòng này"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultTable;