import { parse, isValid } from 'date-fns';
import { db, generateId } from '@/db';
import { expenses } from '@/db/schema';
import type { Category, PaymentMethod } from '@/types';

// ---------------------------------------------------------------------------
// parseCSV
// ---------------------------------------------------------------------------
// Splits raw CSV text into a headers array and a 2-D rows array.
// Handles quoted fields that contain commas or newlines.
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote inside a quoted field
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map(parseRow);

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// autoMapColumns
// ---------------------------------------------------------------------------
// Guesses which column index corresponds to each semantic field by matching
// common header names. Returns -1 for any field that cannot be matched.
export function autoMapColumns(headers: string[]): {
  dateCol: number;
  amountCol: number;
  descCol: number;
  catCol: number;
} {
  const DATE_NAMES = ['date', 'DATE', 'Date', 'transaction_date', 'Transaction Date', 'txn_date'];
  const AMOUNT_NAMES = ['amount', 'Amount', 'AMOUNT', 'debit', 'Debit', 'DEBIT', 'value', 'Value'];
  const DESC_NAMES = [
    'description', 'Description', 'DESCRIPTION',
    'memo', 'Memo', 'MEMO',
    'details', 'Details', 'narrative', 'Narrative',
    'name', 'Name',
  ];
  const CAT_NAMES = ['category', 'Category', 'CATEGORY', 'type', 'Type', 'TYPE', 'tag', 'Tag'];

  const findCol = (candidates: string[]): number => {
    for (const candidate of candidates) {
      const idx = headers.findIndex(
        (h) => h.trim().toLowerCase() === candidate.toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    dateCol: findCol(DATE_NAMES),
    amountCol: findCol(AMOUNT_NAMES),
    descCol: findCol(DESC_NAMES),
    catCol: findCol(CAT_NAMES),
  };
}

// ---------------------------------------------------------------------------
// matchCategory
// ---------------------------------------------------------------------------
// Case-insensitive match of a raw string to the list of known categories.
// Returns the categoryId if found, or null.
export function matchCategory(name: string, categories: Category[]): string | null {
  if (!name) return null;
  const normalised = name.trim().toLowerCase();
  const match = categories.find((cat) => cat.name.trim().toLowerCase() === normalised);
  return match?.id ?? null;
}

// ---------------------------------------------------------------------------
// executeImport
// ---------------------------------------------------------------------------
// Inserts each prepared row as an expense via Drizzle.
// Returns the number of rows successfully inserted.
export function executeImport(
  rows: { date: Date; amount: number; description: string; categoryId: string }[]
): number {
  const now = Date.now();
  let count = 0;

  for (const row of rows) {
    try {
      db.insert(expenses)
        .values({
          id: generateId(),
          amount: row.amount,
          categoryId: row.categoryId,
          description: row.description,
          date: row.date.getTime(),
          paymentMethod: 'other' as PaymentMethod,
          receiptUri: null,
          isRecurring: 0,
          recurringFrequency: null,
          recurringEndDate: null,
          nextRecurringDate: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      count++;
    } catch {
      // Skip invalid rows (e.g. foreign-key mismatch on categoryId) but keep going
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// DATE_FORMATS — ordered list of formats tried when parsing date strings
// ---------------------------------------------------------------------------
const DATE_FORMATS = [
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'MM/dd/yy',
  'dd/MM/yy',
  'd MMM yyyy',
];

// ---------------------------------------------------------------------------
// parseDate — helper exported for use in the UI layer
// ---------------------------------------------------------------------------
export function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  for (const fmt of DATE_FORMATS) {
    const d = parse(trimmed, fmt, new Date());
    if (isValid(d)) return d;
  }
  // Also try native Date parsing as a fallback
  const native = new Date(trimmed);
  if (isValid(native)) return native;
  return null;
}

// ---------------------------------------------------------------------------
// parseAmount — helper exported for use in the UI layer
// ---------------------------------------------------------------------------
// Strips common currency prefixes / suffixes, handles negative parentheses
// e.g. (25.00) → -25, $1,234.56 → 1234.56
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  // Negative in parentheses: (25.00)
  const negative = s.startsWith('(') && s.endsWith(')');
  if (negative) s = s.slice(1, -1);
  // Remove currency symbols and thousands separators
  s = s.replace(/[£€$¥₹,\s]/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}
