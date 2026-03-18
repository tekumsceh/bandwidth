import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackNavLink from '../../components/BackNavLink';
import { apiUrl } from '../../config/api';
import { Folder, Import, Link, Search, Settings } from 'lucide-react';
import { FaMicrophone } from 'react-icons/fa';
import { resolveWedgeIcon, resolveIemIcon } from '../../config/userIconSelection';
import { getInstruments, getInstrument } from './instrumentIcons';
import { loadIoPatchState, saveIoPatchState, isEmptyPatch, type IoPatchPersistedState } from './ioPatchStorage';
import './IOPatchPage.css';

/** Mics ordered by popularity (most used live/stage first) */
const MICROPHONE_LIST = [
  /* Ubiquitous workhorses */
  'Shure SM58', 'Shure SM57', 'Shure Beta 57', 'Shure Beta 58', 'Shure Beta 52',
  'Sennheiser e609', 'Sennheiser e906', 'Sennheiser MD421', 'Sennheiser e604', 'Sennheiser e606', 'Sennheiser e901', 'Sennheiser e902', 'Sennheiser MD441', 'Sennheiser MKE 600',
  'Audix D6', 'Audix D4', 'Audix i5', 'Audix OM5', 'Audix OM6', 'Audix OM7', 'Audix OM2', 'Audix OM3', 'Audix D1', 'Audix D2', 'Audix F15', 'Audix SCX1', 'Audix TG D50', 'Audix TG D70', 'Audix VP88',
  'AKG D112', 'AKG C518', 'AKG C414', 'AKG C214', 'AKG C1000', 'AKG C535', 'AKG D12 VR', 'AKG D40',
  'Electro-Voice RE20', 'Electro-Voice RE320', 'Electro-Voice N/D468', 'Electro-Voice PL35',
  'Shure SM7', 'Shure KSM32', 'Shure Beta 87', 'Shure Beta 87A', 'Shure SM81', 'Shure KSM137', 'Shure KSM313', 'Shure KSM9', 'Shure Beta 98', 'Shure VP88',
  'Beyerdynamic M201', 'Beyerdynamic M88', 'Beyerdynamic TG V70',
  'DPA 4099', 'DPA d:vote 4099', 'DPA 2011',
  'Audio-Technica ATM350', 'Audio-Technica AE2500', 'Audio-Technica ATM250', 'Audio-Technica AT4050',
  'Heil PR22', 'Heil PR30', 'Heil PR40',
  'Rode NT5', 'Rode NT55', 'Rode M5',
  'Lewitt MTP 440', 'Lewitt MTP 550',
  '—',
];

const MIC_STAND_OPTIONS = ['Tall boom', 'Mid boom', 'Small boom', 'Standing', 'Short', '—'];
const CHANNEL_RANGES = [
  { key: '1-8', start: 0, end: 8 },
  { key: '9-16', start: 8, end: 16 },
  { key: '17-24', start: 16, end: 24 },
  { key: '25-32', start: 24, end: 32 },
] as const;

const CHANNEL_COLORS = [
  '#1e293b', '#334155', '#475569', '#64748b',
  '#f97316', '#22c55e', '#3b82f6', '#a855f7',
  '#ef4444', '#eab308', '#06b6d4', '#ec4899',
];

type BandMember = { id: number; display_name: string };

/** Channels 1-4 (per group) open right; 5-8 open left */
function usePopupSide(ch: number) {
  return (ch % 8) < 4;
}

/** Handheld microphone - Font Awesome */
function MicIcon({ size = 16 }: { size?: number }) {
  return <FaMicrophone size={size} aria-hidden />;
}

/** Wedge monitor - from user selection or default */
function WedgeIcon({ size = 16 }: { size?: number }) {
  const Icon = resolveWedgeIcon();
  return <Icon size={size} aria-hidden />;
}

/** IEM body pack - from user selection or default */
function IemIcon({ size = 16 }: { size?: number }) {
  const Icon = resolveIemIcon();
  return <Icon size={size} aria-hidden />;
}

function StripDivider() {
  return <div className="io-patch-strip-divider" aria-hidden />;
}

export default function IOPatchPage() {
  const [searchParams] = useSearchParams();
  const bandIdParam = searchParams.get('bandId');

  const [bands, setBands] = useState<{ id: number; name: string }[]>([]);
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [bandId, setBandId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [inputChannelRange, setInputChannelRange] = useState<typeof CHANNEL_RANGES[number]['key']>('1-8');
  const [outputChannelRange, setOutputChannelRange] = useState<typeof CHANNEL_RANGES[number]['key']>('1-8');
  const [showOutput, setShowOutput] = useState(false);

  const rangeConfig = CHANNEL_RANGES.find((r) => r.key === (showOutput ? outputChannelRange : inputChannelRange)) ?? CHANNEL_RANGES[0];
  const channelStart = rangeConfig.start;
  const channelEnd = rangeConfig.end;

  // Input patch state: channel index 0–31 -> { mic, stand }
  const [inputPatch, setInputPatch] = useState<
    Record<number, { mic: string; stand: string }>
  >(() => {
    const out: Record<number, { mic: string; stand: string }> = {};
    for (let i = 0; i < 32; i++) out[i] = { mic: '—', stand: '—' };
    return out;
  });

  // Output patch state: channel index 0–31 -> { type: 'Wedge'|'IEM'|'', member }
  const [outputPatch, setOutputPatch] = useState<
    Record<number, { type: string; member: string }>
  >(() => {
    const out: Record<number, { type: string; member: string }> = {};
    for (let i = 0; i < 32; i++) out[i] = { type: '', member: '—' };
    return out;
  });

  const [inputChannelColors, setInputChannelColors] = useState<Record<number, string>>({});
  const [outputChannelColors, setOutputChannelColors] = useState<Record<number, string>>({});
  const [inputChannelInstruments, setInputChannelInstruments] = useState<Record<number, string>>({});
  const [inputChannelInstrumentLabels, setInputChannelInstrumentLabels] = useState<Record<number, string>>({});
  const [inputChannelSkips, setInputChannelSkips] = useState<Record<number, boolean>>({});
  const [outputChannelSkips, setOutputChannelSkips] = useState<Record<number, boolean>>({});
  const [inputChannelLinks, setInputChannelLinks] = useState<Record<number, number>>({});
  const [outputChannelLinks, setOutputChannelLinks] = useState<Record<number, number>>({});
  const [inputChannelLR, setInputChannelLR] = useState<Record<number, 'L' | 'R' | ''>>({});
  const [outputChannelLR, setOutputChannelLR] = useState<Record<number, 'L' | 'R' | ''>>({});

  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedPatches, setSavedPatches] = useState<{ id: number; name: string; is_default: number; updated_at: string }[]>([]);

  const applyPatchData = (data: {
    inputChannelRange?: string;
    outputChannelRange?: string;
    channelRange?: string;
    showOutput?: boolean;
    inputPatch?: Record<number, { mic: string; stand: string }>;
    outputPatch?: Record<number, { type: string; member: string }>;
    inputChannelColors?: Record<number, string>;
    outputChannelColors?: Record<number, string>;
    inputChannelInstruments?: Record<number, string>;
    inputChannelInstrumentLabels?: Record<number, string>;
    inputChannelSkips?: Record<number, boolean>;
    outputChannelSkips?: Record<number, boolean>;
    inputChannelLinks?: Record<number, number>;
    outputChannelLinks?: Record<number, number>;
    inputChannelLR?: Record<number, string>;
    outputChannelLR?: Record<number, string>;
  }) => {
    if (data.inputChannelRange) setInputChannelRange(data.inputChannelRange as typeof CHANNEL_RANGES[number]['key']);
    if (data.outputChannelRange) setOutputChannelRange(data.outputChannelRange as typeof CHANNEL_RANGES[number]['key']);
    if (data.channelRange) {
      setInputChannelRange(data.channelRange as typeof CHANNEL_RANGES[number]['key']);
      setOutputChannelRange(data.channelRange as typeof CHANNEL_RANGES[number]['key']);
    }
    if (data.showOutput !== undefined) setShowOutput(data.showOutput);
    if (data.inputPatch) {
      const merged: Record<number, { mic: string; stand: string }> = {};
      for (let i = 0; i < 32; i++) {
        const s = data.inputPatch[i];
        merged[i] = s ? { mic: s.mic ?? '—', stand: s.stand ?? '—' } : { mic: '—', stand: '—' };
      }
      setInputPatch(merged);
    }
    if (data.outputPatch) {
      const merged: Record<number, { type: string; member: string }> = {};
      for (let i = 0; i < 32; i++) {
        const s = data.outputPatch[i];
        merged[i] = s ? { type: s.type ?? '', member: s.member ?? '—' } : { type: '', member: '—' };
      }
      setOutputPatch(merged);
    }
    if (data.inputChannelColors !== undefined) setInputChannelColors(data.inputChannelColors);
    if (data.outputChannelColors !== undefined) setOutputChannelColors(data.outputChannelColors);
    if (data.inputChannelInstruments !== undefined) setInputChannelInstruments(data.inputChannelInstruments);
    if (data.inputChannelInstrumentLabels !== undefined) setInputChannelInstrumentLabels(data.inputChannelInstrumentLabels);
    if (data.inputChannelSkips !== undefined) setInputChannelSkips(data.inputChannelSkips);
    if (data.outputChannelSkips !== undefined) setOutputChannelSkips(data.outputChannelSkips);
    if (data.inputChannelLinks !== undefined) setInputChannelLinks(data.inputChannelLinks);
    if (data.outputChannelLinks !== undefined) setOutputChannelLinks(data.outputChannelLinks);
    if (data.inputChannelLR !== undefined) setInputChannelLR(data.inputChannelLR as Record<number, 'L' | 'R' | ''>);
    if (data.outputChannelLR !== undefined) setOutputChannelLR(data.outputChannelLR as Record<number, 'L' | 'R' | ''>);
  };

  // Load patch: try DB default first, else localStorage
  useEffect(() => {
    if (!bandId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/default`), { credentials: 'include' });
        if (res.ok && mounted) {
          const json = (await res.json()) as { data: Record<string, unknown> };
          if (json.data) applyPatchData(json.data as Parameters<typeof applyPatchData>[0]);
          return;
        }
      } catch {
        /* fall through to localStorage */
      }
      if (!mounted) return;
      const saved = loadIoPatchState(bandId);
      if (saved) applyPatchData(saved);
      else {
        const defaultInput: Record<number, { mic: string; stand: string }> = {};
        for (let i = 0; i < 32; i++) defaultInput[i] = { mic: '—', stand: '—' };
        const defaultOutput: Record<number, { type: string; member: string }> = {};
        for (let i = 0; i < 32; i++) defaultOutput[i] = { type: '', member: '—' };
        setInputPatch(defaultInput);
        setOutputPatch(defaultOutput);
        setInputChannelColors({});
        setOutputChannelColors({});
        setInputChannelInstruments({});
        setInputChannelInstrumentLabels({});
        setInputChannelSkips({});
        setOutputChannelSkips({});
        setInputChannelLinks({});
        setOutputChannelLinks({});
        setInputChannelLR({});
        setOutputChannelLR({});
      }
    })();
    return () => { mounted = false; };
  }, [bandId]);

  // Persist patch state to localStorage whenever it changes
  useEffect(() => {
    if (!bandId) return;
    saveIoPatchState(bandId, {
      inputChannelRange,
      outputChannelRange,
      showOutput,
      inputPatch,
      outputPatch,
      inputChannelColors,
      outputChannelColors,
      inputChannelInstruments,
      inputChannelInstrumentLabels,
      inputChannelSkips,
      outputChannelSkips,
      inputChannelLinks,
      outputChannelLinks,
      inputChannelLR,
      outputChannelLR,
    });
  }, [
    bandId,
    inputChannelRange,
    outputChannelRange,
    showOutput,
    inputPatch,
    outputPatch,
    inputChannelColors,
    outputChannelColors,
    inputChannelInstruments,
    inputChannelInstrumentLabels,
    inputChannelSkips,
    outputChannelSkips,
    inputChannelLinks,
    outputChannelLinks,
    inputChannelLR,
    outputChannelLR,
  ]);

  useEffect(() => {
    if (!openPopupId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-io-patch-popup]') || target.closest('[data-io-patch-trigger]')) return;
      setOpenPopupId(null);
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopupId(null);
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [openPopupId]);

  useEffect(() => {
    const load = async () => {
      try {
        const bandsRes = await fetch(apiUrl('/api/bands'));
        if (bandsRes.ok) {
          const json = (await bandsRes.json()) as { id: number; name: string }[];
          setBands(json);
          const initialBandId = bandIdParam
            ? parseInt(bandIdParam, 10)
            : json[0]?.id;
          if (initialBandId && json.some((b) => b.id === initialBandId)) {
            setBandId(initialBandId);
          } else if (json[0]) {
            setBandId(json[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [bandIdParam]);

  useEffect(() => {
    if (!bandId) return;
    const loadMembers = async () => {
      try {
        const res = await fetch(apiUrl(`/api/pages/band/${bandId}`));
        if (res.ok) {
          const json = (await res.json()) as {
            bandMembers?: { user_id: number; display_name: string }[];
          };
          const members = (json.bandMembers || []).map((m) => ({
            id: m.user_id,
            display_name: m.display_name,
          }));
          setBandMembers(members);
        }
      } catch {
        // ignore
      }
    };
    void loadMembers();
  }, [bandId]);

  const handleInputMic = (ch: number, value: string) => {
    setInputPatch((prev) => ({ ...prev, [ch]: { ...prev[ch], mic: value } }));
  };
  const handleInputStand = (ch: number, value: string) => {
    setInputPatch((prev) => ({ ...prev, [ch]: { ...prev[ch], stand: value } }));
  };
  const handleOutputType = (ch: number, value: string) => {
    setOutputPatch((prev) => ({ ...prev, [ch]: { ...prev[ch], type: value } }));
  };
  const handleOutputTypeClear = (ch: number) => {
    setOutputPatch((prev) => ({ ...prev, [ch]: { ...prev[ch], type: '' } }));
  };
  const handleOutputMember = (ch: number, value: string) => {
    setOutputPatch((prev) => ({ ...prev, [ch]: { ...prev[ch], member: value } }));
  };

  const handleInputChannelColor = (ch: number, color: string) => {
    setInputChannelColors((prev) => ({ ...prev, [ch]: color }));
  };
  const handleOutputChannelColor = (ch: number, color: string) => {
    setOutputChannelColors((prev) => ({ ...prev, [ch]: color }));
  };

  const handleChannelInstrument = (ch: number, id: string) => {
    setInputChannelInstruments((prev) => ({ ...prev, [ch]: id }));
    setInputChannelInstrumentLabels((prev) => {
      const next = { ...prev };
      delete next[ch];
      return next;
    });
  };

  const handleChannelInstrumentLabel = (ch: number, label: string) => {
    setInputChannelInstrumentLabels((prev) => ({ ...prev, [ch]: label }));
  };

  const handleInputChannelSkip = (ch: number, skipped: boolean) => {
    setInputChannelSkips((prev) => ({ ...prev, [ch]: skipped }));
  };
  const handleOutputChannelSkip = (ch: number, skipped: boolean) => {
    setOutputChannelSkips((prev) => ({ ...prev, [ch]: skipped }));
  };

  const handleInputChannelLink = (ch: number, targetCh: number) => {
    setInputChannelLinks((prev) => {
      const next = { ...prev };
      const existing = next[ch];
      if (existing !== undefined) {
        delete next[ch];
        delete next[existing];
      }
      next[ch] = targetCh;
      next[targetCh] = ch;
      return next;
    });
  };
  const handleInputChannelUnlink = (ch: number) => {
    setInputChannelLinks((prev) => {
      const next = { ...prev };
      const target = next[ch];
      if (target !== undefined) {
        delete next[ch];
        delete next[target];
      }
      return next;
    });
  };
  const handleOutputChannelLink = (ch: number, targetCh: number) => {
    setOutputChannelLinks((prev) => {
      const next = { ...prev };
      const existing = next[ch];
      if (existing !== undefined) {
        delete next[ch];
        delete next[existing];
      }
      next[ch] = targetCh;
      next[targetCh] = ch;
      return next;
    });
  };
  const handleInputChannelLR = (ch: number, side: 'L' | 'R') => {
    setInputChannelLR((prev) => {
      const current = prev[ch];
      if (current === side) return { ...prev, [ch]: '' };
      return { ...prev, [ch]: side };
    });
  };
  const handleOutputChannelLR = (ch: number, side: 'L' | 'R') => {
    setOutputChannelLR((prev) => {
      const current = prev[ch];
      if (current === side) return { ...prev, [ch]: '' };
      return { ...prev, [ch]: side };
    });
  };

  const handleOutputChannelUnlink = (ch: number) => {
    setOutputChannelLinks((prev) => {
      const next = { ...prev };
      const target = next[ch];
      if (target !== undefined) {
        delete next[ch];
        delete next[target];
      }
      return next;
    });
  };

  const getPatchData = useCallback(() => ({
    inputChannelRange,
    outputChannelRange,
    showOutput,
    inputPatch,
    outputPatch,
    inputChannelColors,
    outputChannelColors,
    inputChannelInstruments,
    inputChannelInstrumentLabels,
    inputChannelSkips,
    outputChannelSkips,
    inputChannelLinks,
    outputChannelLinks,
    inputChannelLR,
    outputChannelLR,
  }), [
    inputChannelRange, outputChannelRange, showOutput, inputPatch, outputPatch, inputChannelColors, outputChannelColors,
    inputChannelInstruments, inputChannelInstrumentLabels, inputChannelSkips, outputChannelSkips, inputChannelLinks, outputChannelLinks,
    inputChannelLR, outputChannelLR,
  ]);

  useEffect(() => {
    if (!loadModalOpen || !bandId) return;
    setLoadError(null);
    fetch(apiUrl(`/api/assets/patch/${bandId}`), { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Failed to load list')))
      .then((json: { saves?: { id: number; name: string; is_default: number; updated_at: string }[] }) => {
        setSavedPatches(json.saves ?? []);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load'));
  }, [loadModalOpen, bandId]);

  const memberOptions = ['—', ...bandMembers.map((m) => m.display_name)];

  return (
    <div className="io-patch-page">
      <header className="io-patch-header">
        <div>
          <h1 className="io-patch-title">I/O patch</h1>
          <div className="io-patch-sub">Input and output routing</div>
        </div>
        <div className="io-patch-header-meta">
          {bands.length > 0 && (
            <select
              className="io-patch-band-select"
              value={bandId ?? ''}
              onChange={(e) => setBandId(Number(e.target.value))}
            >
              {bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <BackNavLink className="io-patch-back" />
        </div>
      </header>

      {loading ? (
        <div className="io-patch-loading">Loading…</div>
      ) : (
        <div className="io-patch-body">
          <div className="io-patch-content">
            <div className="io-patch-action-bar">
              <div className="io-patch-action-dropdown-wrap">
                <button
                  type="button"
                  className={`io-patch-action-btn ${saveModalOpen ? 'active' : ''}`}
                  title="Save"
                  onClick={() => setSaveModalOpen((v) => !v)}
                >
                  <Folder size={18} strokeWidth={2} />
                </button>
                {saveModalOpen && bandId && (
                  <IoPatchSaveModal
                    bandId={bandId}
                    getPatchData={getPatchData}
                    onClose={() => { setSaveModalOpen(false); setSaveError(null); }}
                    onSaved={() => setSaveModalOpen(false)}
                    saveError={saveError}
                    setSaveError={setSaveError}
                  />
                )}
              </div>
              <div className="io-patch-action-dropdown-wrap">
                <button
                  type="button"
                  className={`io-patch-action-btn ${loadModalOpen ? 'active' : ''}`}
                  title="Load"
                  onClick={() => setLoadModalOpen((v) => !v)}
                >
                  <Import size={18} strokeWidth={2} />
                </button>
                {loadModalOpen && bandId && (
                  <IoPatchLoadModal
                    bandId={bandId}
                    savedPatches={savedPatches}
                    loadError={loadError}
                    onClose={() => { setLoadModalOpen(false); setLoadError(null); }}
                    onLoad={(data) => {
                      applyPatchData(data);
                      saveIoPatchState(bandId, data);
                      setLoadModalOpen(false);
                    }}
                  />
                )}
              </div>
              <button type="button" className="io-patch-action-btn" title="Settings">
                <Settings size={18} strokeWidth={2} />
              </button>
            </div>
            <section className="io-patch-section">
              <div className="io-patch-strips-row">
                <div className="io-patch-toolbar">
                  <button
                    type="button"
                    className={`io-patch-io-toggle ${showOutput ? 'on' : 'off'}`}
                    onClick={() => setShowOutput((v) => !v)}
                    title={showOutput ? 'Output patch' : 'Input patch'}
                  >
                    {showOutput ? (
                      <>
                        <WedgeIcon size={14} />
                        <span>Out</span>
                      </>
                    ) : (
                      <>
                        <MicIcon size={14} />
                        <span>In</span>
                      </>
                    )}
                  </button>
                  <div className={`io-patch-range-group ${showOutput ? 'io-patch-range-output' : 'io-patch-range-input'}`}>
                    {CHANNEL_RANGES.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        className={`io-patch-range-btn ${(showOutput ? outputChannelRange : inputChannelRange) === r.key ? 'active' : ''}`}
                        onClick={() => showOutput ? setOutputChannelRange(r.key) : setInputChannelRange(r.key)}
                      >
                        {r.key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`io-patch-strips ${showOutput ? 'io-patch-strips-output' : 'io-patch-strips-input'}`}>
                {showOutput
                  ? Array.from({ length: channelEnd - channelStart }, (_, i) => {
                      const ch = channelStart + i;
                      return (
                        <div
                          key={ch}
                          className={`io-patch-strip ${outputChannelSkips[ch] ? 'skipped' : ''}`}
                          style={outputChannelColors[ch] ? { backgroundColor: `color-mix(in srgb, ${outputChannelColors[ch]} 22%, #1e1e1e)` } : undefined}
                        >
                          <ChannelNum
                            ch={ch}
                            color={outputChannelColors[ch]}
                            onColorChange={(c) => handleOutputChannelColor(ch, c)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                            icon={
                              outputPatch[ch]?.type === 'IEM' ? (
                                <IemIcon size={10} />
                              ) : (
                                <WedgeIcon size={10} />
                              )
                            }
                          />
                          <OutputTypeName value={outputPatch[ch]?.type ?? ''} />
                          <WedgeIemSelector
                            ch={ch}
                            value={outputPatch[ch]?.type ?? ''}
                            onChange={(v) => handleOutputType(ch, v)}
                            onClear={() => handleOutputTypeClear(ch)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <StripDivider />
                          <SelectButton
                            ch={ch}
                            popupKey={`out-member-${ch}`}
                            value={outputPatch[ch]?.member ?? '—'}
                            options={memberOptions}
                            onChange={(v) => handleOutputMember(ch, v)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <LrToggle
                            value={outputChannelLR[ch] ?? ''}
                            onChange={(side) => handleOutputChannelLR(ch, side)}
                          />
                          <LinkButton
                            ch={ch}
                            linkedCh={outputChannelLinks[ch]}
                            onLink={(target) => handleOutputChannelLink(ch, target)}
                            onUnlink={() => handleOutputChannelUnlink(ch)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <SkipButton
                            skipped={!!outputChannelSkips[ch]}
                            onChange={(v) => handleOutputChannelSkip(ch, v)}
                          />
                        </div>
                      );
                    })
                  : Array.from({ length: channelEnd - channelStart }, (_, i) => {
                      const ch = channelStart + i;
                      return (
                        <div
                          key={ch}
                          className={`io-patch-strip ${inputChannelSkips[ch] ? 'skipped' : ''}`}
                          style={inputChannelColors[ch] ? { backgroundColor: `color-mix(in srgb, ${inputChannelColors[ch]} 22%, #1e1e1e)` } : undefined}
                        >
                          <ChannelNum
                            ch={ch}
                            color={inputChannelColors[ch]}
                            onColorChange={(c) => handleInputChannelColor(ch, c)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                            icon="#"
                          />
                          <InstrumentNameEditable
                            value={inputChannelInstruments[ch]}
                            label={inputChannelInstrumentLabels[ch]}
                            onLabelChange={(l) => handleChannelInstrumentLabel(ch, l)}
                          />
                          <InstrumentButton
                            ch={ch}
                            value={inputChannelInstruments[ch]}
                            onChange={(id) => handleChannelInstrument(ch, id)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <MicSelector
                            ch={ch}
                            popupKey={`in-mic-${ch}`}
                            value={inputPatch[ch]?.mic ?? '—'}
                            options={MICROPHONE_LIST}
                            onChange={(v) => handleInputMic(ch, v)}
                            icon={<MicIcon size={12} />}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <StripDivider />
                          <SelectButton
                            ch={ch}
                            popupKey={`in-stand-${ch}`}
                            value={inputPatch[ch]?.stand ?? '—'}
                            options={MIC_STAND_OPTIONS}
                            onChange={(v) => handleInputStand(ch, v)}
                            icon={<span className="io-patch-stand-label">mic stand</span>}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <LrToggle
                            value={inputChannelLR[ch] ?? ''}
                            onChange={(side) => handleInputChannelLR(ch, side)}
                          />
                          <LinkButton
                            ch={ch}
                            linkedCh={inputChannelLinks[ch]}
                            onLink={(target) => handleInputChannelLink(ch, target)}
                            onUnlink={() => handleInputChannelUnlink(ch)}
                            openPopupId={openPopupId}
                            setOpenPopupId={setOpenPopupId}
                          />
                          <SkipButton
                            skipped={!!inputChannelSkips[ch]}
                            onChange={(v) => handleInputChannelSkip(ch, v)}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </section>
          </div>
          <aside className="io-patch-aside">
            {showOutput ? (
              <OutputPatchTable
                outputPatch={outputPatch}
                outputChannelSkips={outputChannelSkips}
                outputChannelLR={outputChannelLR}
                outputChannelLinks={outputChannelLinks}
              />
            ) : (
              <InputPatchTable
                inputPatch={inputPatch}
                inputChannelInstruments={inputChannelInstruments}
                inputChannelInstrumentLabels={inputChannelInstrumentLabels}
                inputChannelSkips={inputChannelSkips}
                inputChannelLR={inputChannelLR}
                inputChannelLinks={inputChannelLinks}
              />
            )}
          </aside>
        </div>
      )}

    </div>
  );
}

type IoPatchSaveModalProps = {
  bandId: number;
  getPatchData: () => IoPatchPersistedState;
  onClose: () => void;
  onSaved: () => void;
  saveError: string | null;
  setSaveError: (s: string | null) => void;
};

function IoPatchSaveModal({ bandId, getPatchData, onClose, onSaved, saveError, setSaveError }: IoPatchSaveModalProps) {
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const patchData = getPatchData();
  const isEmpty = isEmptyPatch(patchData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Untitled', setAsDefault, data: getPatchData() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Save failed (${res.status})`);
      }
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="io-patch-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="io-patch-modal io-patch-modal-dropdown" data-io-patch-popup onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="io-patch-modal-body">
          <label className="io-patch-modal-label">
            Save
            <input
              type="text"
              className="io-patch-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patch name"
              autoFocus
            />
          </label>
          <label className="io-patch-modal-checkbox">
            <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} disabled={isEmpty} />
            Set as default
          </label>
          {isEmpty && <div className="io-patch-modal-hint">Patch is empty — nothing to save. Configure channels first.</div>}
          {saveError && <div className="io-patch-modal-error">{saveError}</div>}
          <div className="io-patch-modal-actions">
            <button type="button" className="io-patch-modal-btn io-patch-modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="io-patch-modal-btn io-patch-modal-btn-primary" disabled={saving || isEmpty} title={isEmpty ? 'Patch is empty' : undefined}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

type IoPatchLoadModalProps = {
  bandId: number;
  savedPatches: { id: number; name: string; is_default: number; updated_at: string }[];
  loadError: string | null;
  onClose: () => void;
  onLoad: (data: IoPatchPersistedState) => void;
};

function IoPatchLoadModal({ bandId, savedPatches, loadError, onClose, onLoad }: IoPatchLoadModalProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleSelect = async (saveId: number) => {
    setLoadingId(saveId);
    try {
      const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/${saveId}`), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as { data: Record<string, unknown> };
      onLoad(json.data as IoPatchPersistedState);
    } catch {
      // could set error state
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="io-patch-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="io-patch-modal io-patch-modal-dropdown" data-io-patch-popup onClick={(e) => e.stopPropagation()}>
        <div className="io-patch-modal-body">
          {loadError && <div className="io-patch-modal-error">{loadError}</div>}
          <div className="io-patch-load-list">
            {savedPatches.length === 0 && !loadError && (
              <div className="io-patch-load-empty">No saved patches yet. Save one first.</div>
            )}
            {savedPatches.map((p) => (
              <button
                key={p.id}
                type="button"
                className="io-patch-load-item"
                onClick={() => handleSelect(p.id)}
                disabled={loadingId !== null}
              >
                <span className="io-patch-load-name">{p.name}</span>
                {p.is_default ? <span className="io-patch-load-badge">Default</span> : null}
                {loadingId === p.id ? <span className="io-patch-load-loading">Loading…</span> : null}
              </button>
            ))}
          </div>
          <div className="io-patch-modal-actions">
            <button type="button" className="io-patch-modal-btn io-patch-modal-btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}

type InputPatchTableProps = {
  inputPatch: Record<number, { mic: string; stand: string }>;
  inputChannelInstruments: Record<number, string>;
  inputChannelInstrumentLabels?: Record<number, string>;
  inputChannelSkips: Record<number, boolean>;
  inputChannelLR: Record<number, 'L' | 'R' | ''>;
  inputChannelLinks: Record<number, number>;
};

function InputPatchTable({ inputPatch, inputChannelInstruments, inputChannelInstrumentLabels, inputChannelSkips, inputChannelLR, inputChannelLinks }: InputPatchTableProps) {
  const buildDescription = (ch: number) => {
    const lr = inputChannelLR[ch] ?? '';
    const linked = inputChannelLinks[ch];
    const parts: string[] = [];
    if (lr) parts.push(lr);
    if (linked !== undefined) parts.push(`ch ${String(linked + 1).padStart(2, '0')}`);
    return parts.length ? parts.join(', ') : '—';
  };

  return (
    <div className="io-patch-table-wrap">
      <h3 className="io-patch-table-title">Input patch</h3>
      <div className="io-patch-table-scroll">
        <table className="io-patch-table">
          <thead>
            <tr>
              <th>Ch</th>
              <th>Instrument</th>
              <th>Microphone</th>
              <th>Stand</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 32 }, (_, i) => {
              const ch = i;
              const skipped = !!inputChannelSkips[ch];
              const instrument = inputChannelInstruments[ch];
              const inst = getInstrument(instrument);
              return (
                <tr key={ch} className={skipped ? 'skipped' : ''}>
                  <td className="io-patch-table-ch">{String(ch + 1).padStart(2, '0')}</td>
                  <td>{skipped ? '—' : ((inputChannelInstrumentLabels?.[ch] && inputChannelInstrumentLabels[ch] !== '') ? inputChannelInstrumentLabels[ch] : inst?.shortLabel) ?? '—'}</td>
                  <td>{skipped ? '—' : (inputPatch[ch]?.mic ?? '—')}</td>
                  <td>{skipped ? '—' : (inputPatch[ch]?.stand ?? '—')}</td>
                  <td>{skipped ? '—' : buildDescription(ch)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type OutputPatchTableProps = {
  outputPatch: Record<number, { type: string; member: string }>;
  outputChannelSkips: Record<number, boolean>;
  outputChannelLR: Record<number, 'L' | 'R' | ''>;
  outputChannelLinks: Record<number, number>;
};

function OutputPatchTable({ outputPatch, outputChannelSkips, outputChannelLR, outputChannelLinks }: OutputPatchTableProps) {
  const buildDescription = (ch: number) => {
    const lr = outputChannelLR[ch] ?? '';
    const linked = outputChannelLinks[ch];
    const parts: string[] = [];
    if (lr) parts.push(lr);
    if (linked !== undefined) parts.push(`ch ${String(linked + 1).padStart(2, '0')}`);
    return parts.length ? parts.join(', ') : '—';
  };

  return (
    <div className="io-patch-table-wrap">
      <h3 className="io-patch-table-title">Output patch</h3>
      <div className="io-patch-table-scroll">
        <table className="io-patch-table">
          <thead>
            <tr>
              <th>Ch</th>
              <th>Type</th>
              <th>Instrument</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 32 }, (_, i) => {
              const ch = i;
              const skipped = !!outputChannelSkips[ch];
              return (
                <tr key={ch} className={skipped ? 'skipped' : ''}>
                  <td className="io-patch-table-ch">{String(ch + 1).padStart(2, '0')}</td>
                  <td>{skipped ? '—' : (outputPatch[ch]?.type || '—')}</td>
                  <td>{skipped ? '—' : (outputPatch[ch]?.member ?? '—')}</td>
                  <td>{skipped ? '—' : buildDescription(ch)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type OutputTypeNameProps = {
  value: string;
};

function OutputTypeName({ value }: OutputTypeNameProps) {
  return (
    <div className="io-patch-instrument-name" title={value === 'Wedge' ? 'Wedge monitor' : value === 'IEM' ? 'IEM body pack' : ''}>
      {value || '—'}
    </div>
  );
}

type WedgeIemSelectorProps = {
  ch: number;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

function WedgeIemSelector({ ch, value, onChange, onClear, openPopupId, setOpenPopupId }: WedgeIemSelectorProps) {
  const popupId = `wedge-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-instrument-wrap">
      <button
        type="button"
        className="io-patch-instrument-btn"
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={value ? (value === 'Wedge' ? 'Wedge monitor' : 'IEM body pack') : 'Select type'}
        data-io-patch-trigger
      >
        {value === 'IEM' ? (
          <IemIcon size={22} />
        ) : value === 'Wedge' ? (
          <WedgeIcon size={22} />
        ) : (
          <span className="io-patch-instrument-placeholder">src</span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-instrument-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-instrument-picker io-patch-wedge-iem-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-instrument-clear"
              onClick={() => {
                onClear();
                setOpenPopupId(null);
              }}
              title="Clear"
            >
              ✕
            </button>
            <button
              type="button"
              className={`io-patch-instrument-swatch ${value === 'Wedge' ? 'active' : ''}`}
              onClick={() => {
                onChange('Wedge');
                setOpenPopupId(null);
              }}
              title="Wedge monitor"
            >
              <WedgeIcon size={40} />
            </button>
            <button
              type="button"
              className={`io-patch-instrument-swatch ${value === 'IEM' ? 'active' : ''}`}
              onClick={() => {
                onChange('IEM');
                setOpenPopupId(null);
              }}
              title="IEM body pack"
            >
              <IemIcon size={40} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type InstrumentNameEditableProps = {
  value?: string;
  label?: string;
  onLabelChange: (label: string) => void;
};

function InstrumentNameEditable({ value, label, onLabelChange }: InstrumentNameEditableProps) {
  const inst = getInstrument(value);
  const displayText = (label !== undefined && label !== '' ? label : inst?.shortLabel) ?? '—';
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const startEdit = () => {
    setEditText(displayText === '—' ? '' : displayText);
    setCursorPos(displayText === '—' ? 0 : displayText.length);
    setEditing(true);
    queueMicrotask(() => boxRef.current?.focus());
  };

  const commitEdit = () => {
    setEditing(false);
    onLabelChange(editText.trim());
  };

  useEffect(() => {
    if (editing) return;
    setEditText(displayText === '—' ? '' : displayText);
    setCursorPos(displayText === '—' ? 0 : displayText.length);
  }, [editing, displayText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
      setEditText(displayText === '—' ? '' : displayText);
      setCursorPos(displayText === '—' ? 0 : displayText.length);
      return;
    }
    e.preventDefault();
    if (e.key === 'Backspace') {
      if (cursorPos > 0) {
        const next = editText.slice(0, cursorPos - 1) + editText.slice(cursorPos);
        setEditText(next);
        setCursorPos(cursorPos - 1);
      }
      return;
    }
    if (e.key === 'Delete') {
      if (cursorPos < editText.length) {
        const next = editText.slice(0, cursorPos) + editText.slice(cursorPos + 1);
        setEditText(next);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      setCursorPos((p) => Math.max(0, p - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      setCursorPos((p) => Math.min(editText.length, p + 1));
      return;
    }
    if (e.key === 'Home') {
      setCursorPos(0);
      return;
    }
    if (e.key === 'End') {
      setCursorPos(editText.length);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const next = editText.slice(0, cursorPos) + e.key + editText.slice(cursorPos);
      setEditText(next);
      setCursorPos(cursorPos + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\r?\n/g, ' ');
    const next = editText.slice(0, cursorPos) + text + editText.slice(cursorPos);
    setEditText(next);
    setCursorPos(cursorPos + text.length);
  };

  if (!editing) {
    return (
      <div
        className="io-patch-instrument-name io-patch-instrument-name-editable"
        onClick={startEdit}
        title={inst?.label}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            startEdit();
          }
        }}
      >
        {displayText || '\u200b'}
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="io-patch-instrument-name io-patch-instrument-name-edit"
      role="textbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={commitEdit}
    >
      <span className="io-patch-instrument-name-text">{editText.slice(0, cursorPos)}</span>
      <span className="io-patch-mic-search-cursor" aria-hidden />
      <span className="io-patch-instrument-name-text">{editText.slice(cursorPos)}</span>
    </div>
  );
}

type LrToggleProps = {
  value: 'L' | 'R' | '';
  onChange: (side: 'L' | 'R') => void;
};

function LrToggle({ value, onChange }: LrToggleProps) {
  return (
    <div className="io-patch-lr-toggle">
      <button
        type="button"
        className={`io-patch-lr-btn ${value === 'L' ? 'on' : ''}`}
        onClick={() => onChange('L')}
        title="Left channel"
      >
        L
      </button>
      <button
        type="button"
        className={`io-patch-lr-btn ${value === 'R' ? 'on' : ''}`}
        onClick={() => onChange('R')}
        title="Right channel"
      >
        R
      </button>
    </div>
  );
}

type LinkButtonProps = {
  ch: number;
  linkedCh: number | undefined;
  onLink: (targetCh: number) => void;
  onUnlink: () => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

function LinkButton({ ch, linkedCh, onLink, onUnlink, openPopupId, setOpenPopupId }: LinkButtonProps) {
  const popupId = `link-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);
  const isLinked = linkedCh !== undefined;

  return (
    <div className="io-patch-link-wrap">
      <button
        type="button"
        className={`io-patch-link-btn ${isLinked ? 'linked' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={isLinked ? `Linked to channel ${String(linkedCh + 1).padStart(2, '0')}` : 'Link channel'}
        data-io-patch-trigger
      >
        <Link size={16} strokeWidth={2} />
        {isLinked && <span className="io-patch-link-num">{String(linkedCh + 1).padStart(2, '0')}</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-link-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-link-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            {isLinked ? (
              <button
                type="button"
                className="io-patch-link-unlink"
                onClick={() => {
                  onUnlink();
                  setOpenPopupId(null);
                }}
              >
                Unlink
              </button>
            ) : (
              <div className="io-patch-link-channel-grid">
                {Array.from({ length: 32 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`io-patch-link-channel-btn ${i === ch ? 'self' : ''}`}
                    onClick={() => {
                      if (i !== ch) {
                        onLink(i);
                        setOpenPopupId(null);
                      }
                    }}
                    disabled={i === ch}
                    title={i === ch ? 'Same channel' : `Link to channel ${String(i + 1).padStart(2, '0')}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type SkipButtonProps = {
  skipped: boolean;
  onChange: (skipped: boolean) => void;
};

function SkipButton({ skipped, onChange }: SkipButtonProps) {
  return (
    <button
      type="button"
      className={`io-patch-skip-btn ${skipped ? 'on' : 'off'}`}
      onClick={() => onChange(!skipped)}
      title={skipped ? 'Channel skipped' : 'Skip channel'}
    >
      Skip
    </button>
  );
}

type InstrumentButtonProps = {
  ch: number;
  value?: string;
  onChange: (id: string) => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

function InstrumentButton({ ch, value, onChange, openPopupId, setOpenPopupId }: InstrumentButtonProps) {
  const popupId = `instrument-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);
  const inst = getInstrument(value);
  const Icon = inst?.Icon;

  return (
    <div className="io-patch-instrument-wrap">
      <button
        type="button"
        className="io-patch-instrument-btn"
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={inst?.label ?? 'Select instrument'}
        data-io-patch-trigger
      >
        {Icon ? <Icon size={22} /> : <span className="io-patch-instrument-placeholder">src</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-instrument-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-instrument-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-instrument-clear"
              onClick={() => {
                onChange('');
                setOpenPopupId(null);
              }}
              title="Clear"
            >
              ✕
            </button>
            {getInstruments().map((i) => {
              const Icon = i.Icon;
              return (
                <button
                  key={i.id}
                  type="button"
                  className={`io-patch-instrument-swatch ${value === i.id ? 'active' : ''}`}
                onClick={() => {
                  onChange(i.id);
                  setOpenPopupId(null);
                }}
                  title={i.label}
                >
                  <Icon size={40} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

type ChannelNumProps = {
  ch: number;
  color?: string;
  onColorChange: (color: string) => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
  icon: React.ReactNode;
};

function ChannelNum({ ch, color, onColorChange, openPopupId, setOpenPopupId, icon }: ChannelNumProps) {
  const popupId = `color-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-ch-num-wrap">
      <button
        type="button"
        className={`io-patch-ch-num ${color ? 'has-color' : ''}`}
        style={color ? { borderColor: color, boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px ${color}40` } : undefined}
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        data-io-patch-trigger
      >
        <span className="io-patch-ch-icon">{icon}</span>
        {String(ch + 1).padStart(2, '0')}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-color-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-color-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-color-swatch io-patch-color-clear"
                onClick={() => {
                  onColorChange('');
                  setOpenPopupId(null);
                }}
              title="Clear color"
            >
              ✕
            </button>
            {CHANNEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="io-patch-color-swatch"
                style={{ backgroundColor: c }}
                onClick={() => {
                  onColorChange(color === c ? '' : c);
                  setOpenPopupId(null);
                }}
                title={c}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function fuzzyMatch(query: string, option: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const opt = option.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((w) => opt.includes(w));
}

type MicSelectorProps = {
  ch: number;
  popupKey: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

function MicSelector({ ch, popupKey, value, options, onChange, icon, openPopupId, setOpenPopupId }: MicSelectorProps) {
  const isOpen = openPopupId === popupKey;
  const openRight = usePopupSide(ch);
  const [search, setSearch] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter((opt) => fuzzyMatch(search, opt))
    : options;

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setCursorPos(0);
      setSearchExpanded(false);
      setHighlightedIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchExpanded) {
      queueMicrotask(() => searchRef.current?.focus());
    }
  }, [searchExpanded]);

  useEffect(() => {
    if (!isOpen || searchExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSearchExpanded(true);
        setSearch(e.key);
        setCursorPos(1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, searchExpanded]);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [search]);

  useEffect(() => {
    setCursorPos((p) => Math.min(p, search.length));
  }, [search]);

  useEffect(() => {
    if (!searchExpanded || filtered.length === 0) return;
    listRef.current?.querySelector('[data-highlighted]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedIdx, searchExpanded, filtered]);

  return (
    <div className="io-patch-select-wrap">
      <button
        type="button"
        className={`io-patch-select-btn ${icon ? 'has-icon' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupKey)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Microphone: ${value}`}
        data-io-patch-trigger
      >
        {icon && <span className="io-patch-select-icon">{icon}</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-select-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div
            className={`io-patch-select-dropdown io-patch-mic-dropdown ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`}
            data-io-patch-popup
            role="listbox"
            aria-label="Select microphone"
          >
            <div className={`io-patch-mic-search ${searchExpanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className="io-patch-mic-search-trigger"
                onClick={() => !searchExpanded && setSearchExpanded(true)}
                aria-label="Search microphones"
              >
                <Search size={16} strokeWidth={2} className="io-patch-mic-search-icon" />
              </button>
              <div
                ref={searchRef}
                className="io-patch-mic-search-box"
                role="textbox"
                tabIndex={0}
                aria-label="Search microphones"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIdx((i) => Math.min(i + 1, filtered.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIdx((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter' && filtered[highlightedIdx]) {
                    e.preventDefault();
                    onChange(filtered[highlightedIdx]);
                    setOpenPopupId(null);
                    return;
                  }
                  e.preventDefault();
                  if (e.key === 'Backspace') {
                    if (cursorPos > 0) {
                      const next = search.slice(0, cursorPos - 1) + search.slice(cursorPos);
                      setSearch(next);
                      setCursorPos(cursorPos - 1);
                    }
                    return;
                  }
                  if (e.key === 'Delete') {
                    if (cursorPos < search.length) {
                      const next = search.slice(0, cursorPos) + search.slice(cursorPos + 1);
                      setSearch(next);
                    }
                    return;
                  }
                  if (e.key === 'ArrowLeft') {
                    setCursorPos((p) => Math.max(0, p - 1));
                    return;
                  }
                  if (e.key === 'ArrowRight') {
                    setCursorPos((p) => Math.min(search.length, p + 1));
                    return;
                  }
                  if (e.key === 'Home') {
                    setCursorPos(0);
                    return;
                  }
                  if (e.key === 'End') {
                    setCursorPos(search.length);
                    return;
                  }
                  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const next = search.slice(0, cursorPos) + e.key + search.slice(cursorPos);
                    setSearch(next);
                    setCursorPos(cursorPos + 1);
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text/plain').replace(/\r?\n/g, ' ');
                  const next = search.slice(0, cursorPos) + text + search.slice(cursorPos);
                  setSearch(next);
                  setCursorPos(cursorPos + text.length);
                }}
              >
                <span className="io-patch-mic-search-text">{search.slice(0, cursorPos)}</span>
                <span className="io-patch-mic-search-cursor" aria-hidden />
                <span className="io-patch-mic-search-text">{search.slice(cursorPos)}</span>
              </div>
            </div>
            <div className="io-patch-mic-list" ref={listRef}>
              {filtered.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={opt === value || (searchExpanded && idx === highlightedIdx)}
                  data-highlighted={searchExpanded && idx === highlightedIdx ? '' : undefined}
                  className={`io-patch-select-opt ${opt === value ? 'active' : ''} ${searchExpanded && idx === highlightedIdx ? 'highlighted' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    setOpenPopupId(null);
                  }}
                >
                  {opt}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="io-patch-mic-no-results">No matches</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type SelectButtonProps = {
  ch: number;
  popupKey: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  optionIcons?: Record<string, React.ReactNode>;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

function SelectButton({ ch, popupKey, value, options, onChange, icon, optionIcons, openPopupId, setOpenPopupId }: SelectButtonProps) {
  const isOpen = openPopupId === popupKey;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-select-wrap">
      <button
        type="button"
        className={`io-patch-select-btn ${icon ? 'has-icon' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupKey)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-io-patch-trigger
      >
        {icon && <span className="io-patch-select-icon">{icon}</span>}
        {value}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-select-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div
            className={`io-patch-select-dropdown ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`}
            data-io-patch-popup
            role="listbox"
            aria-label="Select option"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={opt === value}
                className={`io-patch-select-opt ${opt === value ? 'active' : ''} ${optionIcons?.[opt] ? 'has-icon' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setOpenPopupId(null);
                }}
              >
                {optionIcons?.[opt] && (
                  <span className="io-patch-select-opt-icon">{optionIcons[opt]}</span>
                )}
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
