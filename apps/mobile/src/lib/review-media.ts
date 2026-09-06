import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

const maxPhotoBytes = 6 * 1024 * 1024;
const reviewMediaDirectory = new Directory(Paths.document, 'review-media');

export type LocalReviewPhoto = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export async function persistReviewPhoto(asset: ImagePickerAsset): Promise<LocalReviewPhoto> {
  if (asset.fileSize && asset.fileSize > maxPhotoBytes) {
    throw new Error('Escolha uma foto de até 6 MB.');
  }

  const mimeType = normalizeMimeType(asset.mimeType);
  const extension = extensionFor(mimeType, asset.fileName);
  const fileName = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  reviewMediaDirectory.create({ idempotent: true, intermediates: true });

  const source = new File(asset.uri);
  const destination = new File(reviewMediaDirectory, fileName);
  await source.copy(destination);

  return { uri: destination.uri, mimeType, fileName };
}

export async function readReviewPhoto(uri: string) {
  const file = new File(uri);
  if (!file.exists) throw new Error('A foto salva no aparelho não foi encontrada.');
  return file.arrayBuffer();
}

export function deletePersistedReviewPhoto(uri?: string) {
  if (!uri || !uri.startsWith(reviewMediaDirectory.uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function extensionFor(mimeType?: string | null, fileName?: string | null) {
  const fileExtension = fileName?.split('.').pop()?.toLowerCase();
  if (fileExtension === 'png' || fileExtension === 'webp' || fileExtension === 'jpg' || fileExtension === 'jpeg') {
    return fileExtension === 'jpeg' ? 'jpg' : fileExtension;
  }
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function normalizeMimeType(mimeType?: string | null) {
  if (mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/jpeg') return mimeType;
  return 'image/jpeg';
}
