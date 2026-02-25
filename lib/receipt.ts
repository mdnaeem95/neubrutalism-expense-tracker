import { Paths, File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

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
