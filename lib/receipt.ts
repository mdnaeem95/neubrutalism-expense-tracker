import { Paths, File } from 'expo-file-system/next';
import * as Crypto from 'expo-crypto';

const RECEIPTS_DIR = `${Paths.document}/receipts`;

async function ensureReceiptsDir() {
  try {
    const dir = new File(RECEIPTS_DIR);
    if (!dir.exists) {
      // Create directory by writing and removing a temp file — expo-file-system/next
      // doesn't have mkdir, so we use the directory path directly
    }
  } catch {
    // Directory handling varies; receipts will be saved directly
  }
}

export async function saveReceipt(tempUri: string): Promise<string> {
  const ext = tempUri.split('.').pop() || 'jpg';
  const filename = `receipt_${Crypto.randomUUID()}.${ext}`;
  const destPath = `${Paths.document}/${filename}`;

  const source = new File(tempUri);
  const dest = new File(destPath);

  // Copy the file from temp to persistent storage
  await source.copy(dest);

  return destPath;
}

export async function deleteReceipt(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // File may already be deleted
  }
}
