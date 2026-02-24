/**
 * Receipt OCR Service
 *
 * Uses react-native-mlkit-ocr if available (dev build),
 * falls back gracefully in Expo Go.
 */

let MlkitOcr: any = null;
let ocrAvailable = false;

try {
  MlkitOcr = require('react-native-mlkit-ocr').default;
  ocrAvailable = true;
} catch {
  // OCR not available in Expo Go
}

export interface ReceiptData {
  amount: number | null;
  date: string | null;
  merchant: string | null;
}

export function isOCRAvailable(): boolean {
  return ocrAvailable;
}

export async function extractReceiptData(imageUri: string): Promise<ReceiptData> {
  if (!ocrAvailable || !MlkitOcr) {
    return { amount: null, date: null, merchant: null };
  }

  try {
    const result = await MlkitOcr.detectFromUri(imageUri);
    const lines: string[] = result.map((block: any) => block.text);
    const fullText = lines.join('\n');

    return {
      amount: extractAmount(fullText),
      date: extractDate(fullText),
      merchant: extractMerchant(lines),
    };
  } catch {
    return { amount: null, date: null, merchant: null };
  }
}

function extractAmount(text: string): number | null {
  // Match dollar amounts — prioritize "TOTAL" line amounts
  const totalPatterns = [
    /(?:total|amount due|balance|grand total)[:\s]*\$?\s*(\d+[.,]\d{2})/i,
    /\$\s*(\d+[.,]\d{2})/,
    /(\d+\.\d{2})\s*$/m,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0 && amount < 100000) return amount;
    }
  }

  return null;
}

function extractDate(text: string): string | null {
  // Common date formats on receipts
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,       // MM/DD/YYYY or M/D/YY
    /(\d{1,2}-\d{1,2}-\d{2,4})/,          // MM-DD-YYYY
    /(\d{4}\/\d{1,2}\/\d{1,2})/,          // YYYY/MM/DD
    /(\w{3}\s+\d{1,2},?\s+\d{4})/,        // Jan 15, 2024
    /(\d{1,2}\s+\w{3}\s+\d{4})/,          // 15 Jan 2024
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractMerchant(lines: string[]): string | null {
  // The merchant name is typically one of the first non-empty lines
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.trim();
    // Skip lines that look like addresses, phone numbers, or dates
    if (/^\d/.test(cleaned)) continue;
    if (/^\(?\d{3}\)?/.test(cleaned)) continue;
    if (cleaned.length < 3 || cleaned.length > 50) continue;
    return cleaned;
  }
  return null;
}
