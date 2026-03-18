/**
 * Minimal Testing Ground. Your icon choices are stored in localStorage and used
 * by IOPatchPage and instrument icons. Use "Choose icons" to open the picker again.
 */
import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { getInstruments } from '../assets/instrumentIcons';
import { BehringerIcon } from '../../assets/behringer-icons/BehringerIcon';
import { FaDrum, FaGuitar, FaMusic, FaDrumSteelpan, FaVolumeUp, FaHeadphones } from 'react-icons/fa';
import { FaVolumeHigh } from 'react-icons/fa6';
import { PiPianoKeys, PiGuitar, PiSpeakerHigh, PiHeadphones } from 'react-icons/pi';
import { MdPiano, MdMusicNote, MdSpeaker, MdHeadphones, MdVolumeUp, MdMonitor, MdEarbuds } from 'react-icons/md';
import { BsSpeaker, BsHeadphones, BsEarbuds } from 'react-icons/bs';
import { HiSpeakerWave } from 'react-icons/hi2';
import { HiVolumeUp, HiSpeakerphone } from 'react-icons/hi';
import { GiSpeaker, GiHeadphones, GiEarbuds, GiGuitar, GiGuitarBassHead } from 'react-icons/gi';
import { TbDeviceSpeaker, TbHeadphones } from 'react-icons/tb';
import { RxSpeakerLoud } from 'react-icons/rx';
import { ImVolumeHigh } from 'react-icons/im';
import { LiaVolumeUpSolid } from 'react-icons/lia';
import { TiVolumeUp } from 'react-icons/ti';
import { GrVolumeControl } from 'react-icons/gr';
import { FcSpeaker } from 'react-icons/fc';
import { FiSpeaker, FiVolume2 } from 'react-icons/fi';
import { IoMdVolumeHigh } from 'react-icons/io';
import { ImHeadphones } from 'react-icons/im';
import { LiaHeadphonesSolid } from 'react-icons/lia';
import { TiHeadphones } from 'react-icons/ti';
import { FiHeadphones } from 'react-icons/fi';
import { RiHeadphoneFill } from 'react-icons/ri';
import { TfiHeadphone } from 'react-icons/tfi';
import { SlEarphones } from 'react-icons/sl';
import { LuMonitorSpeaker, LuMonitor } from 'react-icons/lu';
import { PiMonitor } from 'react-icons/pi';
import { FiMonitor } from 'react-icons/fi';
import { CiMonitor } from 'react-icons/ci';
import { LuGuitar } from 'react-icons/lu';
import { LiaGuitarSolid } from 'react-icons/lia';

const STORAGE_KEY_BEHRINGER = 'testing-ground-behringer-selection';
const STORAGE_KEY_GAME_ICONS = 'testing-ground-game-icons-selection';
const STORAGE_KEY_FA = 'testing-ground-fa-selection';
const STORAGE_KEY_PHOSPHOR = 'testing-ground-phosphor-selection';
const STORAGE_KEY_MATERIAL = 'testing-ground-material-selection';
const STORAGE_KEY_WEDGE = 'testing-ground-wedge-selection';
const STORAGE_KEY_IEM = 'testing-ground-iem-selection';
const STORAGE_KEY_GUITAR = 'testing-ground-guitar-selection';

type IconSelection = { checked: boolean; label: string };

const BEHRINGER_ALL_ICONS = [
  { id: 1, label: 'No icon' }, { id: 2, label: 'Kick Back' }, { id: 3, label: 'Kick Front' }, { id: 4, label: 'Snare Top' }, { id: 5, label: 'Snare Bottom' },
  { id: 6, label: 'High Tom' }, { id: 7, label: 'Mid Tom' }, { id: 8, label: 'Floor Tom' }, { id: 9, label: 'Hi-Hat' }, { id: 10, label: 'Ride' },
  { id: 11, label: 'Drum Kit' }, { id: 12, label: 'Cowbell' }, { id: 13, label: 'Bongos' }, { id: 14, label: 'Congas' }, { id: 15, label: 'Tambourine' },
  { id: 16, label: 'Vibraphone' }, { id: 17, label: 'Electric Bass' }, { id: 18, label: 'Acoustic Bass' }, { id: 19, label: 'Contrabass' },
  { id: 20, label: 'Les Paul Guitar' }, { id: 21, label: 'Ibanez Guitar' }, { id: 22, label: 'Washburn Guitar' }, { id: 23, label: 'Acoustic Guitar' },
  { id: 24, label: 'Bass Amp' }, { id: 25, label: 'Guitar Amp' }, { id: 26, label: 'Amp Cabinet' }, { id: 27, label: 'Piano' }, { id: 28, label: 'Organ' },
  { id: 29, label: 'Harpsichord' }, { id: 30, label: 'Keyboard' }, { id: 31, label: 'Synthesizer 1' }, { id: 32, label: 'Synthesizer 2' }, { id: 33, label: 'Synthesizer 3' }, { id: 34, label: 'Keytar' },
  { id: 35, label: 'Trumpet' }, { id: 36, label: 'Trombone' }, { id: 37, label: 'Saxophone' }, { id: 38, label: 'Clarinet' }, { id: 39, label: 'Violin' }, { id: 40, label: 'Cello' },
  { id: 41, label: 'Male Vocal' }, { id: 42, label: 'Female Vocal' }, { id: 43, label: 'Choir' }, { id: 44, label: 'Hand Sign' }, { id: 45, label: 'Talk A' }, { id: 46, label: 'Talk B' },
  { id: 47, label: 'Large Diaphragm Mic' }, { id: 48, label: 'Condenser Mic Left' }, { id: 49, label: 'Condenser Mic Right' }, { id: 50, label: 'Handheld Mic' },
  { id: 51, label: 'Wireless Mic' }, { id: 52, label: 'Podium Mic' }, { id: 53, label: 'Headset Mic' }, { id: 54, label: 'XLR Jack' }, { id: 55, label: 'TRS Plug' },
  { id: 56, label: 'TRS Plug Left' }, { id: 57, label: 'TRS Plug Right' }, { id: 58, label: 'RCA Plug Left' }, { id: 59, label: 'RCA Plug Right' }, { id: 60, label: 'Reel to Reel' },
  { id: 61, label: 'FX' }, { id: 62, label: 'Computer' }, { id: 63, label: 'Monitor Wedge' }, { id: 64, label: 'Left Speaker' }, { id: 65, label: 'Right Speaker' },
  { id: 66, label: 'Speaker Array' }, { id: 67, label: 'Speaker on Pole' }, { id: 68, label: 'Amp Rack' }, { id: 69, label: 'Controls' }, { id: 70, label: 'Fader' },
  { id: 71, label: 'MixBus' }, { id: 72, label: 'Matrix' }, { id: 73, label: 'Routing' }, { id: 74, label: 'Smiley' },
];

type IconDef = { id: string; label: string; Icon: (p: { size?: number }) => ReactNode };

const FA_INSTRUMENTS: IconDef[] = [
  { id: 'fa-drum', label: 'Drum', Icon: ({ size = 28 }) => <FaDrum size={size} /> },
  { id: 'fa-guitar', label: 'Guitar', Icon: ({ size = 28 }) => <FaGuitar size={size} /> },
  { id: 'fa-music', label: 'Music', Icon: ({ size = 28 }) => <FaMusic size={size} /> },
  { id: 'fa-steelpan', label: 'Steelpan', Icon: ({ size = 28 }) => <FaDrumSteelpan size={size} /> },
];

const PHOSPHOR_INSTRUMENTS: IconDef[] = [
  { id: 'pi-piano', label: 'Piano', Icon: ({ size = 28 }) => <PiPianoKeys size={size} /> },
  { id: 'pi-guitar', label: 'Guitar', Icon: ({ size = 28 }) => <PiGuitar size={size} /> },
];

const MATERIAL_INSTRUMENTS: IconDef[] = [
  { id: 'md-piano', label: 'Piano', Icon: ({ size = 28 }) => <MdPiano size={size} /> },
  { id: 'md-music', label: 'Music note', Icon: ({ size = 28 }) => <MdMusicNote size={size} /> },
];

const WEDGE_ICONS: IconDef[] = [
  { id: 'fa-volume', label: 'Volume (FA)', Icon: ({ size = 28 }) => <FaVolumeUp size={size} /> },
  { id: 'fa6-volume', label: 'Volume (FA6)', Icon: ({ size = 28 }) => <FaVolumeHigh size={size} /> },
  { id: 'md-speaker', label: 'Speaker (Md)', Icon: ({ size = 28 }) => <MdSpeaker size={size} /> },
  { id: 'md-volume', label: 'Volume (Md)', Icon: ({ size = 28 }) => <MdVolumeUp size={size} /> },
  { id: 'pi-speaker', label: 'Speaker (Pi)', Icon: ({ size = 28 }) => <PiSpeakerHigh size={size} /> },
  { id: 'bs-speaker', label: 'Speaker (Bs)', Icon: ({ size = 28 }) => <BsSpeaker size={size} /> },
  { id: 'hi2-speaker', label: 'Speaker (Hi2)', Icon: ({ size = 28 }) => <HiSpeakerWave size={size} /> },
  { id: 'hi-volume', label: 'Volume (Hi)', Icon: ({ size = 28 }) => <HiVolumeUp size={size} /> },
  { id: 'hi-speakerphone', label: 'Speakerphone (Hi)', Icon: ({ size = 28 }) => <HiSpeakerphone size={size} /> },
  { id: 'gi-speaker', label: 'Speaker (Gi)', Icon: ({ size = 28 }) => <GiSpeaker size={size} /> },
  { id: 'tb-speaker', label: 'Speaker (Tb)', Icon: ({ size = 28 }) => <TbDeviceSpeaker size={size} /> },
  { id: 'rx-speaker', label: 'Speaker (Rx)', Icon: ({ size = 28 }) => <RxSpeakerLoud size={size} /> },
  { id: 'im-volume', label: 'Volume (Im)', Icon: ({ size = 28 }) => <ImVolumeHigh size={size} /> },
  { id: 'lia-volume', label: 'Volume (Lia)', Icon: ({ size = 28 }) => <LiaVolumeUpSolid size={size} /> },
  { id: 'ti-volume', label: 'Volume (Ti)', Icon: ({ size = 28 }) => <TiVolumeUp size={size} /> },
  { id: 'gr-volume', label: 'Volume (Gr)', Icon: ({ size = 28 }) => <GrVolumeControl size={size} /> },
  { id: 'fc-speaker', label: 'Speaker (Fc)', Icon: ({ size = 28 }) => <FcSpeaker size={size} /> },
  { id: 'fi-speaker', label: 'Speaker (Fi)', Icon: ({ size = 28 }) => <FiSpeaker size={size} /> },
  { id: 'fi-volume', label: 'Volume (Fi)', Icon: ({ size = 28 }) => <FiVolume2 size={size} /> },
  { id: 'io-volume', label: 'Volume (Io)', Icon: ({ size = 28 }) => <IoMdVolumeHigh size={size} /> },
  { id: 'lu-monitor-spk', label: 'Monitor+Spk (Lu)', Icon: ({ size = 28 }) => <LuMonitorSpeaker size={size} /> },
  { id: 'lu-monitor', label: 'Monitor (Lu)', Icon: ({ size = 28 }) => <LuMonitor size={size} /> },
  { id: 'pi-monitor', label: 'Monitor (Pi)', Icon: ({ size = 28 }) => <PiMonitor size={size} /> },
  { id: 'md-monitor', label: 'Monitor (Md)', Icon: ({ size = 28 }) => <MdMonitor size={size} /> },
  { id: 'fi-monitor', label: 'Monitor (Fi)', Icon: ({ size = 28 }) => <FiMonitor size={size} /> },
  { id: 'ci-monitor', label: 'Monitor (Ci)', Icon: ({ size = 28 }) => <CiMonitor size={size} /> },
  { id: 'beh-64', label: 'L Speaker (Beh)', Icon: ({ size = 28 }) => <BehringerIcon id={64} size={size} /> },
  { id: 'beh-65', label: 'R Speaker (Beh)', Icon: ({ size = 28 }) => <BehringerIcon id={65} size={size} /> },
];

const IEM_ICONS: IconDef[] = [
  { id: 'fa-headphones', label: 'Headphones (FA)', Icon: ({ size = 28 }) => <FaHeadphones size={size} /> },
  { id: 'md-headphones', label: 'Headphones (Md)', Icon: ({ size = 28 }) => <MdHeadphones size={size} /> },
  { id: 'md-earbuds', label: 'Earbuds (Md)', Icon: ({ size = 28 }) => <MdEarbuds size={size} /> },
  { id: 'pi-headphones', label: 'Headphones (Pi)', Icon: ({ size = 28 }) => <PiHeadphones size={size} /> },
  { id: 'bs-headphones', label: 'Headphones (Bs)', Icon: ({ size = 28 }) => <BsHeadphones size={size} /> },
  { id: 'bs-earbuds', label: 'Earbuds (Bs)', Icon: ({ size = 28 }) => <BsEarbuds size={size} /> },
  { id: 'gi-headphones', label: 'Headphones (Gi)', Icon: ({ size = 28 }) => <GiHeadphones size={size} /> },
  { id: 'gi-earbuds', label: 'Earbuds (Gi)', Icon: ({ size = 28 }) => <GiEarbuds size={size} /> },
  { id: 'sl-earphones', label: 'Earphones (Sl)', Icon: ({ size = 28 }) => <SlEarphones size={size} /> },
  { id: 'tb-headphones', label: 'Headphones (Tb)', Icon: ({ size = 28 }) => <TbHeadphones size={size} /> },
  { id: 'im-headphones', label: 'Headphones (Im)', Icon: ({ size = 28 }) => <ImHeadphones size={size} /> },
  { id: 'lia-headphones', label: 'Headphones (Lia)', Icon: ({ size = 28 }) => <LiaHeadphonesSolid size={size} /> },
  { id: 'ti-headphones', label: 'Headphones (Ti)', Icon: ({ size = 28 }) => <TiHeadphones size={size} /> },
  { id: 'fi-headphones', label: 'Headphones (Fi)', Icon: ({ size = 28 }) => <FiHeadphones size={size} /> },
  { id: 'ri-headphones', label: 'Headphones (Ri)', Icon: ({ size = 28 }) => <RiHeadphoneFill size={size} /> },
  { id: 'tfi-headphone', label: 'Headphone (Tfi)', Icon: ({ size = 28 }) => <TfiHeadphone size={size} /> },
];

const GUITAR_ICONS: IconDef[] = [
  { id: 'gi-bass', label: 'Bass guitar (Gi)', Icon: ({ size = 28 }) => <GiGuitarBassHead size={size} /> },
  { id: 'gi-guitar', label: 'Electric guitar (Gi)', Icon: ({ size = 28 }) => <GiGuitar size={size} /> },
  { id: 'fa-guitar', label: 'Guitar (FA)', Icon: ({ size = 28 }) => <FaGuitar size={size} /> },
  { id: 'pi-guitar', label: 'Guitar (Pi)', Icon: ({ size = 28 }) => <PiGuitar size={size} /> },
  { id: 'lu-guitar', label: 'Guitar (Lu)', Icon: ({ size = 28 }) => <LuGuitar size={size} /> },
  { id: 'lia-guitar', label: 'Guitar (Lia)', Icon: ({ size = 28 }) => <LiaGuitarSolid size={size} /> },
];

const defaultSelections = (): Record<number, IconSelection> => {
  const out: Record<number, IconSelection> = {};
  BEHRINGER_ALL_ICONS.forEach(({ id, label }) => { out[id] = { checked: false, label }; });
  return out;
};

function loadSelections(): Record<number, IconSelection> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BEHRINGER);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, { checked: boolean; label: string }>;
      const out: Record<number, IconSelection> = {};
      BEHRINGER_ALL_ICONS.forEach(({ id, label }) => {
        const s = parsed[String(id)];
        out[id] = s ? { checked: s.checked, label: s.label || label } : { checked: false, label };
      });
      return out;
    }
  } catch { /* ignore */ }
  return defaultSelections();
}

function saveSelections(selections: Record<number, IconSelection>) {
  localStorage.setItem(STORAGE_KEY_BEHRINGER, JSON.stringify(Object.fromEntries(Object.entries(selections).map(([k, v]) => [k, v]))));
}

const defaultGameIconSelections = (): Record<string, IconSelection> => {
  const out: Record<string, IconSelection> = {};
  getInstruments().forEach((inst) => { out[inst.id] = { checked: false, label: inst.shortLabel }; });
  return out;
};

function loadGameIconSelections(): Record<string, IconSelection> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAME_ICONS);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, { checked: boolean; label: string }>;
      const out: Record<string, IconSelection> = {};
      getInstruments().forEach((inst) => {
        const s = parsed[inst.id];
        out[inst.id] = s ? { checked: s.checked, label: s.label || inst.shortLabel } : { checked: false, label: inst.shortLabel };
      });
      return out;
    }
  } catch { /* ignore */ }
  return defaultGameIconSelections();
}

function saveGameIconSelections(selections: Record<string, IconSelection>) {
  localStorage.setItem(STORAGE_KEY_GAME_ICONS, JSON.stringify(Object.fromEntries(Object.entries(selections))));
}

function createIconSetStorage(key: string, items: IconDef[]) {
  const defaultSel = () => {
    const out: Record<string, IconSelection> = {};
    items.forEach(({ id, label }) => { out[id] = { checked: false, label }; });
    return out;
  };
  const load = (): Record<string, IconSelection> => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { checked: boolean; label: string }>;
        const out: Record<string, IconSelection> = {};
        items.forEach(({ id, label }) => {
          const s = parsed[id];
          out[id] = s ? { checked: s.checked, label: s.label || label } : { checked: false, label };
        });
        return out;
      }
    } catch { /* ignore */ }
    return defaultSel();
  };
  const save = (sel: Record<string, IconSelection>) => localStorage.setItem(key, JSON.stringify(sel));
  return { defaultSel, load, save };
}

const faStorage = createIconSetStorage(STORAGE_KEY_FA, FA_INSTRUMENTS);
const phosphorStorage = createIconSetStorage(STORAGE_KEY_PHOSPHOR, PHOSPHOR_INSTRUMENTS);
const materialStorage = createIconSetStorage(STORAGE_KEY_MATERIAL, MATERIAL_INSTRUMENTS);
const wedgeStorage = createIconSetStorage(STORAGE_KEY_WEDGE, WEDGE_ICONS);
const iemStorage = createIconSetStorage(STORAGE_KEY_IEM, IEM_ICONS);
const guitarStorage = createIconSetStorage(STORAGE_KEY_GUITAR, GUITAR_ICONS);

const iconCellStyle: React.CSSProperties = {
  width: 72, padding: '0.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
  background: 'linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)', border: '1px solid #3a3a3a', borderRadius: 8,
  color: '#e5e7eb',
};
const inputStyle: React.CSSProperties = {
  fontSize: '0.6rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid #3a3a3a',
  borderRadius: 4, color: '#e5e7eb', padding: '0.2rem', width: '100%', maxWidth: 64,
};

function renderSelectableGrid(
  items: IconDef[],
  sel: Record<string, IconSelection>,
  handlers: { setChecked: (id: string, c: boolean) => void; setLabel: (id: string, l: string) => void },
) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      {items.map(({ id, label: defLabel, Icon }) => {
        const { checked, label } = sel[id] ?? { checked: false, label: defLabel };
        return (
          <div key={id} style={{ ...iconCellStyle, position: 'relative', borderColor: checked ? '#00ced1' : undefined, boxShadow: checked ? 'inset 0 0 0 1px #00ced1' : undefined }}>
            <label style={{ position: 'absolute', top: 4, right: 6, cursor: 'pointer', zIndex: 1 }}>
              <input type="checkbox" checked={checked} onChange={(e) => handlers.setChecked(id, e.target.checked)} style={{ margin: 0, cursor: 'pointer', accentColor: '#00ced1' }} title="Include" />
            </label>
            <Icon size={28} />
            <input type="text" value={label} onChange={(e) => handlers.setLabel(id, e.target.value)} style={inputStyle} />
          </div>
        );
      })}
    </div>
  );
}

function TestingGround() {
  const [showPicker, setShowPicker] = useState(false);
  const [selections, setSelections] = useState<Record<number, IconSelection>>(defaultSelections);
  const [gameIconSelections, setGameIconSelections] = useState<Record<string, IconSelection>>(defaultGameIconSelections);
  const [faSelections, setFaSelections] = useState(faStorage.defaultSel);
  const [phosphorSelections, setPhosphorSelections] = useState(phosphorStorage.defaultSel);
  const [materialSelections, setMaterialSelections] = useState(materialStorage.defaultSel);
  const [wedgeSelections, setWedgeSelections] = useState(wedgeStorage.defaultSel);
  const [iemSelections, setIemSelections] = useState(iemStorage.defaultSel);
  const [guitarSelections, setGuitarSelections] = useState(guitarStorage.defaultSel);

  useEffect(() => { setSelections(loadSelections()); }, []);
  useEffect(() => { setGameIconSelections(loadGameIconSelections()); }, []);
  useEffect(() => { setFaSelections(faStorage.load()); }, []);
  useEffect(() => { setPhosphorSelections(phosphorStorage.load()); }, []);
  useEffect(() => { setMaterialSelections(materialStorage.load()); }, []);
  useEffect(() => { setWedgeSelections(wedgeStorage.load()); }, []);
  useEffect(() => { setIemSelections(iemStorage.load()); }, []);
  useEffect(() => { setGuitarSelections(guitarStorage.load()); }, []);

  const setChecked = useCallback((id: number, checked: boolean) => {
    setSelections((prev) => { const next = { ...prev, [id]: { ...prev[id], checked } }; saveSelections(next); return next; });
  }, []);

  const setLabel = useCallback((id: number, label: string) => {
    setSelections((prev) => { const next = { ...prev, [id]: { ...prev[id], label } }; saveSelections(next); return next; });
  }, []);

  const setGameIconChecked = useCallback((id: string, checked: boolean) => {
    setGameIconSelections((prev) => { const next = { ...prev, [id]: { ...prev[id], checked } }; saveGameIconSelections(next); return next; });
  }, []);

  const setGameIconLabel = useCallback((id: string, label: string) => {
    setGameIconSelections((prev) => { const next = { ...prev, [id]: { ...prev[id], label } }; saveGameIconSelections(next); return next; });
  }, []);

  const createSetHandlers = (setter: React.Dispatch<React.SetStateAction<Record<string, IconSelection>>>, storage: { save: (s: Record<string, IconSelection>) => void }) => ({
    setChecked: (id: string, checked: boolean) => setter((prev) => { const next = { ...prev, [id]: { ...prev[id], checked } }; storage.save(next); return next; }),
    setLabel: (id: string, label: string) => setter((prev) => { const next = { ...prev, [id]: { ...prev[id], label } }; storage.save(next); return next; }),
  });

  const wedgeHandlers = createSetHandlers(setWedgeSelections, wedgeStorage);
  const iemHandlers = createSetHandlers(setIemSelections, iemStorage);
  const guitarHandlers = createSetHandlers(setGuitarSelections, guitarStorage);
  const faHandlers = createSetHandlers(setFaSelections, faStorage);
  const phosphorHandlers = createSetHandlers(setPhosphorSelections, phosphorStorage);
  const materialHandlers = createSetHandlers(setMaterialSelections, materialStorage);

  const INSTRUMENTS = getInstruments();
  const selectedGameIcons = INSTRUMENTS.filter((inst) => gameIconSelections[inst.id]?.checked);
  const selectedIcons = BEHRINGER_ALL_ICONS.filter(({ id }) => selections[id]?.checked);
  const chosenFromGame = selectedGameIcons.map((inst) => ({ source: 'game-icons' as const, id: inst.id, label: gameIconSelections[inst.id]?.label || inst.shortLabel }));
  const chosenFromBehringer = selectedIcons.map(({ id }) => ({ source: 'behringer' as const, id: String(id), label: selections[id]?.label || '' }));
  const selectedGuitarIcons = GUITAR_ICONS.filter(({ id }) => guitarSelections[id]?.checked);
  const chosenFromGuitar = selectedGuitarIcons.map(({ id }) => ({ source: 'guitar' as const, id, label: guitarSelections[id]?.label || '' }));
  const totalChosen = chosenFromGame.length + chosenFromBehringer.length + chosenFromGuitar.length;

  if (!showPicker) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>Testing Ground</h1>
            <div className="page-header-sub">Icon selections are saved and used across IOPatch and instrument pickers.</div>
          </div>
        </header>
        <section className="event-detail-section">
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Your chosen icons are stored in localStorage and applied in the app. First checked wedge and IEM icons are used for output patch.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShowPicker(true)}>
            Choose icons
          </button>
          {totalChosen > 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--color-muted)' }}>
              {totalChosen} instrument icon(s) selected. Wedge/IEM choices apply to output patch.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Testing Ground — Icon picker</h1>
          <div className="page-header-sub">Check to include, edit labels. Saved automatically.</div>
        </div>
        <button type="button" className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setShowPicker(false)}>
          Back to summary
        </button>
      </header>

      {totalChosen > 0 && (
        <section className="event-detail-section" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderColor: '#00ced1' }}>
          <h2 style={{ color: '#e5e7eb' }}>✓ Your chosen set ({totalChosen})</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {chosenFromGame.map(({ id, label }) => {
              const inst = INSTRUMENTS.find((i) => i.id === id);
              if (!inst) return null;
              return (
                <div key={`g-${id}`} style={iconCellStyle}><inst.Icon size={28} /><span style={{ fontSize: '0.6rem' }}>{label || '(no label)'}</span></div>
              );
            })}
            {chosenFromBehringer.map(({ id, label }) => (
              <div key={`b-${id}`} style={iconCellStyle}><BehringerIcon id={parseInt(id, 10)} size={28} /><span style={{ fontSize: '0.6rem' }}>{label || '(no label)'}</span></div>
            ))}
            {chosenFromGuitar.map(({ id, label }) => {
              const def = GUITAR_ICONS.find((g) => g.id === id);
              if (!def) return null;
              return <div key={`gu-${id}`} style={iconCellStyle}><def.Icon size={28} /><span style={{ fontSize: '0.6rem' }}>{label || '(no label)'}</span></div>;
            })}
          </div>
        </section>
      )}

      <section className="event-detail-section" style={{ background: '#121212' }}><h2>Wedge monitor</h2>{renderSelectableGrid(WEDGE_ICONS, wedgeSelections, wedgeHandlers)}</section>
      <section className="event-detail-section" style={{ background: '#121212' }}><h2>IEM body pack</h2>{renderSelectableGrid(IEM_ICONS, iemSelections, iemHandlers)}</section>
      <section className="event-detail-section" style={{ background: '#121212' }}><h2>Bass & guitar icons</h2>{renderSelectableGrid(GUITAR_ICONS, guitarSelections, guitarHandlers)}</section>

      <section className="event-detail-section">
        <h2>Game Icons (instruments)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {INSTRUMENTS.map((inst) => {
            const { checked, label } = gameIconSelections[inst.id] ?? { checked: false, label: inst.shortLabel };
            return (
              <div key={inst.id} style={{ ...iconCellStyle, position: 'relative', borderColor: checked ? '#00ced1' : undefined, boxShadow: checked ? 'inset 0 0 0 1px #00ced1' : undefined }}>
                <label style={{ position: 'absolute', top: 4, right: 6, cursor: 'pointer', zIndex: 1 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => setGameIconChecked(inst.id, e.target.checked)} style={{ margin: 0, accentColor: '#00ced1' }} />
                </label>
                <inst.Icon size={28} />
                <input type="text" value={label} onChange={(e) => setGameIconLabel(inst.id, e.target.value)} style={inputStyle} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="event-detail-section" style={{ background: '#121212' }}>
        <h2 style={{ color: '#e5e7eb' }}>Behringer X32 icons</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>From <a href="https://github.com/mamarguerat/behringer-icons" target="_blank" rel="noreferrer" style={{ color: '#00ced1' }}>behringer-icons</a>.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {BEHRINGER_ALL_ICONS.map(({ id, label: defaultLabel }) => {
            const { checked, label } = selections[id] ?? { checked: false, label: defaultLabel };
            return (
              <div key={id} style={{ ...iconCellStyle, position: 'relative', borderColor: checked ? '#00ced1' : undefined, boxShadow: checked ? 'inset 0 0 0 1px #00ced1' : undefined }}>
                <label style={{ position: 'absolute', top: 4, right: 6, cursor: 'pointer', zIndex: 1 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(id, e.target.checked)} style={{ margin: 0, accentColor: '#00ced1' }} />
                </label>
                <BehringerIcon id={id} size={28} />
                <input type="text" value={label} onChange={(e) => setLabel(id, e.target.value)} style={inputStyle} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="event-detail-section"><h2>Font Awesome</h2>{renderSelectableGrid(FA_INSTRUMENTS, faSelections, faHandlers)}</section>
      <section className="event-detail-section"><h2>Phosphor</h2>{renderSelectableGrid(PHOSPHOR_INSTRUMENTS, phosphorSelections, phosphorHandlers)}</section>
      <section className="event-detail-section"><h2>Material Design</h2>{renderSelectableGrid(MATERIAL_INSTRUMENTS, materialSelections, materialHandlers)}</section>
    </div>
  );
}

export default TestingGround;
