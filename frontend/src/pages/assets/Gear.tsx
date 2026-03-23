import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackNavLink from '../../components/BackNavLink';
import { Folder, Import, Settings } from 'lucide-react';
import { useIsPatchTableBelow } from './ioPatchHooks';
import { StripFrame } from './io-patch/StripFrame';
import { GEAR_CATALOG, type GearOption } from './gearCatalog';
import { apiUrl } from '../../config/api';
import './IOPatchPage.css';

type Member = {
  id: number;
  nick: string;
  fullName: string;
  avatarColor: string;
  gearOptions: GearOption[];
};

type MemberGearState = {
  required: boolean;
  activeGear: Record<string, boolean>;
};

const MOCK_MEMBERS: Member[] = [
  { id: 1, nick: 'Uki', fullName: 'Uros Tadic', avatarColor: '#334155', gearOptions: [GEAR_CATALOG.drumsYamaha, GEAR_CATALOG.drumsPearl, GEAR_CATALOG.cymbalsPaiste, GEAR_CATALOG.sticksVicFirth, GEAR_CATALOG.throneRocNsoc, GEAR_CATALOG.none] },
  { id: 2, nick: 'Pindo', fullName: 'Nikola Jezdic', avatarColor: '#7c2d12', gearOptions: [GEAR_CATALOG.stratFender, GEAR_CATALOG.prsCustom24, GEAR_CATALOG.ampOrange, GEAR_CATALOG.pedalboardA, GEAR_CATALOG.wirelessGuitar, GEAR_CATALOG.none] },
  { id: 3, nick: 'Geri', fullName: 'Dusan Bogovic', avatarColor: '#1d4ed8', gearOptions: [GEAR_CATALOG.bassStingray, GEAR_CATALOG.bassPrecision, GEAR_CATALOG.ampAmpeg, GEAR_CATALOG.pedalboardBass, GEAR_CATALOG.diActive, GEAR_CATALOG.none] },
  { id: 4, nick: 'Marko', fullName: 'Marko Stojanovic-Luois', avatarColor: '#9333ea', gearOptions: [GEAR_CATALOG.nordStage, GEAR_CATALOG.vocalMicShure, GEAR_CATALOG.percussionPack, GEAR_CATALOG.inEarRack, GEAR_CATALOG.playbackRig, GEAR_CATALOG.none] },
  { id: 5, nick: 'Vlasta', fullName: 'Vlada Jovancic', avatarColor: '#047857', gearOptions: [GEAR_CATALOG.martinD28, GEAR_CATALOG.taylor714, GEAR_CATALOG.acousticDi, GEAR_CATALOG.clipMicShure, GEAR_CATALOG.capoStrings, GEAR_CATALOG.none] },
  { id: 6, nick: 'Vlada', fullName: 'Vladimir Jovanovic', avatarColor: '#b91c1c', gearOptions: [GEAR_CATALOG.trumpetYamaha, GEAR_CATALOG.trumpetClip, GEAR_CATALOG.bellStand, GEAR_CATALOG.muteSet, GEAR_CATALOG.wirelessBeltpack, GEAR_CATALOG.none] },
  { id: 7, nick: 'Stameni', fullName: 'Ivan Stamenkovic', avatarColor: '#0f766e', gearOptions: [GEAR_CATALOG.clarinetA, GEAR_CATALOG.saxAlto, GEAR_CATALOG.clipMicDual, GEAR_CATALOG.reedKit, GEAR_CATALOG.instrumentStand, GEAR_CATALOG.none] },
  { id: 8, nick: 'Dare', fullName: 'Darko Dimitrijevic', avatarColor: '#a16207', gearOptions: [GEAR_CATALOG.trumpetYamaha, GEAR_CATALOG.tromboneTenor, GEAR_CATALOG.clipMicDual, GEAR_CATALOG.muteSet, GEAR_CATALOG.brassStand, GEAR_CATALOG.none] },
  { id: 9, nick: 'Deki', fullName: 'Dejan Miljanovic', avatarColor: '#be185d', gearOptions: [GEAR_CATALOG.consoleM32, GEAR_CATALOG.stageboxDl32, GEAR_CATALOG.vocalRack, GEAR_CATALOG.cableCase, GEAR_CATALOG.measureMic, GEAR_CATALOG.none] },
  { id: 10, nick: 'Zdravko', fullName: 'Zdravko Vulin', avatarColor: '#374151', gearOptions: [GEAR_CATALOG.productionBinder, GEAR_CATALOG.showLaptop, GEAR_CATALOG.commsHeadset, GEAR_CATALOG.hospitalityFolder, GEAR_CATALOG.transportPack, GEAR_CATALOG.none] },
];

function initActiveGear(options: GearOption[]): Record<string, boolean> {
  const active: Record<string, boolean> = {};
  for (const opt of options) {
    if (opt.full === '—') continue;
    active[opt.full] = true;
  }
  return active;
}

function nicknameInitials(nick: string) {
  return nick.slice(0, 2).toUpperCase();
}

function GearPatchTable({ members, stateById }: { members: Member[]; stateById: Record<number, MemberGearState> }) {
  return (
    <div className="io-patch-table-wrap">
      <h3 className="io-patch-table-title">Gear patch</h3>
      <div className="io-patch-table-scroll">
        <table className="io-patch-table">
          <thead>
            <tr>
              <th>Nickname</th>
              <th>Instr 1</th>
              <th>Instr 2</th>
              <th>Instr 3</th>
              <th>Instr 4</th>
              <th>Instr 5</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const row = stateById[m.id];
              const active = m.gearOptions
                .filter((o) => o.full !== '—' && row?.activeGear?.[o.full])
                .slice(0, 5);
              const slots = [
                active[0] ?? GEAR_CATALOG.none,
                active[1] ?? GEAR_CATALOG.none,
                active[2] ?? GEAR_CATALOG.none,
                active[3] ?? GEAR_CATALOG.none,
                active[4] ?? GEAR_CATALOG.none,
              ];
              return (
                <tr key={m.id} className={!row.required ? 'skipped' : ''}>
                  <td className="io-patch-table-ch">{m.nick}</td>
                  <td>{row.required ? slots[0].short : 'not used'}</td>
                  <td>{row.required ? slots[1].short : 'not used'}</td>
                  <td>{row.required ? slots[2].short : 'not used'}</td>
                  <td>{row.required ? slots[3].short : 'not used'}</td>
                  <td>{row.required ? slots[4].short : 'not used'}</td>
                  <td>{row.required ? 'on' : 'off'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GearPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isPatchTableBelow = useIsPatchTableBelow();
  const [patchTableExpanded, setPatchTableExpanded] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [loadPanelOpen, setLoadPanelOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadMembersError, setLoadMembersError] = useState<string | null>(null);
  const bandIdParam = searchParams.get('bandId');
  const [stateById, setStateById] = useState<Record<number, MemberGearState>>(() =>
    Object.fromEntries(MOCK_MEMBERS.map((m) => [m.id, { required: true, activeGear: initActiveGear(m.gearOptions) }])),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingMembers(true);
      setLoadMembersError(null);
      try {
        let bandId = Number(bandIdParam || NaN);
        if (!Number.isFinite(bandId)) {
          const bandsRes = await fetch(apiUrl('/api/bands'), { credentials: 'include' });
          if (bandsRes.ok) {
            const bands = (await bandsRes.json()) as { id: number }[];
            if (bands[0]?.id) {
              bandId = Number(bands[0].id);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('bandId', String(bandId));
                return next;
              }, { replace: true });
            }
          }
        }
        if (!Number.isFinite(bandId)) throw new Error('No band selected');

        const res = await fetch(apiUrl(`/api/assets/gear-plan/${bandId}`), { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = (await res.json()) as { members?: Member[] };
        const nextMembers = Array.isArray(json.members) && json.members.length > 0 ? json.members : MOCK_MEMBERS;
        if (!mounted) return;
        setMembers(nextMembers);
        setStateById((prev) => {
          const next: Record<number, MemberGearState> = {};
          for (const m of nextMembers) {
            const existing = prev[m.id];
            next[m.id] = existing ?? { required: true, activeGear: initActiveGear(m.gearOptions) };
          }
          return next;
        });
      } catch (e) {
        if (!mounted) return;
        setMembers(MOCK_MEMBERS);
        setLoadMembersError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        if (mounted) setLoadingMembers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bandIdParam, setSearchParams]);

  const rangeSize = 8;
  const ranges = useMemo(() => {
    const out: { key: string; start: number; end: number }[] = [];
    for (let start = 0; start < members.length; start += rangeSize) {
      const end = Math.min(start + rangeSize, members.length);
      out.push({ key: `${start + 1}-${end}`, start, end });
    }
    return out;
  }, [members]);
  const [activeRangeKey, setActiveRangeKey] = useState(ranges[0]?.key || '1-8');
  useEffect(() => {
    if (!ranges.some((r) => r.key === activeRangeKey) && ranges[0]?.key) {
      setActiveRangeKey(ranges[0].key);
    }
  }, [ranges, activeRangeKey]);
  const activeRange = ranges.find((r) => r.key === activeRangeKey) || ranges[0];
  const visibleMembers = members.slice(activeRange.start, activeRange.end);
  const maxGearRows = useMemo(() => {
    return visibleMembers.reduce((max, member) => {
      const count = member.gearOptions.filter((opt) => opt.full !== '—').length;
      return Math.max(max, count);
    }, 0);
  }, [visibleMembers]);

  return (
    <div className="io-patch-page gear-page-x32">
      <div className="io-patch-workspace">
        <div className="io-patch-workspace-toolbar" aria-label="Gear workspace">
          <span className="io-patch-workspace-label">Gear patch</span>
          <span className="io-patch-workspace-hint">Date planning · per band {loadingMembers ? '· loading members…' : ''}</span>
          <span className="io-patch-workspace-toolbar-spacer" aria-hidden />
          <BackNavLink className="io-patch-back io-patch-back--toolbar" label="Back" />
        </div>
        <div className={`io-patch-body ${isPatchTableBelow ? 'io-patch-body-stacked' : ''} ${patchTableExpanded ? 'io-patch-patch-expanded' : ''}`}>
          <div className="io-patch-content">
            <div className="io-patch-action-bar">
              <div className="io-patch-action-dropdown-wrap">
                <button type="button" className={`io-patch-action-btn ${savePanelOpen ? 'active' : ''}`} onClick={() => { setLoadPanelOpen(false); setSavePanelOpen((v) => !v); }}>
                  <Folder size={18} strokeWidth={2} />
                </button>
                {savePanelOpen ? (
                  <div className="io-patch-modal io-patch-modal-dropdown io-patch-modal--load" data-io-patch-popup>
                    <div className="io-patch-modal-body">
                      <span className="io-patch-load-heading">Mock save panel</span>
                      <div className="io-patch-modal-hint">We will wire save/load behavior later.</div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="io-patch-action-dropdown-wrap">
                <button type="button" className={`io-patch-action-btn ${loadPanelOpen ? 'active' : ''}`} onClick={() => { setSavePanelOpen(false); setLoadPanelOpen((v) => !v); }}>
                  <Import size={18} strokeWidth={2} />
                </button>
                {loadPanelOpen ? (
                  <div className="io-patch-modal io-patch-modal-dropdown io-patch-modal--load" data-io-patch-popup>
                    <div className="io-patch-modal-body">
                      <span className="io-patch-load-heading">Load patch:</span>
                      <div className="io-patch-load-empty">Mock mode. Load list will be wired later.</div>
                    </div>
                  </div>
                ) : null}
              </div>
              <button type="button" className="io-patch-action-btn" onClick={() => { setSavePanelOpen(false); setLoadPanelOpen(false); }}>
                <Settings size={18} strokeWidth={2} />
              </button>
            </div>

            <section className="io-patch-section">
              <div className="strip-layout-row">
                <div className="io-toolbar">
                  <div className="io-patch-range-group io-patch-range-input">
                    {ranges.map((r) => (
                      <button key={r.key} type="button" className={`io-patch-range-btn ${activeRange.key === r.key ? 'active' : ''}`} onClick={() => setActiveRangeKey(r.key)}>
                        {r.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="strip-row strip-row--input">
                  {loadMembersError ? <div className="io-patch-modal-error">{loadMembersError} (using mock list)</div> : null}
                  {visibleMembers.map((member) => {
                    const row = stateById[member.id];
                    return (
                      <StripFrame key={member.id} className="io-strip" skipped={!row.required}>
                        <button
                          type="button"
                          className="io-patch-ch-num has-color"
                          style={{
                            borderColor: member.avatarColor,
                            borderWidth: 2,
                            background: `linear-gradient(180deg, color-mix(in srgb, ${member.avatarColor} 22%, #283442) 0%, color-mix(in srgb, ${member.avatarColor} 18%, #1d2731) 100%)`,
                            boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 10px ${member.avatarColor}45`,
                            minHeight: '30px',
                          }}
                          title={member.fullName}
                        >
                          <span className="io-patch-ch-icon">{nicknameInitials(member.nick)}</span>
                        </button>

                        <div className="io-patch-instrument-name" title={member.fullName}>
                          {member.nick}
                        </div>

                        <div className="gear-crt-list" aria-label={`${member.nick} gear list`}>
                          {Array.from({ length: maxGearRows }, (_, gearIdx) => {
                            const option = member.gearOptions.filter((opt) => opt.full !== '—')[gearIdx];
                            if (!option) {
                              return (
                                <div
                                  key={`${member.id}-crt-empty-${gearIdx}`}
                                  className="gear-crt-row gear-crt-row-empty"
                                  aria-hidden
                                >
                                  &nbsp;
                                </div>
                              );
                            }
                            return (
                              <div key={`${member.id}-${option.full}`} className="gear-crt-row" title={option.full}>
                                {option.full}
                              </div>
                            );
                          })}
                        </div>

                        <div className="gear-toggle-row">
                          {Array.from({ length: maxGearRows }, (_, gearIdx) => {
                            const option = member.gearOptions.filter((opt) => opt.full !== '—')[gearIdx];
                            if (!option) {
                              return (
                                <div
                                  key={`${member.id}-toggle-empty-${gearIdx}`}
                                  className="gear-inst-toggle gear-inst-toggle-empty"
                                  aria-hidden
                                />
                              );
                            }
                            const isOn = !!row.activeGear[option.full];
                            return (
                              <button
                                key={`${member.id}-toggle-${option.full}`}
                                type="button"
                                className={`gear-inst-toggle ${isOn ? 'on' : 'off'}`}
                                title={option.full}
                                onClick={() =>
                                  setStateById((prev) => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      activeGear: {
                                        ...prev[member.id].activeGear,
                                        [option.full]: !isOn,
                                      },
                                    },
                                  }))
                                }
                              >
                                {option.short}
                              </button>
                            );
                          })}
                        </div>

                        <div className="gear-use-divider" aria-hidden />

                        <button
                          type="button"
                          className={`io-patch-skip-btn ${row.required ? 'off' : 'on'}`}
                          onClick={() =>
                            setStateById((prev) => ({
                              ...prev,
                              [member.id]: { ...prev[member.id], required: !prev[member.id].required },
                            }))
                          }
                          title={row.required ? 'Member required for this date' : 'Member not required for this date'}
                        >
                          Use
                        </button>
                      </StripFrame>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside className={`io-patch-aside ${isPatchTableBelow ? 'io-patch-aside-below' : ''}`}>
            {isPatchTableBelow ? (
              <div className="io-patch-accordion">
                <button type="button" className="io-patch-accordion-trigger" onClick={() => setPatchTableExpanded((v) => !v)} aria-expanded={patchTableExpanded} aria-controls="gear-patch-accordion-panel">
                  <span className="io-patch-accordion-label">Gear patch table</span>
                  <span className="io-patch-accordion-icon" aria-hidden>{patchTableExpanded ? '▴' : '▾'}</span>
                </button>
                <div id="gear-patch-accordion-panel" className={`io-patch-accordion-panel ${patchTableExpanded ? 'expanded' : ''}`} role="region">
                  {patchTableExpanded && (
                    <>
                      <div className="io-patch-accordion-backdrop" onClick={() => setPatchTableExpanded(false)} aria-hidden />
                      <button type="button" className="io-patch-accordion-close" onClick={() => setPatchTableExpanded(false)} aria-label="Close patch table">✕</button>
                    </>
                  )}
                  {patchTableExpanded && <GearPatchTable members={members} stateById={stateById} />}
                </div>
              </div>
            ) : (
              <GearPatchTable members={members} stateById={stateById} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

