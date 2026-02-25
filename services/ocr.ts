/**
 * Receipt OCR Service
 *
 * OCR requires react-native-mlkit-ocr which is not currently installed.
 * This stub returns empty data until the package is added.
 */

export interface ReceiptData {
  amount: number | null;
  date: string | null;
  merchant: string | null;
}

export function isOCRAvailable(): boolean {
  return false;
}

export async function extractReceiptData(_imageUri: string): Promise<ReceiptData> {
  return { amount: null, date: null, merchant: null };
}
