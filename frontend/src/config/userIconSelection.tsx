/**
 * Resolves instrument icons and wedge/IEM icons from saved local preferences.
 * Primary keys: `bandwidth-io-*-selection`; legacy `testing-ground-*` still read for migration.
 */
import type { ReactNode } from 'react';
import { BehringerIcon } from '../assets/behringer-icons/BehringerIcon';
import {
  GiDrum,
  GiGuitar,
  GiGuitarBassHead,
  GiPianoKeys,
  GiDjembe,
  GiTrumpet,
  GiTrombone,
  GiSaxophone,
  GiClarinet,
  GiMetronome,
  GiMicrophone,
  GiSpeaker,
  GiHeadphones,
  GiEarbuds,
} from 'react-icons/gi';
import { FaDrumSteelpan, FaVolumeUp, FaHeadphones, FaGuitar } from 'react-icons/fa';
import { PiGuitar, PiSpeakerHigh, PiHeadphones } from 'react-icons/pi';
import { LuGuitar } from 'react-icons/lu';
import { LiaGuitarSolid } from 'react-icons/lia';
import { MdSpeaker, MdHeadphones, MdVolumeUp, MdMonitor, MdEarbuds } from 'react-icons/md';
import { FaVolumeHigh } from 'react-icons/fa6';
import { HiSpeakerWave } from 'react-icons/hi2';
import { HiVolumeUp, HiSpeakerphone } from 'react-icons/hi';
import { TbDeviceSpeaker, TbHeadphones } from 'react-icons/tb';
import { RxSpeakerLoud } from 'react-icons/rx';
import { ImVolumeHigh, ImHeadphones } from 'react-icons/im';
import { LiaVolumeUpSolid, LiaHeadphonesSolid } from 'react-icons/lia';
import { TiVolumeUp, TiHeadphones } from 'react-icons/ti';
import { GrVolumeControl } from 'react-icons/gr';
import { FcSpeaker } from 'react-icons/fc';
import { FiSpeaker, FiVolume2, FiHeadphones } from 'react-icons/fi';
import { IoMdVolumeHigh } from 'react-icons/io';
import { RiHeadphoneFill } from 'react-icons/ri';
import { TfiHeadphone } from 'react-icons/tfi';
import { SlEarphones } from 'react-icons/sl';
import { LuMonitorSpeaker, LuMonitor } from 'react-icons/lu';
import { PiMonitor } from 'react-icons/pi';
import { FiMonitor } from 'react-icons/fi';
import { CiMonitor } from 'react-icons/ci';
import { BsEarbuds } from 'react-icons/bs';
import { BsSpeaker, BsHeadphones } from 'react-icons/bs';

const KEY_GAME = 'bandwidth-io-game-icons-selection';
const KEY_GAME_LEGACY = 'testing-ground-game-icons-selection';
const KEY_BEHRINGER = 'bandwidth-io-behringer-selection';
const KEY_BEHRINGER_LEGACY = 'testing-ground-behringer-selection';
const KEY_GUITAR = 'bandwidth-io-guitar-selection';
const KEY_GUITAR_LEGACY = 'testing-ground-guitar-selection';
const KEY_WEDGE = 'bandwidth-io-wedge-selection';
const KEY_WEDGE_LEGACY = 'testing-ground-wedge-selection';
const KEY_IEM = 'bandwidth-io-iem-selection';
const KEY_IEM_LEGACY = 'testing-ground-iem-selection';

type IconSelection = { checked: boolean; label: string };

function load<T>(key: string, parse: (raw: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function loadWithLegacy<T>(primary: string, legacy: string, parse: (raw: unknown) => T | null): T | null {
  return load(primary, parse) ?? load(legacy, parse);
}

const Icon = (C: React.ComponentType<{ size?: number }>) => ({ size = 32 }: { size?: number }) => (
  <span style={{ flexShrink: 0, display: 'inline-flex' }}><C size={size} /></span>
);

/** Text-only instrument (no icon), renders label in same swatch style */
const TextOnlyIcon = (text: string) => ({ size = 32 }: { size?: number }) => (
  <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.45), fontWeight: 700 }}>{text}</span>
);

const SpeakerWithLetter = ({ letter, size = 32 }: { letter: string; size?: number }) => (
  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}>
    <span style={{ flexShrink: 0 }}><GiSpeaker size={size} /></span>
    <span style={{ position: 'absolute', bottom: '8%', right: '12%', fontSize: Math.round(size * 0.35), fontWeight: 700, lineHeight: 1, color: 'inherit' }}>{letter}</span>
  </span>
);

type InstrumentDef = { id: string; label: string; shortLabel: string; Icon: (p: { size?: number }) => ReactNode };

const BEHRINGER_MAP: Record<number, string> = {
  2: 'kick', 3: 'kick',
  4: 'snare', 5: 'snare',
  6: 'tom-high', 7: 'tom-mid', 8: 'tom-floor',
  9: 'hihat', 13: 'conga-high', 14: 'conga-low',
  17: 'bass', 20: 'elec-guitar', 21: 'elec-guitar', 22: 'acoustic-guitar', 23: 'acoustic-guitar',
  27: 'keyboard', 30: 'keyboard',
  35: 'trumpet', 36: 'trombone', 37: 'saxophone', 38: 'clarinet',
  54: 'xlr',
};

const GUITAR_MAP: Record<string, string> = {
  'gi-bass': 'bass', 'gi-guitar': 'elec-guitar', 'fa-guitar': 'elec-guitar',
  'pi-guitar': 'elec-guitar', 'lu-guitar': 'elec-guitar', 'lia-guitar': 'elec-guitar',
};

const DEFAULT_INSTRUMENTS: InstrumentDef[] = [
  { id: 'kick', label: 'Kick drum', shortLabel: 'Kick', Icon: Icon(GiDrum) },
  { id: 'tom-high', label: 'High tom', shortLabel: 'HiTom', Icon: Icon(GiDrum) },
  { id: 'tom-mid', label: 'Mid tom', shortLabel: 'MdTom', Icon: Icon(GiDrum) },
  { id: 'tom-floor', label: 'Floor tom', shortLabel: 'FlTom', Icon: Icon(GiDrum) },
  { id: 'hihat', label: 'Hi-hat', shortLabel: 'HiHat', Icon: ({ size = 32 }) => <span style={{ flexShrink: 0 }}><FaDrumSteelpan size={size} /></span> },
  { id: 'snare', label: 'Snare', shortLabel: 'Snare', Icon: TextOnlyIcon('Snare') },
  { id: 'oh-l', label: 'Overhead L', shortLabel: 'OH L', Icon: Icon(GiMicrophone) },
  { id: 'oh-r', label: 'Overhead R', shortLabel: 'OH R', Icon: Icon(GiMicrophone) },
  { id: 'di-box', label: 'DI box', shortLabel: 'DI', Icon: TextOnlyIcon('DI') },
  { id: 'xlr', label: 'XLR', shortLabel: 'XLR', Icon: ({ size = 32 }) => <span style={{ flexShrink: 0 }}><BehringerIcon id={54} size={size} /></span> },
  { id: 'elec-guitar', label: 'Electric guitar', shortLabel: 'El Gtr', Icon: Icon(GiGuitar) },
  { id: 'bass', label: 'Bass guitar', shortLabel: 'Bass', Icon: Icon(GiGuitarBassHead) },
  { id: 'acoustic-guitar', label: 'Acoustic guitar', shortLabel: 'Ac Gtr', Icon: Icon(GiGuitar) },
  { id: 'keyboard', label: 'Keyboard', shortLabel: 'Keys', Icon: Icon(GiPianoKeys) },
  { id: 'conga-high', label: 'Conga high', shortLabel: 'ConHi', Icon: Icon(GiDjembe) },
  { id: 'conga-low', label: 'Conga low', shortLabel: 'ConLo', Icon: Icon(GiDjembe) },
  { id: 'timbales-high', label: 'Timbales high', shortLabel: 'TimHi', Icon: ({ size = 32 }) => <span style={{ flexShrink: 0 }}><FaDrumSteelpan size={size} /></span> },
  { id: 'timbales-low', label: 'Timbales low', shortLabel: 'TimLo', Icon: ({ size = 32 }) => <span style={{ flexShrink: 0 }}><FaDrumSteelpan size={size} /></span> },
  { id: 'djembe', label: 'Djembe', shortLabel: 'Djemb', Icon: Icon(GiDjembe) },
  { id: 'darbuka', label: 'Darbuka', shortLabel: 'Darb', Icon: Icon(GiDjembe) },
  { id: 'trumpet', label: 'Trumpet', shortLabel: 'Trmpt', Icon: Icon(GiTrumpet) },
  { id: 'trombone', label: 'Trombone', shortLabel: 'Trmb', Icon: Icon(GiTrombone) },
  { id: 'saxophone', label: 'Saxophone', shortLabel: 'Sax', Icon: Icon(GiSaxophone) },
  { id: 'clarinet', label: 'Clarinet', shortLabel: 'Clarn', Icon: Icon(GiClarinet) },
  { id: 'metronome', label: 'Metronome', shortLabel: 'Metro', Icon: Icon(GiMetronome) },
  { id: 'matrix-l', label: 'Matrix L', shortLabel: 'Mat L', Icon: (p) => <SpeakerWithLetter letter="L" {...p} /> },
  { id: 'matrix-r', label: 'Matrix R', shortLabel: 'Mat R', Icon: (p) => <SpeakerWithLetter letter="R" {...p} /> },
];

const GUITAR_ICONS: Record<string, (p: { size?: number }) => ReactNode> = {
  'gi-bass': Icon(GiGuitarBassHead), 'gi-guitar': Icon(GiGuitar), 'fa-guitar': Icon(FaGuitar),
  'pi-guitar': Icon(PiGuitar), 'lu-guitar': Icon(LuGuitar), 'lia-guitar': Icon(LiaGuitarSolid),
};

const WEDGE_ICONS: Record<string, (p: { size?: number }) => ReactNode> = {
  'fa-volume': Icon(FaVolumeUp), 'fa6-volume': Icon(FaVolumeHigh), 'md-speaker': Icon(MdSpeaker), 'md-volume': Icon(MdVolumeUp),
  'pi-speaker': Icon(PiSpeakerHigh), 'bs-speaker': Icon(BsSpeaker), 'hi2-speaker': Icon(HiSpeakerWave), 'hi-volume': Icon(HiVolumeUp),
  'hi-speakerphone': Icon(HiSpeakerphone), 'gi-speaker': Icon(GiSpeaker), 'tb-speaker': Icon(TbDeviceSpeaker), 'rx-speaker': Icon(RxSpeakerLoud),
  'im-volume': Icon(ImVolumeHigh), 'lia-volume': Icon(LiaVolumeUpSolid), 'ti-volume': Icon(TiVolumeUp), 'gr-volume': Icon(GrVolumeControl),
  'fc-speaker': Icon(FcSpeaker), 'fi-speaker': Icon(FiSpeaker), 'fi-volume': Icon(FiVolume2), 'io-volume': Icon(IoMdVolumeHigh),
  'lu-monitor-spk': Icon(LuMonitorSpeaker), 'lu-monitor': Icon(LuMonitor), 'pi-monitor': Icon(PiMonitor), 'md-monitor': Icon(MdMonitor),
  'fi-monitor': Icon(FiMonitor), 'ci-monitor': Icon(CiMonitor),
};

const IEM_ICONS: Record<string, (p: { size?: number }) => ReactNode> = {
  'fa-headphones': Icon(FaHeadphones), 'md-headphones': Icon(MdHeadphones), 'md-earbuds': Icon(MdEarbuds),
  'pi-headphones': Icon(PiHeadphones), 'bs-headphones': Icon(BsHeadphones), 'bs-earbuds': Icon(BsEarbuds),
  'gi-headphones': Icon(GiHeadphones), 'gi-earbuds': Icon(GiEarbuds), 'sl-earphones': Icon(SlEarphones),
  'tb-headphones': Icon(TbHeadphones), 'im-headphones': Icon(ImHeadphones), 'lia-headphones': Icon(LiaHeadphonesSolid),
  'ti-headphones': Icon(TiHeadphones), 'fi-headphones': Icon(FiHeadphones), 'ri-headphones': Icon(RiHeadphoneFill),
  'tfi-headphone': Icon(TfiHeadphone),
};

export function resolveInstruments(): InstrumentDef[] {
  const game = loadWithLegacy(KEY_GAME, KEY_GAME_LEGACY, (r) => r as Record<string, IconSelection> | null);
  const behringer = loadWithLegacy(KEY_BEHRINGER, KEY_BEHRINGER_LEGACY, (r) => r as Record<string, IconSelection> | null);
  const guitar = loadWithLegacy(KEY_GUITAR, KEY_GUITAR_LEGACY, (r) => r as Record<string, IconSelection> | null);

  const behringerByInst: Record<string, { behId: number; label: string }> = {};
  if (behringer) {
    for (const [k, v] of Object.entries(behringer)) {
      if (!v?.checked) continue;
      const behId = parseInt(k, 10);
      const instId = BEHRINGER_MAP[behId];
      if (instId) behringerByInst[instId] = { behId, label: v.label || '' };
    }
  }

  const guitarByInst: Record<string, { key: string; label: string }> = {};
  if (guitar) {
    for (const [key, v] of Object.entries(guitar)) {
      if (!v?.checked) continue;
      const instId = GUITAR_MAP[key];
      if (instId && GUITAR_ICONS[key]) guitarByInst[instId] = { key, label: v.label || '' };
    }
  }

  return DEFAULT_INSTRUMENTS.map((def) => {
    const gameSel = game?.[def.id];
    const beh = behringerByInst[def.id];
    const guit = guitarByInst[def.id];

    let IconComponent = def.Icon;
    let shortLabel = def.shortLabel;
    let label = def.label;

    if (guit) {
      IconComponent = GUITAR_ICONS[guit.key];
      if (guit.label) shortLabel = guit.label.slice(0, 6);
      if (guit.label) label = guit.label;
    } else if (beh) {
      IconComponent = ({ size = 32 }) => <BehringerIcon id={beh.behId} size={size} />;
      if (beh.label) shortLabel = beh.label.slice(0, 6);
      if (beh.label) label = beh.label;
    } else if (gameSel?.checked && gameSel.label) {
      shortLabel = gameSel.label.slice(0, 6);
      label = gameSel.label;
    }

    return { ...def, Icon: IconComponent, shortLabel, label };
  });
}

export function resolveWedgeIcon(): React.ComponentType<{ size?: number }> {
  const wedge = loadWithLegacy(KEY_WEDGE, KEY_WEDGE_LEGACY, (r) => r as Record<string, IconSelection> | null);
  if (wedge) {
    const first = Object.entries(wedge).find(([, v]) => v?.checked);
    if (first) {
      const [id] = first;
      if (id.startsWith('beh-')) {
        const num = parseInt(id.replace('beh-', ''), 10);
        return ({ size = 16 }) => <BehringerIcon id={num} size={size} />;
      }
      const C = WEDGE_ICONS[id];
      if (C) return C as React.ComponentType<{ size?: number }>;
    }
  }
  return ({ size = 16 }) => <FaVolumeUp size={size} />;
}

export function resolveIemIcon(): React.ComponentType<{ size?: number }> {
  const iem = loadWithLegacy(KEY_IEM, KEY_IEM_LEGACY, (r) => r as Record<string, IconSelection> | null);
  if (iem) {
    const first = Object.entries(iem).find(([, v]) => v?.checked);
    if (first) {
      const [id] = first;
      const C = IEM_ICONS[id];
      if (C) return C as React.ComponentType<{ size?: number }>;
    }
  }
  return ({ size = 16 }) => <FaHeadphones size={size} />;
}
