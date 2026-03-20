/**
 * I/O patch page: band list, persisted patch state, API load/save wiring, and channel handlers.
 * Keeps IOPatchPage.tsx focused on layout and presentational wiring.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../../../config/api';
import { loadIoPatchState, saveIoPatchState, isEmptyPatch, type IoPatchPersistedState } from '../ioPatchStorage';
import {
  CHANNEL_RANGES,
  CHANNEL_RANGES_PORTRAIT,
  type ChannelRangeKey,
} from '../ioPatchConstants';

/** Payload from API / partial saves — same fields the page previously merged in `applyPatchData`. */
export type IoPatchDataUpdate = {
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
};

export type UseIoPatchStateOptions = {
  /** `searchParams.get('bandId')` */
  bandIdParam: string | null;
  /**
   * When set (gig deep-link `?dateId=`), load patch from server (`for-date` = bound save or band default),
   * never the band-wide localStorage draft. After apply, UI is forced to Input + ch 1–8 (1–4 portrait).
   */
  dateId: number | null;
  /** From `useIsPortrait()` — drives which channel range presets exist. */
  isPortrait: boolean;
};

export function useIoPatchState({ bandIdParam, dateId, isPortrait }: UseIoPatchStateOptions) {
  const [bandId, setBandId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const channelRanges = isPortrait ? CHANNEL_RANGES_PORTRAIT : CHANNEL_RANGES;
  const [inputChannelRange, setInputChannelRange] = useState<ChannelRangeKey>('1-8');
  const [outputChannelRange, setOutputChannelRange] = useState<ChannelRangeKey>('1-8');
  const [showOutput, setShowOutput] = useState(false);

  const [inputPatch, setInputPatch] = useState<
    Record<number, { mic: string; stand: string }>
  >(() => {
    const out: Record<number, { mic: string; stand: string }> = {};
    for (let i = 0; i < 32; i++) out[i] = { mic: '—', stand: '—' };
    return out;
  });

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
  const hasRestoredRef = useRef(false);
  const [patchSwitching, setPatchSwitching] = useState(false);

  const applyPatchData = useCallback((data: IoPatchDataUpdate) => {
    if (data.inputChannelRange) setInputChannelRange(data.inputChannelRange as ChannelRangeKey);
    if (data.outputChannelRange) setOutputChannelRange(data.outputChannelRange as ChannelRangeKey);
    if (data.channelRange) {
      setInputChannelRange(data.channelRange as ChannelRangeKey);
      setOutputChannelRange(data.channelRange as ChannelRangeKey);
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
  }, []);

  /** After loading patch JSON for a gig, always show Input + first 8 channels (first 4 in portrait). */
  const applyDateEntryViewDefaults = useCallback(() => {
    setShowOutput(false);
    setInputChannelRange((isPortrait ? '1-4' : '1-8') as ChannelRangeKey);
    setOutputChannelRange((isPortrait ? '1-4' : '1-8') as ChannelRangeKey);
  }, [isPortrait]);

  const rangeConfig = useMemo(() => {
    const current = showOutput ? outputChannelRange : inputChannelRange;
    const found = channelRanges.find((r) => r.key === current);
    return found ?? channelRanges[0];
  }, [channelRanges, showOutput, outputChannelRange, inputChannelRange]);
  const channelStart = rangeConfig.start;
  const channelEnd = rangeConfig.end;

  /* Normalize range when switching portrait ↔ desktop */
  useEffect(() => {
    const validIn = channelRanges.some((r) => r.key === inputChannelRange);
    const validOut = channelRanges.some((r) => r.key === outputChannelRange);
    if (!validIn) setInputChannelRange(channelRanges[0].key);
    if (!validOut) setOutputChannelRange(channelRanges[0].key);
  }, [channelRanges, inputChannelRange, outputChannelRange]);

  // Load patch: gig date → server (bound save or default), then force Input + ch 1–8. Band page → local draft, else default.
  useEffect(() => {
    if (!bandId) return;
    hasRestoredRef.current = false;
    setPatchSwitching(true);
    let mounted = true;
    (async () => {
      const applyEmptyFallback = () => {
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
      };

      if (dateId != null) {
        try {
          const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/for-date/${dateId}`), {
            credentials: 'include',
          });
          if (res.ok && mounted) {
            const json = (await res.json()) as { data?: Record<string, unknown> };
            if (json.data && typeof json.data === 'object') {
              applyPatchData(json.data as IoPatchDataUpdate);
              applyDateEntryViewDefaults();
              if (mounted) {
                hasRestoredRef.current = true;
                setPatchSwitching(false);
              }
              return;
            }
          }
        } catch {
          /* fall through */
        }
        if (!mounted) return;
        applyEmptyFallback();
        applyDateEntryViewDefaults();
        if (mounted) {
          hasRestoredRef.current = true;
          setPatchSwitching(false);
        }
        return;
      }

      const saved = loadIoPatchState(bandId);
      if (saved && !isEmptyPatch(saved)) {
        if (mounted) {
          applyPatchData(saved);
          hasRestoredRef.current = true;
          setPatchSwitching(false);
        }
        return;
      }
      try {
        const res = await fetch(apiUrl(`/api/assets/patch/${bandId}/default`), { credentials: 'include' });
        if (res.ok && mounted) {
          const json = (await res.json()) as { data: Record<string, unknown> };
          if (json.data) {
            applyPatchData(json.data as IoPatchDataUpdate);
            if (mounted) {
              hasRestoredRef.current = true;
              setPatchSwitching(false);
            }
            return;
          }
        }
      } catch {
        /* fall through */
      }
      if (!mounted) return;
      if (saved) {
        applyPatchData(saved);
      } else {
        applyEmptyFallback();
      }
      if (mounted) {
        hasRestoredRef.current = true;
        setPatchSwitching(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bandId, dateId, applyPatchData, applyDateEntryViewDefaults]);

  // Persist to localStorage after initial restore for this band
  useEffect(() => {
    if (!bandId || !hasRestoredRef.current) return;
    saveIoPatchState(
      bandId,
      {
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
      },
      dateId,
    );
  }, [
    bandId,
    dateId,
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

  const getPatchData = useCallback((): IoPatchPersistedState => ({
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
    if (!bandId) return;
    setLoadError(null);
    fetch(apiUrl(`/api/assets/patch/${bandId}`), { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Failed to load list')))
      .then((json: { saves?: { id: number; name: string; is_default: number; updated_at: string }[] }) => {
        setSavedPatches(json.saves ?? []);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load'));
  }, [bandId]);

  const onLoadSavedPatch = useCallback(
    (data: IoPatchPersistedState) => {
      applyPatchData(data);
      if (dateId != null) applyDateEntryViewDefaults();
      if (bandId != null) saveIoPatchState(bandId, data, dateId);
      setLoadModalOpen(false);
    },
    [bandId, dateId, applyPatchData, applyDateEntryViewDefaults],
  );

  return {
    loading,
    bandId,
    channelRanges,
    channelStart,
    channelEnd,
    inputChannelRange,
    setInputChannelRange,
    outputChannelRange,
    setOutputChannelRange,
    showOutput,
    setShowOutput,
    // Patch data
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
    // Popups / modals
    openPopupId,
    setOpenPopupId,
    saveModalOpen,
    setSaveModalOpen,
    loadModalOpen,
    setLoadModalOpen,
    saveError,
    setSaveError,
    loadError,
    setLoadError,
    savedPatches,
    patchSwitching,
    // API / persistence
    getPatchData,
    applyPatchData,
    onLoadSavedPatch,
    // Handlers
    handleInputMic,
    handleInputStand,
    handleOutputType,
    handleOutputTypeClear,
    handleOutputMember,
    handleInputChannelColor,
    handleOutputChannelColor,
    handleChannelInstrument,
    handleChannelInstrumentLabel,
    handleInputChannelSkip,
    handleOutputChannelSkip,
    handleInputChannelLink,
    handleInputChannelUnlink,
    handleOutputChannelLink,
    handleOutputChannelUnlink,
    handleInputChannelLR,
    handleOutputChannelLR,
  };
}
