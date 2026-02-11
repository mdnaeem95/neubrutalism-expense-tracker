import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import type { ExpenseWithCategory } from '@/types';

export async function exportToCSV(
  expenses: ExpenseWithCategory[],
  currencySymbol: string
): Promise<void> {
  const header = 'Date,Category,Description,Amount,Payment Method,Notes\n';
  const rows = expenses
    .map((e) => {
      const date = format(new Date(e.date), 'yyyy-MM-dd');
      const category = e.category.name.replace(/,/g, ';');
      const description = (e.description || '').replace(/,/g, ';');
      const amount = `${currencySymbol}${e.amount.toFixed(2)}`;
      const paymentMethod = e.paymentMethod;
      const notes = (e.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
      return `${date},${category},${description},${amount},${paymentMethod},${notes}`;
    })
    .join('\n');

  const csv = header + rows;
  const fileName = `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  const file = new File(Paths.document, fileName);
  await file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Expenses',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
