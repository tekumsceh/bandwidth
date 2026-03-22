import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { pool } from '../db';
import { getUserBands, getBandSummary } from '../services/bandsService';
import { canManageBandFinance, canManageBandPlanning, canViewBandDomain } from '../services/authzService';
import { extractReadableArticle } from '../services/importUrlExtractService';
import {
  contentTypeForLyricsPhotoKey,
  createLyricsPhotoReadStream,
  LYRICS_PHOTO_MAX_BYTES,
  removeLyricsPhotoDir,
  removeLyricsPhotoFile,
  writeLyricsPhoto,
} from '../services/songLyricsPhotoService';

function extractHtmlPageTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const raw = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const s = raw.slice(0, 400);
  return s || null;
}

const router = Router();

const lyricsPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LYRICS_PHOTO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(null, ok);
  },
});

function lyricsPhotoUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  lyricsPhotoUpload.single('photo')(req, res, (err: unknown) => {
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: `Image too large (max ${Math.round(LYRICS_PHOTO_MAX_BYTES / (1024 * 1024))} MB)`,
      });
      return;
    }
    if (err) {
      res.status(400).json({ error: 'Upload failed' });
      return;
    }
    next();
  });
}

// List bands for the current user (membership)
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rows = await getUserBands(currentUser.id);
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching bands', err);
    res.status(500).json({ error: 'Failed to load bands' });
  }
});

// Make current user admin of all bands they are a member of
router.post('/make-me-admin', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // RBAC hardening:
    // never allow users to self-escalate privileges in band domain.
    if (currentUser.role !== 'GOD') {
      return res.status(403).json({ error: 'Self role escalation is not allowed' });
    }

    const targetUserId = Number(req.body?.user_id);
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: 'user_id is required for privileged role updates' });
    }

    const [result] = await pool.query(
      `UPDATE band_members
       SET role = 'admin', updated_at = NOW()
       WHERE user_id = ?
         AND status = 'active'
         AND role = 'member'`,
      [targetUserId],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = result as any;
    return res.json({
      updated: info.affectedRows ?? 0,
      message: 'Target user is now admin on bands where they were a member.',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error making user admin of bands', err);
    res.status(500).json({ error: 'Failed to update band roles' });
  }
});

// Bands where current user is owner/admin (for band admin tools)
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
      `SELECT
         b.id,
         b.name,
         b.color,
         b.is_solo,
         bm.role AS my_role,
         b.created_at,
         b.updated_at
       FROM bands b
       JOIN band_members bm ON bm.band_id = b.id
       WHERE bm.user_id = ?
         AND bm.status = 'active'
         AND bm.role IN ('owner', 'admin')
       ORDER BY b.name ASC`,
      [currentUser.id],
    );
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching admin bands', err);
    res.status(500).json({ error: 'Failed to load admin bands' });
  }
});

// Basic band summary for any member (returns band + your role)
router.get('/:id/summary', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { band, role } = await getBandSummary(id, currentUser.id);
    if (!band || !role) {
      return res.status(403).json({ error: 'You are not a member of this band' });
    }

    res.json({
      band,
      my_role: role,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching band summary', err);
    res.status(500).json({ error: 'Failed to load band summary' });
  }
});

// --- Song library (lyrics-first; must be registered before GET /:id) ---

router.get('/:id/songs', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  if (!Number.isFinite(bandId)) {
    return res.status(400).json({ error: 'Invalid band id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    const [rows] = await pool.query(
      `SELECT id, band_id, title, artist, lyrics, lyrics_photo_key, created_by_user_id, created_at, updated_at
       FROM band_songs
       WHERE band_id = ?
       ORDER BY title ASC, id ASC`,
      [bandId],
    );
    res.json({ songs: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List band songs error', err);
    res.status(500).json({ error: 'Failed to load songs' });
  }
});

router.post('/:id/songs', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  if (!Number.isFinite(bandId)) {
    return res.status(400).json({ error: 'Invalid band id' });
  }
  const title = String(req.body?.title || '').trim();
  const artist = req.body?.artist != null ? String(req.body.artist).trim() || null : null;
  const lyrics = req.body?.lyrics != null ? String(req.body.lyrics) : null;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    const [ins] = await pool.query(
      `INSERT INTO band_songs (band_id, title, artist, lyrics, created_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [bandId, title, artist, lyrics, currentUser.id],
    );
    const insertId = (ins as any).insertId as number;
    const [rows] = await pool.query(
      `SELECT id, band_id, title, artist, lyrics, created_by_user_id, created_at, updated_at
       FROM band_songs WHERE id = ?`,
      [insertId],
    );
    res.status(201).json({ song: (rows as any[])[0] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create band song error', err);
    res.status(500).json({ error: 'Failed to create song' });
  }
});

/** Server-side fetch for lyrics text (avoids browser CORS). Guard against abuse (size, timeouts). */
router.post('/:id/songs/import-url', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  if (!Number.isFinite(bandId)) {
    return res.status(400).json({ error: 'Invalid band id' });
  }
  const urlRaw = String(req.body?.url || '').trim();
  if (!urlRaw) {
    return res.status(400).json({ error: 'url is required' });
  }
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http(s) URLs are allowed' });
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return res.status(400).json({ error: 'That URL is not allowed' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const r = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'BandwidthSetlistImport/1.0' },
    });
    clearTimeout(t);
    if (!r.ok) {
      return res.status(502).json({ error: `Remote returned ${r.status}` });
    }
    const buf = await r.arrayBuffer();
    const maxHtmlBytes = 1024 * 1024;
    if (buf.byteLength > maxHtmlBytes) {
      return res.status(413).json({ error: 'Page is too large to import (max 1 MB HTML)' });
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const finalUrl = typeof r.url === 'string' && r.url.length > 0 ? r.url : parsed.toString();

    const strippedFallback = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const readable = extractReadableArticle(text, finalUrl);
    let outputText: string;
    let pageTitle: string | null;
    let extractionMethod: 'article' | 'full_page';

    if (readable) {
      outputText = readable.text;
      pageTitle = readable.articleTitle || extractHtmlPageTitle(text);
      extractionMethod = 'article';
    } else {
      outputText = strippedFallback;
      pageTitle = extractHtmlPageTitle(text);
      extractionMethod = 'full_page';
    }

    res.json({
      text: outputText.slice(0, 400_000),
      pageTitle,
      sourceHost: parsed.hostname,
      finalUrl,
      extractionMethod,
      extractionNote:
        extractionMethod === 'article'
          ? 'Main article text was detected (Mozilla Readability). Sidebars and most navigation are omitted.'
          : 'Could not isolate a main article on this page — using stripped full-page text. You may want to edit heavily or paste manually.',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Import URL error', err);
    res.status(502).json({ error: 'Failed to fetch URL' });
  }
});

/** Lyrics fallback image: file on disk, key in DB only (no blobs). Auth + band scope. */
router.get('/:id/songs/:songId/lyrics-photo', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  const songId = Number(req.params.songId);
  if (!Number.isFinite(bandId) || !Number.isFinite(songId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    const [rows] = await pool.query(
      `SELECT lyrics_photo_key FROM band_songs WHERE id = ? AND band_id = ? LIMIT 1`,
      [songId, bandId],
    );
    const row = (rows as { lyrics_photo_key: string | null }[])[0];
    if (!row?.lyrics_photo_key) {
      return res.status(404).json({ error: 'No lyrics photo' });
    }
    const key = row.lyrics_photo_key;
    res.setHeader('Content-Type', contentTypeForLyricsPhotoKey(key));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const stream = createLyricsPhotoReadStream(bandId, songId, key);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ error: 'File missing' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get lyrics photo error', err);
    res.status(500).json({ error: 'Failed to load lyrics photo' });
  }
});

router.post(
  '/:id/songs/:songId/lyrics-photo',
  lyricsPhotoUploadMiddleware,
  async (req: Request, res: Response) => {
    const bandId = Number(req.params.id);
    const songId = Number(req.params.songId);
    if (!Number.isFinite(bandId) || !Number.isFinite(songId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer) {
      return res.status(400).json({ error: 'photo file is required (field name: photo)' });
    }
    try {
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      if (!(await canViewBandDomain(bandId, currentUser.id))) {
        return res.status(403).json({ error: 'Not allowed for this band' });
      }
      const [exists] = await pool.query(
        `SELECT id, lyrics_photo_key, title, artist FROM band_songs WHERE id = ? AND band_id = ? LIMIT 1`,
        [songId, bandId],
      );
      const ex = (exists as { id: number; lyrics_photo_key: string | null; title: string; artist: string | null }[])[0];
      if (!ex) {
        return res.status(404).json({ error: 'Song not found' });
      }
      const title = String(ex.title || '').trim();
      const artist = String(ex.artist || '').trim();
      if (!title) {
        return res.status(400).json({ error: 'Song title is required before uploading a lyrics photo' });
      }
      if (!artist) {
        return res.status(400).json({ error: 'Artist is required before uploading a lyrics photo' });
      }
      const newKey = await writeLyricsPhoto(bandId, songId, file.buffer, file.mimetype, {
        title,
        artist,
        index: 1,
      });
      if (ex.lyrics_photo_key && ex.lyrics_photo_key !== newKey) {
        await removeLyricsPhotoFile(bandId, songId, ex.lyrics_photo_key);
      }
      await pool.query(
        `UPDATE band_songs SET lyrics_photo_key = ?, updated_at = NOW() WHERE id = ? AND band_id = ?`,
        [newKey, songId, bandId],
      );
      const [rows] = await pool.query(
        `SELECT id, band_id, title, artist, lyrics, lyrics_photo_key, created_by_user_id, created_at, updated_at
         FROM band_songs WHERE id = ?`,
        [songId],
      );
      res.json({ song: (rows as any[])[0] });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upload lyrics photo error', err);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      if (msg.includes('Unsupported') || msg.includes('Invalid')) {
        return res.status(400).json({ error: msg });
      }
      if (msg.includes('too large')) {
        return res.status(413).json({ error: msg });
      }
      res.status(500).json({ error: 'Failed to upload lyrics photo' });
    }
  },
);

router.delete('/:id/songs/:songId/lyrics-photo', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  const songId = Number(req.params.songId);
  if (!Number.isFinite(bandId) || !Number.isFinite(songId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    const [curRows] = await pool.query(
      `SELECT lyrics_photo_key FROM band_songs WHERE id = ? AND band_id = ? LIMIT 1`,
      [songId, bandId],
    );
    const cur = (curRows as { lyrics_photo_key: string | null }[])[0];
    if (!cur) {
      return res.status(404).json({ error: 'Song not found' });
    }
    const oldKey = cur.lyrics_photo_key;
    await pool.query(
      `UPDATE band_songs SET lyrics_photo_key = NULL, updated_at = NOW() WHERE id = ? AND band_id = ?`,
      [songId, bandId],
    );
    if (oldKey) {
      await removeLyricsPhotoFile(bandId, songId, oldKey);
    }
    const [rows] = await pool.query(
      `SELECT id, band_id, title, artist, lyrics, lyrics_photo_key, created_by_user_id, created_at, updated_at
       FROM band_songs WHERE id = ?`,
      [songId],
    );
    res.json({ song: (rows as any[])[0] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete lyrics photo error', err);
    res.status(500).json({ error: 'Failed to remove lyrics photo' });
  }
});

router.patch('/:id/songs/:songId', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  const songId = Number(req.params.songId);
  if (!Number.isFinite(bandId) || !Number.isFinite(songId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const title = req.body?.title != null ? String(req.body.title).trim() : undefined;
  const artist = req.body?.artist !== undefined ? (req.body.artist == null ? null : String(req.body.artist).trim() || null) : undefined;
  const lyrics = req.body?.lyrics !== undefined ? (req.body.lyrics == null ? null : String(req.body.lyrics)) : undefined;
  if (title !== undefined && !title) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    const [curRows] = await pool.query(
      `SELECT id, title, artist, lyrics, lyrics_photo_key FROM band_songs WHERE id = ? AND band_id = ? LIMIT 1`,
      [songId, bandId],
    );
    const cur = (curRows as any[])[0] as
      | { id: number; title: string; artist: string | null; lyrics: string | null; lyrics_photo_key: string | null }
      | undefined;
    if (!cur) {
      return res.status(404).json({ error: 'Song not found' });
    }
    const nextTitle = title !== undefined ? title : cur.title;
    const nextArtist = artist !== undefined ? artist : cur.artist;
    const nextLyrics = lyrics !== undefined ? lyrics : cur.lyrics;
    await pool.query(
      `UPDATE band_songs
       SET title = ?, artist = ?, lyrics = ?, updated_at = NOW()
       WHERE id = ? AND band_id = ?`,
      [nextTitle, nextArtist, nextLyrics, songId, bandId],
    );
    const [rows] = await pool.query(
      `SELECT id, band_id, title, artist, lyrics, lyrics_photo_key, created_by_user_id, created_at, updated_at
       FROM band_songs WHERE id = ?`,
      [songId],
    );
    res.json({ song: (rows as any[])[0] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Update band song error', err);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

router.delete('/:id/songs/:songId', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  const songId = Number(req.params.songId);
  if (!Number.isFinite(bandId) || !Number.isFinite(songId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!(await canViewBandDomain(bandId, currentUser.id))) {
      return res.status(403).json({ error: 'Not allowed for this band' });
    }
    await removeLyricsPhotoDir(bandId, songId);
    const [del] = await pool.query(`DELETE FROM band_songs WHERE id = ? AND band_id = ?`, [songId, bandId]);
    const affected = (del as any).affectedRows ?? 0;
    if (!affected) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete band song error', err);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Basic band detail with members (only for owner/admin – used for admin tools)
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check permissions
    const allowed = await canManageBandPlanning(id, currentUser.id);
    if (!allowed) {
      return res.status(403).json({ error: 'You are not allowed to manage this band' });
    }

    const [bandRows] = await pool.query(
      `SELECT id, name, color, is_solo, created_at, updated_at
       FROM bands
       WHERE id = ?`,
      [id],
    );
    const band = (bandRows as any[])[0];
    if (!band) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const [memberRows] = await pool.query(
      `SELECT
         bm.user_id,
         u.display_name,
         u.email,
         bm.role,
         bm.status,
         bm.joined_at,
         bm.updated_at
       FROM band_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.band_id = ?
       ORDER BY bm.role DESC, u.display_name`,
      [id],
    );

    res.json({ band, members: memberRows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching band detail', err);
    res.status(500).json({ error: 'Failed to load band' });
  }
});

// Update band basic info (owner/admin only)
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { name, color } = req.body || {};

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const allowed = await canManageBandPlanning(id, currentUser.id);
    if (!allowed) {
      return res.status(403).json({ error: 'You are not allowed to update this band' });
    }

    await pool.query(
      `UPDATE bands
       SET name = COALESCE(?, name),
           color = COALESCE(?, color),
           updated_at = NOW()
       WHERE id = ?`,
      [name || null, color || null, id],
    );

    const [bandRows] = await pool.query(
      `SELECT id, name, color, is_solo, created_at, updated_at
       FROM bands
       WHERE id = ?`,
      [id],
    );
    const band = (bandRows as any[])[0];
    res.json(band);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error updating band', err);
    res.status(500).json({ error: 'Failed to update band' });
  }
});

/** Band ledger-shaped payload — stub until finance returns */
router.get('/:id/events', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const allowed = await canManageBandFinance(id, currentUser.id);
    if (!allowed) {
      return res.status(403).json({ error: 'You are not allowed to view this band ledger' });
    }

    res.json({ events: [], members: [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching band events', err);
    res.status(500).json({ error: 'Failed to load band events' });
  }
});

export default router;

