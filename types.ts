
export interface ExtractedData {
  hoSoSo: string;
  ngayBatDau: string; // Expected DD/MM/YYYY
  ngayKetThuc: string; // Expected DD/MM/YYYY
  soTrang: string | number;
}

export type DateFormatType = 'quoted' | 'plain' | 'startOnly' | 'iso';

export interface ProcessedRecord {
  id: string;
  fileName: string;
  hoSoSo: string;
  rawDateStart: string;
  rawDateEnd: string;
  formattedDateRange: string; // The specific format: "DD/MM/YYYY - DD/MM/YYYY"
  formattedPageCount: string; // 2 digits: 01, 05, 10
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
