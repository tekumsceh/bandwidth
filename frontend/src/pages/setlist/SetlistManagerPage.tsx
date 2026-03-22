import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ImageUp, ListMusic, ListOrdered, Link2, Plus, Radio, Save, Trash2 } from 'lucide-react';
import BackNavLink from '../../components/BackNavLink';
import { apiUrl } from '../../config/api';
import { APP_ROUTES, eventsHubHref } from '../../config/navigation';

export type BandSong = {
  id: number;
  band_id: number;
  title: string;
  artist: string | null;
  lyrics: string | null;
  /** Server path key only; image bytes live on disk under uploads/song-photos. */
  lyrics_photo_key?: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
};

/** Setlist manager — song library with lyrics-first editor. */
export default function SetlistManagerPage() {
  const [searchParams] = useSearchParams();
  const bandIdParam = searchParams.get('bandId');
  const bandId = bandIdParam ? parseInt(bandIdParam, 10) : NaN;
  const bandOk = Number.isFinite(bandId) && bandId > 0;

  const [songs, setSongs] = useState<BandSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    text: string;
    pageTitle: string | null;
    sourceHost: string;
    finalUrl: string;
    extractionMethod: 'article' | 'full_page';
    extractionNote: string;
  } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const photoFileRef = useRef<HTMLInputElement>(null);

  const selectedSong = selectedId != null ? songs.find((s) => s.id === selectedId) : null;
  const lyricsPhotoKey = selectedSong?.lyrics_photo_key ?? null;

  /** Server names files from DB title/artist; both must be non-empty (save after editing). */
  const canUploadLyricsPhoto =
    selectedId != null && title.trim().length > 0 && artist.trim().length > 0;

  const loadSongs = useCallback(async () => {
    if (!bandOk) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/bands/${bandId}/songs`), { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || `Failed to load (${res.status})`);
      }
      const list = (json as { songs?: BandSong[] }).songs ?? [];
      setSongs(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load songs');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [bandId, bandOk]);

  useEffect(() => {
    void loadSongs();
  }, [loadSongs]);

  useEffect(() => {
    setImportPreview(null);
  }, [bandId]);

  useEffect(() => {
    if (selectedId != null && !songs.some((s) => s.id === selectedId)) {
      setSelectedId(null);
      setTitle('');
      setArtist('');
      setLyrics('');
    }
  }, [songs, selectedId]);

  useEffect(() => {
    if (!bandOk || !selectedId || !lyricsPhotoKey) {
      setPhotoLoadError(false);
      setPhotoBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    setPhotoLoadError(false);
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/bands/${bandId}/songs/${selectedId}/lyrics-photo`), {
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) {
            setPhotoLoadError(true);
            setPhotoBlobUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPhotoLoadError(false);
          setPhotoBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return createdUrl;
          });
        }
      } catch {
        if (!cancelled) {
          setPhotoLoadError(true);
          setPhotoBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [bandOk, bandId, selectedId, lyricsPhotoKey, selectedSong?.updated_at]);

  const openNew = () => {
    setSelectedId(null);
    setTitle('');
    setArtist('');
    setLyrics('');
  };

  const openSong = (s: BandSong) => {
    setSelectedId(s.id);
    setTitle(s.title);
    setArtist(s.artist ?? '');
    setLyrics(s.lyrics ?? '');
  };

  const saveSong = async () => {
    if (!bandOk) return;
    const t = title.trim();
    if (!t) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (selectedId == null) {
        const res = await fetch(apiUrl(`/api/bands/${bandId}/songs`), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, artist: artist.trim() || null, lyrics: lyrics || null }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as { error?: string }).error || 'Save failed');
        }
        const song = (json as { song: BandSong }).song;
        setSongs((prev) => [...prev, song].sort((a, b) => a.title.localeCompare(b.title)));
        setSelectedId(song.id);
      } else {
        const res = await fetch(apiUrl(`/api/bands/${bandId}/songs/${selectedId}`), {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, artist: artist.trim() || null, lyrics: lyrics || null }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as { error?: string }).error || 'Save failed');
        }
        const song = (json as { song: BandSong }).song;
        setSongs((prev) => {
          const next = prev.map((x) => (x.id === song.id ? song : x));
          return next.sort((a, b) => a.title.localeCompare(b.title));
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteSong = async () => {
    if (!bandOk || selectedId == null) return;
    if (!window.confirm('Delete this song from the library?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/bands/${bandId}/songs/${selectedId}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || 'Delete failed');
      }
      setSongs((prev) => prev.filter((s) => s.id !== selectedId));
      openNew();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const mergeSongIntoList = (song: BandSong) => {
    setSongs((prev) => {
      const next = prev.map((x) => (x.id === song.id ? song : x));
      return next.sort((a, b) => a.title.localeCompare(b.title));
    });
  };

  const uploadLyricsPhoto = async (file: File) => {
    if (!bandOk || selectedId == null || !canUploadLyricsPhoto) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch(apiUrl(`/api/bands/${bandId}/songs/${selectedId}/lyrics-photo`), {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || 'Photo upload failed');
      }
      const song = (json as { song: BandSong }).song;
      mergeSongIntoList(song);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removeLyricsPhoto = async () => {
    if (!bandOk || selectedId == null) return;
    if (!window.confirm('Remove the lyrics photo? Text lyrics are unchanged.')) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/bands/${bandId}/songs/${selectedId}/lyrics-photo`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || 'Remove failed');
      }
      const song = (json as { song: BandSong }).song;
      mergeSongIntoList(song);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onLyricsPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !canUploadLyricsPhoto) return;
    void uploadLyricsPhoto(f);
  };

  const runImportUrl = async () => {
    if (!bandOk || !importUrl.trim()) return;
    setImportBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/bands/${bandId}/songs/import-url`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || 'Import failed');
      }
      const text = (json as { text?: string }).text ?? '';
      const pageTitle = (json as { pageTitle?: string | null }).pageTitle ?? null;
      const sourceHost = String((json as { sourceHost?: string }).sourceHost || '');
      const finalUrl = String((json as { finalUrl?: string }).finalUrl || importUrl.trim());
      const rawMethod = (json as { extractionMethod?: string }).extractionMethod;
      const extractionMethod: 'article' | 'full_page' = rawMethod === 'article' ? 'article' : 'full_page';
      const extractionNote = String((json as { extractionNote?: string }).extractionNote || '');
      setImportPreview({ text, pageTitle, sourceHost, finalUrl, extractionMethod, extractionNote });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportBusy(false);
    }
  };

  const appendImportPreviewToLyrics = () => {
    if (!importPreview) return;
    const { text } = importPreview;
    setLyrics((prev) => (prev ? `${prev}\n\n${text}` : text));
    setImportPreview(null);
    setImportOpen(false);
    setImportUrl('');
  };

  const discardImportPreview = () => {
    setImportPreview(null);
  };

  return (
    <div className="page page-setlist-manager">
      <div className="setlist-manager-frame">
        <div className="io-patch-workspace-toolbar" aria-label="Setlist workspace">
          <span className="io-patch-workspace-label">Setlist</span>
          <span className="io-patch-workspace-hint">Songs · order · live</span>
          {bandOk ? (
            <span className="io-patch-workspace-scope">Band #{bandId} · song library</span>
          ) : (
            <span className="io-patch-workspace-scope">Select a band in the rail</span>
          )}
          <span className="io-patch-workspace-toolbar-spacer" aria-hidden />
          <BackNavLink
            className="io-patch-back io-patch-back--toolbar"
            label="Back"
            fallbackTo={eventsHubHref('dashboard')}
          />
        </div>

        <div className="setlist-manager-body">
          {!bandOk ? (
            <p className="setlist-manager-lede">
              Choose a band from the <strong>left rail</strong>, then open Setlist again — or use{' '}
              <Link to={APP_ROUTES.assetsSetlists}>this page</Link> with <code>?bandId=</code>.
            </p>
          ) : (
            <>
              <p className="setlist-manager-lede">
                <strong>Lyrics</strong> are the core: type here, paste from anywhere, or pull text from a public web
                page (server fetches to avoid CORS). Setlists and live sync come next.
              </p>

              {error && <div className="setlist-manager-error">{error}</div>}

              <div className="setlist-manager-workspace">
                <aside className="setlist-manager-sidebar">
                  <div className="setlist-manager-sidebar-head">
                    <ListMusic size={16} aria-hidden />
                    <span>Songs</span>
                    <button type="button" className="setlist-manager-icon-btn" title="New song" onClick={openNew}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="setlist-manager-song-list">
                    {loading && <div className="setlist-manager-muted">Loading…</div>}
                    {!loading &&
                      songs.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`setlist-manager-song-row ${selectedId === s.id ? 'active' : ''}`}
                          onClick={() => openSong(s)}
                        >
                          <span className="setlist-manager-song-title">{s.title}</span>
                          {s.artist ? (
                            <span className="setlist-manager-song-artist">{s.artist}</span>
                          ) : null}
                        </button>
                      ))}
                    {!loading && songs.length === 0 && (
                      <div className="setlist-manager-muted">No songs yet — add one.</div>
                    )}
                  </div>
                </aside>

                <main className="setlist-manager-editor">
                  <div className="setlist-manager-editor-fields">
                    <label className="setlist-manager-field">
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Song title"
                        autoComplete="off"
                        aria-label="Song title"
                      />
                    </label>
                    <label className="setlist-manager-field">
                      <input
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="By Artist"
                        autoComplete="off"
                        aria-label="Artist"
                      />
                    </label>
                  </div>

                  <div className="setlist-manager-lyrics-shell">
                    <div className="setlist-manager-lyrics-toolbar">
                      <span className="setlist-manager-lyrics-label">Lyrics</span>
                      <div className="setlist-manager-lyrics-actions">
                        {selectedId != null && canUploadLyricsPhoto ? (
                          <input
                            ref={photoFileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="setlist-manager-file-input-hidden"
                            onChange={onLyricsPhotoFile}
                            aria-label="Upload lyrics photo from your device"
                          />
                        ) : null}
                        <button
                          type="button"
                          className="setlist-manager-tiny-btn"
                          onClick={() => setImportOpen((v) => !v)}
                        >
                          <Link2 size={14} aria-hidden /> Import from URL
                        </button>
                        <button
                          type="button"
                          className="setlist-manager-tiny-btn setlist-manager-tiny-btn--primary"
                          disabled={!canUploadLyricsPhoto || photoBusy}
                          title={
                            !canUploadLyricsPhoto
                              ? 'Save the song with both title and artist filled in. Files are stored as Title - Artist - 1 on the server.'
                              : 'JPEG, PNG, WebP, or GIF · max 1 MB. Preview appears below.'
                          }
                          onClick={() => photoFileRef.current?.click()}
                        >
                          <ImageUp size={14} aria-hidden /> Upload photo
                        </button>
                      </div>
                    </div>
                    {importOpen && (
                      <div className="setlist-manager-import-panel">
                        <input
                          type="url"
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          placeholder="https://…"
                          className="setlist-manager-import-input"
                        />
                        <button
                          type="button"
                          className="setlist-manager-tiny-btn"
                          disabled={importBusy || !importUrl.trim()}
                          onClick={() => void runImportUrl()}
                        >
                          {importBusy ? '…' : 'Fetch'}
                        </button>
                      </div>
                    )}
                    {importPreview && (
                      <div className="setlist-manager-import-preview">
                        <p className="setlist-manager-import-preview-meta">
                          <strong>{importPreview.sourceHost}</strong>
                          {importPreview.pageTitle ? ` — ${importPreview.pageTitle}` : null}
                        </p>
                        <p className="setlist-manager-import-preview-url">
                          <a href={importPreview.finalUrl} target="_blank" rel="noreferrer">
                            {importPreview.finalUrl}
                          </a>
                        </p>
                        <p
                          className={`setlist-manager-import-badge setlist-manager-import-badge--${importPreview.extractionMethod}`}
                        >
                          {importPreview.extractionMethod === 'article'
                            ? 'Main article detected'
                            : 'Full-page fallback'}
                        </p>
                        <p className="setlist-manager-import-preview-note">{importPreview.extractionNote}</p>
                        <p className="setlist-manager-import-preview-note">
                          Review below — nothing is added to your lyrics until you confirm. Lyrics sites vary; you may
                          still need to trim manually.
                        </p>
                        <textarea
                          readOnly
                          className="setlist-manager-import-preview-text"
                          value={
                            importPreview.text.length > 12000
                              ? `${importPreview.text.slice(0, 12000)}\n\n… (${importPreview.text.length} characters total)`
                              : importPreview.text
                          }
                          aria-label="Fetched text preview"
                        />
                        <div className="setlist-manager-import-preview-actions">
                          <button type="button" className="btn" onClick={appendImportPreviewToLyrics}>
                            Append to lyrics
                          </button>
                          <button type="button" className="setlist-manager-tiny-btn" onClick={discardImportPreview}>
                            Discard
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="setlist-manager-lyrics-body">
                      <textarea
                        className="setlist-manager-lyrics"
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        placeholder="Type or paste lyrics. Plain text — no rich formatting (keeps it small and reliable offline)."
                        spellCheck
                      />
                      <button
                        type="button"
                        className="btn setlist-manager-lyrics-save"
                        disabled={saving || !title.trim()}
                        onClick={() => void saveSong()}
                      >
                        <Save size={14} aria-hidden /> {saving ? 'Saving…' : 'Save song'}
                      </button>
                    </div>
                  </div>

                  <div className="setlist-manager-lyrics-photo">
                    <div className="setlist-manager-lyrics-photo-head">
                      <span className="setlist-manager-lyrics-photo-title">Lyrics photo</span>
                      <span className="setlist-manager-lyrics-photo-hint">
                        <strong>Prefer plain-text lyrics</strong> above — easier to search, sync, and print. Use{' '}
                        <strong>Upload photo</strong> in the bar after title and artist are set and saved. Files are{' '}
                        <strong>JPEG, PNG, WebP, or GIF</strong>, max <strong>1 MB</strong>, stored on disk as{' '}
                        <code>Title - Artist - 1</code> (the number is the <strong>part / slide</strong> — 1 = first image,
                        2 = second, when multi-part exists). The database only stores the filename key.
                      </span>
                    </div>
                    {selectedId == null ? (
                      <p className="setlist-manager-lyrics-photo-locked">
                        Save the song first, then use <strong>Upload photo</strong> above.
                      </p>
                    ) : (
                      <>
                        {!canUploadLyricsPhoto ? (
                          <p className="setlist-manager-lyrics-photo-locked">
                            Enter <strong>song title</strong> and <strong>artist</strong>, then <strong>Save song</strong>{' '}
                            — <strong>Upload photo</strong> unlocks after both are stored.
                          </p>
                        ) : null}
                        <div className="setlist-manager-lyrics-photo-actions">
                          {lyricsPhotoKey ? (
                            <button
                              type="button"
                              className="setlist-manager-tiny-btn"
                              disabled={photoBusy}
                              onClick={() => void removeLyricsPhoto()}
                            >
                              Remove photo
                            </button>
                          ) : canUploadLyricsPhoto ? (
                            <p className="setlist-manager-lyrics-photo-empty">
                              No photo yet — use <strong>Upload photo</strong> above.
                            </p>
                          ) : null}
                        </div>
                        {photoBlobUrl ? (
                          <div className="setlist-manager-lyrics-photo-preview">
                            <img src={photoBlobUrl} alt="Uploaded lyrics reference" />
                          </div>
                        ) : lyricsPhotoKey && photoLoadError ? (
                          <p className="setlist-manager-muted">
                            Couldn’t load preview. The photo may still be on the server — try refresh or re-upload.
                          </p>
                        ) : lyricsPhotoKey ? (
                          <p className="setlist-manager-muted">Loading preview…</p>
                        ) : null}
                      </>
                    )}
                  </div>

                  {selectedId != null && (
                    <div className="setlist-manager-cta">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={saving}
                        onClick={() => void deleteSong()}
                      >
                        <Trash2 size={14} aria-hidden /> Delete
                      </button>
                    </div>
                  )}
                </main>
              </div>
            </>
          )}

          <div className="setlist-manager-grid setlist-manager-grid--below">
            <section className="setlist-manager-card" aria-labelledby="setlist-sets-heading">
              <div className="setlist-manager-card-head">
                <ListOrdered size={18} strokeWidth={2} aria-hidden />
                <h2 id="setlist-sets-heading">Setlists</h2>
              </div>
              <p className="setlist-manager-card-desc">
                Create a setlist, add/remove songs from the library, reorder — <strong>coming next</strong>.
              </p>
              <div className="setlist-manager-placeholder">Builder — not wired yet</div>
            </section>

            <section className="setlist-manager-card setlist-manager-card--wide" aria-labelledby="setlist-live-heading">
              <div className="setlist-manager-card-head">
                <Radio size={18} strokeWidth={2} aria-hidden />
                <h2 id="setlist-live-heading">Live on stage</h2>
              </div>
              <p className="setlist-manager-card-desc">
                Synced view for the band — <strong>online</strong> first; for roaming/offline, plan for{' '}
                <strong>LAN / Bluetooth / mesh</strong> in a later phase (see docs).
              </p>
              <div className="setlist-manager-placeholder">Live sync — not wired yet</div>
            </section>
          </div>

          <p className="setlist-manager-footnote">
            Rich “Word-like” editing is intentionally limited to <strong>plain text</strong> for reliability, small
            payloads, and future offline use. Optional later: ChordPro, monospace chords, or a lightweight markdown
            preview (still stored as text). Lyrics photos are optional and stored as files — legal use of lyric content
            remains the band’s responsibility.
          </p>
        </div>
      </div>
    </div>
  );
}
