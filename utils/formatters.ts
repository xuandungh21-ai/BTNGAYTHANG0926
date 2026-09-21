
import { ExtractedData, ProcessedRecord, DateFormatType } from "../types";

/**
 * Formats a number to have a leading single quote without any leading zeros padding (e.g., 5 -> "'5").
 */
export const padNumber = (num: string | number | undefined): string => {
  if (num === undefined || num === null || num === '') return "'0";
  
  // Strip any existing quote to be safe
  const cleanNum = String(num).replace(/'/g, '').trim();
  const n = parseInt(cleanNum, 10);
  if (isNaN(n)) return "'0";
  
  // Return with a single quote prefix
  // If n is between 1 and 9 (inclusive), pad with leading zero
  if (n >= 1 && n <= 9) {
    return `'${String(n).padStart(2, '0')}`;
  }
  return `'${n}`;
};

/**
 * Formats the date range based on configuration.
 */
export const formatDateRange = (start: string, end: string, format: DateFormatType = 'quoted'): string => {
  // Helper to ensure DD/MM/YYYY format with specific month rules:
  // - Months 1-3: padded with leading zero (e.g., 01, 02, 03)
  // - Months 4-12: no leading zero (e.g., 4, 5, ..., 12)
  const normalizeDate = (d: string): string => {
    if (!d) return "Unknown";
    const parts = d.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const rawMonth = parts[1];
      const mVal = parseInt(rawMonth, 10);
      let month = rawMonth;
      if (!isNaN(mVal)) {
        if (mVal >= 1 && mVal <= 3) {
          month = String(mVal).padStart(2, '0');
        } else if (mVal >= 4 && mVal <= 12) {
          month = String(mVal);
        }
      }
      const year = parts[2];
      return `${day}/${month}/${year}`;
    }
    return d;
  };

  const toISO = (d: string): string => {
    const parts = d.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return d;
  };

  const s = normalizeDate(start);
  const hasEnd = end && end.trim() !== "" && end !== "Unknown";
  const e = hasEnd ? normalizeDate(end) : "";

  switch (format) {
    case 'quoted':
      return hasEnd ? `'${s} - ${e}` : `'${s}`;
    case 'plain':
      return hasEnd ? `${s} - ${e}` : s;
    case 'startOnly':
      return s;
    case 'iso':
      return hasEnd ? `${toISO(s)} - ${toISO(e)}` : toISO(s);
    default:
      return hasEnd ? `'${s} - ${e}` : `'${s}`;
  }
};

export const transformData = (fileName: string, raw: ExtractedData, format: DateFormatType = 'quoted'): ProcessedRecord => {
  return {
    id: crypto.randomUUID(),
    fileName,
    hoSoSo: raw.hoSoSo || "N/A",
    rawDateStart: raw.ngayBatDau,
    rawDateEnd: raw.ngayKetThuc,
    formattedDateRange: formatDateRange(raw.ngayBatDau, raw.ngayKetThuc, format),
    formattedPageCount: padNumber(raw.soTrang),
  };
};
