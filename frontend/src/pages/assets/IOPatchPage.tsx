import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackNavLink from '../../components/BackNavLink';
import { Folder, Import, Settings } from 'lucide-react';
import {
  MICROPHONE_LIST,
  MIC_STAND_OPTIONS,
  OUTPUT_INSTRUMENT_OPTIONS,
} from './ioPatchConstants';
import { useIsPatchTableBelow, useIsPortrait } from './ioPatchHooks';
import { useIoPatchState } from './io-patch/useIoPatchState';
import { IemIcon, MicIcon, StripDivider, WedgeIcon } from './io-patch/IoPatchIcons';
import { IoPatchLoadModal, IoPatchSaveModal } from './io-patch/IoPatchModals';
import { InputPatchTable, OutputPatchTable } from './io-patch/IoPatchTables';
import {
  ChannelNum,
  InstrumentButton,
  InstrumentNameEditable,
  LinkButton,
  LrToggle,
  MicSelector,
  OutputTypeName,
  SelectButton,
  SkipButton,
  WedgeIemSelector,
} from './io-patch/controls';
import { StripFrame } from './io-patch/StripFrame';
import './IOPatchPage.css';

export default function IOPatchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bandIdParam = searchParams.get('bandId');
  const dateIdParam = searchParams.get('dateId');
  const dateIdNum = useMemo(() => {
    if (!dateIdParam) return null;
    const n = parseInt(dateIdParam, 10);
    return Number.isFinite(n) ? n : null;
  }, [dateIdParam]);
  const isPortrait = useIsPortrait();
  const isPatchTableBelow = useIsPatchTableBelow();
  /** Accordion / layout only — not part of patch persistence. */
  const [patchTableExpanded, setPatchTableExpanded] = useState(false);

  const io = useIoPatchState({
    bandIdParam,
    dateId: dateIdNum,
    isPortrait,
  });

  /** Keep ?bandId= in sync with sidebar rail when defaulting to first band. */
  useEffect(() => {
    if (bandIdParam) return;
    if (io.loading || io.bandId == null) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('bandId', String(io.bandId));
        return next;
      },
      { replace: true },
    );
  }, [bandIdParam, io.loading, io.bandId, setSearchParams]);

  return (
    <div className="io-patch-page">
      <div className="io-patch-workspace">
        <div className="io-patch-workspace-toolbar" aria-label="I/O patch workspace">
          <span className="io-patch-workspace-label">I/O patch</span>
          <span className="io-patch-workspace-hint">Input / output routing</span>
          {dateIdParam ? (
            <span className="io-patch-workspace-scope">
              Date #{dateIdParam} · patch for this gig
            </span>
          ) : null}
          <span className="io-patch-workspace-toolbar-spacer" aria-hidden />
          <BackNavLink className="io-patch-back io-patch-back--toolbar" label="Back" />
        </div>

        {io.loading ? (
          <div className="io-patch-loading io-patch-loading--workspace">Loading…</div>
        ) : (
        <div
          className={`io-patch-body ${isPatchTableBelow ? 'io-patch-body-stacked' : ''} ${patchTableExpanded ? 'io-patch-patch-expanded' : ''}`}
        >
          {io.patchSwitching && <div className="io-patch-band-switch-bar" aria-hidden />}
          <div className="io-patch-content">
            <div className="io-patch-action-bar">
              <div className="io-patch-action-dropdown-wrap">
                <button
                  type="button"
                  className={`io-patch-action-btn ${io.saveModalOpen ? 'active' : ''}`}
                  title={
                    io.loading
                      ? 'Loading…'
                      : io.bandId == null
                        ? 'No band — cannot save'
                        : 'Save'
                  }
                  disabled={io.loading || io.bandId == null}
                  onClick={() => {
                    io.setLoadModalOpen(false);
                    io.setLoadError(null);
                    io.setSaveModalOpen((v) => !v);
                  }}
                >
                  <Folder size={18} strokeWidth={2} />
                </button>
                {io.saveModalOpen && io.bandId && (
                  <IoPatchSaveModal
                    bandId={io.bandId}
                    getPatchData={io.getPatchData}
                    onClose={() => { io.setSaveModalOpen(false); io.setSaveError(null); }}
                    onSaved={() => io.setSaveModalOpen(false)}
                    saveError={io.saveError}
                    setSaveError={io.setSaveError}
                  />
                )}
              </div>
              <div className="io-patch-action-dropdown-wrap">
                <button
                  type="button"
                  className={`io-patch-action-btn ${io.loadModalOpen ? 'active' : ''}`}
                  title={
                    io.loading
                      ? 'Loading…'
                      : io.bandId == null
                        ? 'No band — cannot load'
                        : 'Load'
                  }
                  disabled={io.loading || io.bandId == null}
                  onClick={() => {
                    io.setSaveModalOpen(false);
                    io.setSaveError(null);
                    io.setLoadModalOpen((v) => !v);
                  }}
                >
                  <Import size={18} strokeWidth={2} />
                </button>
                {io.loadModalOpen && io.bandId && (
                  <IoPatchLoadModal
                    bandId={io.bandId}
                    savedPatches={io.savedPatches}
                    loadError={io.loadError}
                    onClose={() => { io.setLoadModalOpen(false); io.setLoadError(null); }}
                    onLoad={io.onLoadSavedPatch}
                    dateId={dateIdNum}
                  />
                )}
              </div>
              <button
                type="button"
                className="io-patch-action-btn"
                title="Settings"
                onClick={() => {
                  io.setSaveModalOpen(false);
                  io.setSaveError(null);
                  io.setLoadModalOpen(false);
                  io.setLoadError(null);
                }}
              >
                <Settings size={18} strokeWidth={2} />
              </button>
            </div>
            <section className="io-patch-section">
              <div className="strip-layout-row">
                <div className="io-toolbar">
                  <button
                    type="button"
                    className={`io-patch-io-toggle ${io.showOutput ? 'on' : 'off'}`}
                    onClick={() => io.setShowOutput((v) => !v)}
                    title={io.showOutput ? 'Output patch' : 'Input patch'}
                  >
                    {io.showOutput ? (
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
                  <div className={`io-patch-range-group ${io.showOutput ? 'io-patch-range-output' : 'io-patch-range-input'} ${isPortrait ? 'io-patch-range-portrait' : ''}`}>
                    {io.channelRanges.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        className={`io-patch-range-btn ${(io.showOutput ? io.outputChannelRange : io.inputChannelRange) === r.key ? 'active' : ''}`}
                        onClick={() => io.showOutput ? io.setOutputChannelRange(r.key) : io.setInputChannelRange(r.key)}
                      >
                        {r.key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`strip-row ${io.showOutput ? 'strip-row--output' : 'strip-row--input'}`}>
                {io.showOutput
                  ? Array.from({ length: io.channelEnd - io.channelStart }, (_, i) => {
                      const ch = io.channelStart + i;
                      return (
                        <StripFrame
                          key={ch}
                          className="io-strip"
                          skipped={!!io.outputChannelSkips[ch]}
                          style={io.outputChannelColors[ch] ? { backgroundColor: `color-mix(in srgb, ${io.outputChannelColors[ch]} 22%, #1e1e1e)` } : undefined}
                        >
                          <ChannelNum
                            ch={ch}
                            color={io.outputChannelColors[ch]}
                            onColorChange={(c) => io.handleOutputChannelColor(ch, c)}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                            icon={
                              io.outputPatch[ch]?.type === 'IEM' ? (
                                <IemIcon size={10} />
                              ) : (
                                <WedgeIcon size={10} />
                              )
                            }
                          />
                          <OutputTypeName value={io.outputPatch[ch]?.type ?? ''} />
                          <WedgeIemSelector
                            ch={ch}
                            value={io.outputPatch[ch]?.type ?? ''}
                            onChange={(v) => io.handleOutputType(ch, v)}
                            onClear={() => io.handleOutputTypeClear(ch)}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <StripDivider />
                          <SelectButton
                            ch={ch}
                            popupKey={`out-member-${ch}`}
                            value={io.outputPatch[ch]?.member ?? '—'}
                            options={[...OUTPUT_INSTRUMENT_OPTIONS]}
                            onChange={(v) => io.handleOutputMember(ch, v)}
                            placeholder="inst"
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <LrToggle
                            value={io.outputChannelLR[ch] ?? ''}
                            onChange={(side) => io.handleOutputChannelLR(ch, side)}
                          />
                          <LinkButton
                            ch={ch}
                            linkedCh={io.outputChannelLinks[ch]}
                            onLink={(target) => io.handleOutputChannelLink(ch, target)}
                            onUnlink={() => io.handleOutputChannelUnlink(ch)}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <SkipButton
                            skipped={!!io.outputChannelSkips[ch]}
                            onChange={(v) => io.handleOutputChannelSkip(ch, v)}
                          />
                        </StripFrame>
                      );
                    })
                  : Array.from({ length: io.channelEnd - io.channelStart }, (_, i) => {
                      const ch = io.channelStart + i;
                      return (
                        <StripFrame
                          key={ch}
                          className="io-strip"
                          skipped={!!io.inputChannelSkips[ch]}
                          style={io.inputChannelColors[ch] ? { backgroundColor: `color-mix(in srgb, ${io.inputChannelColors[ch]} 22%, #1e1e1e)` } : undefined}
                        >
                          <ChannelNum
                            ch={ch}
                            color={io.inputChannelColors[ch]}
                            onColorChange={(c) => io.handleInputChannelColor(ch, c)}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                            icon="#"
                          />
                          <InstrumentNameEditable
                            value={io.inputChannelInstruments[ch]}
                            label={io.inputChannelInstrumentLabels[ch]}
                            onLabelChange={(l) => io.handleChannelInstrumentLabel(ch, l)}
                          />
                          <InstrumentButton
                            ch={ch}
                            value={io.inputChannelInstruments[ch]}
                            onChange={(id) => io.handleChannelInstrument(ch, id)}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <MicSelector
                            ch={ch}
                            popupKey={`in-mic-${ch}`}
                            value={io.inputPatch[ch]?.mic ?? '—'}
                            options={[...MICROPHONE_LIST]}
                            onChange={(v) => io.handleInputMic(ch, v)}
                            icon={<MicIcon size={12} />}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <StripDivider />
                          <SelectButton
                            ch={ch}
                            popupKey={`in-stand-${ch}`}
                            value={io.inputPatch[ch]?.stand ?? '—'}
                            options={[...MIC_STAND_OPTIONS]}
                            onChange={(v) => io.handleInputStand(ch, v)}
                            placeholder="mic stand"
                            dropdownClassName="io-patch-stand-dropdown"
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <LrToggle
                            value={io.inputChannelLR[ch] ?? ''}
                            onChange={(side) => io.handleInputChannelLR(ch, side)}
                          />
                          <LinkButton
                            ch={ch}
                            linkedCh={io.inputChannelLinks[ch]}
                            onLink={(target) => io.handleInputChannelLink(ch, target)}
                            onUnlink={() => io.handleInputChannelUnlink(ch)}
                            openPopupId={io.openPopupId}
                            setOpenPopupId={io.setOpenPopupId}
                          />
                          <SkipButton
                            skipped={!!io.inputChannelSkips[ch]}
                            onChange={(v) => io.handleInputChannelSkip(ch, v)}
                          />
                        </StripFrame>
                      );
                    })}
                </div>
              </div>
            </section>
          </div>
          <aside
            className={`io-patch-aside ${isPatchTableBelow ? 'io-patch-aside-below' : ''}`}
          >
            {isPatchTableBelow ? (
              <div className="io-patch-accordion">
                <button
                  type="button"
                  className="io-patch-accordion-trigger"
                  onClick={() => setPatchTableExpanded((v) => !v)}
                  aria-expanded={patchTableExpanded}
                  aria-controls="io-patch-accordion-panel"
                >
                  <span className="io-patch-accordion-label">
                    {io.showOutput ? 'Output patch' : 'Input patch'}
                  </span>
                  <span className="io-patch-accordion-icon" aria-hidden>
                    {patchTableExpanded ? '▴' : '▾'}
                  </span>
                </button>
                <div
                  id="io-patch-accordion-panel"
                  className={`io-patch-accordion-panel ${patchTableExpanded ? 'expanded' : ''}`}
                  role="region"
                  aria-label={io.showOutput ? 'Output patch table' : 'Input patch table'}
                >
                  {patchTableExpanded && (
                    <>
                      <div
                        className="io-patch-accordion-backdrop"
                        onClick={() => setPatchTableExpanded(false)}
                        aria-hidden
                      />
                      <button
                        type="button"
                        className="io-patch-accordion-close"
                        onClick={() => setPatchTableExpanded(false)}
                        aria-label="Close patch table"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  {io.showOutput ? (
                    <OutputPatchTable
                      outputPatch={io.outputPatch}
                      outputChannelSkips={io.outputChannelSkips}
                      outputChannelLR={io.outputChannelLR}
                      outputChannelLinks={io.outputChannelLinks}
                    />
                  ) : (
                    <InputPatchTable
                      inputPatch={io.inputPatch}
                      inputChannelInstruments={io.inputChannelInstruments}
                      inputChannelInstrumentLabels={io.inputChannelInstrumentLabels}
                      inputChannelSkips={io.inputChannelSkips}
                      inputChannelLR={io.inputChannelLR}
                      inputChannelLinks={io.inputChannelLinks}
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                {io.showOutput ? (
                  <OutputPatchTable
                    outputPatch={io.outputPatch}
                    outputChannelSkips={io.outputChannelSkips}
                    outputChannelLR={io.outputChannelLR}
                    outputChannelLinks={io.outputChannelLinks}
                  />
                ) : (
                  <InputPatchTable
                    inputPatch={io.inputPatch}
                    inputChannelInstruments={io.inputChannelInstruments}
                    inputChannelInstrumentLabels={io.inputChannelInstrumentLabels}
                    inputChannelSkips={io.inputChannelSkips}
                    inputChannelLR={io.inputChannelLR}
                    inputChannelLinks={io.inputChannelLinks}
                  />
                )}
              </>
            )}
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
