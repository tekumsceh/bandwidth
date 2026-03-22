import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_ROOT = () => path.join(process.cwd(), 'uploads', 'song-photos');

/** Max file size for lyrics photos (bytes). */
export const LYRICS_PHOTO_MAX_BYTES = 1024 * 1024;

export function extForMime(mime: string): string | null {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return null;
}

/** Stored filenames: legacy UUID or server-generated `Title - Artist - 1.ext`. */
export function safeLyricsPhotoKey(key: string): boolean {
  const t = key.trim();
  if (!t || t.length > 220) return false;
  if (/\.\.|\/|\\|\0/.test(t)) return false;
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(t);
}

export function absLyricsPhotoPath(bandId: number, songId: number, key: string): string {
  if (!safeLyricsPhotoKey(key)) {
    throw new Error('Invalid lyrics photo key');
  }
  return path.join(UPLOAD_ROOT(), String(bandId), String(songId), key);
}

export function contentTypeForLyricsPhotoKey(key: string): string {
  const k = key.toLowerCase();
  if (k.endsWith('.png')) return 'image/png';
  if (k.endsWith('.jpg') || k.endsWith('.jpeg')) return 'image/jpeg';
  if (k.endsWith('.webp')) return 'image/webp';
  if (k.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

export async function removeLyricsPhotoFile(bandId: number, songId: number, key: string | null) {
  if (!key || !safeLyricsPhotoKey(key)) return;
  try {
    await fs.unlink(absLyricsPhotoPath(bandId, songId, key));
  } catch {
    // missing file is fine
  }
}

export async function removeLyricsPhotoDir(bandId: number, songId: number) {
  const dir = path.join(UPLOAD_ROOT(), String(bandId), String(songId));
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export function sanitizeFilenamePart(s: string, maxLen: number): string {
  let out = s
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, maxLen);
  if (!out) out = 'untitled';
  return out;
}

/** Base name without extension, e.g. `Song Title - Artist Name - 1` */
export function buildLyricsPhotoBaseName(title: string, artist: string, index: number): string {
  const t = sanitizeFilenamePart(title, 80);
  const a = sanitizeFilenamePart(artist, 60);
  let base = `${t} - ${a} - ${index}`;
  if (base.length > 180) base = base.slice(0, 180);
  return base;
}

async function pickUniqueFilename(dir: string, base: string, ext: string): Promise<string> {
  for (let n = 0; n < 100; n++) {
    const name = n === 0 ? `${base}${ext}` : `${base} (${n + 1})${ext}`;
    const full = path.join(dir, name);
    try {
      await fs.access(full);
    } catch {
      return name;
    }
  }
  return `${base}-${randomUUID().slice(0, 8)}${ext}`;
}

export async function writeLyricsPhoto(
  bandId: number,
  songId: number,
  buffer: Buffer,
  mime: string,
  meta: { title: string; artist: string; index: number },
): Promise<string> {
  const ext = extForMime(mime);
  if (!ext) {
    throw new Error('Unsupported image type (use JPEG, PNG, WebP, or GIF)');
  }
  if (buffer.length > LYRICS_PHOTO_MAX_BYTES) {
    throw new Error('Image too large (max 1 MB)');
  }
  const dir = path.join(UPLOAD_ROOT(), String(bandId), String(songId));
  await fs.mkdir(dir, { recursive: true });
  const base = buildLyricsPhotoBaseName(meta.title, meta.artist, meta.index);
  const filename = await pickUniqueFilename(dir, base, ext);
  const dest = path.join(dir, filename);
  await fs.writeFile(dest, buffer);
  return filename;
}

export function createLyricsPhotoReadStream(bandId: number, songId: number, key: string) {
  const p = absLyricsPhotoPath(bandId, songId, key);
  return createReadStream(p);
}
