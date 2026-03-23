export type GearOption = {
  full: string;
  short: string;
};

function gear(full: string, short: string): GearOption {
  return { full, short };
}

export const GEAR_CATALOG = {
  drumsYamaha: gear('Yamaha Stage Custom Drum Kit', 'Drums'),
  drumsPearl: gear('Pearl Reference Drum Kit', 'Drums'),
  cymbalsPaiste: gear('Paiste 2002 Cymbal Set', 'Cymbals'),
  sticksVicFirth: gear('Vic Firth 5A Sticks', 'Sticks'),
  throneRocNsoc: gear('Roc-N-Soc Drum Throne', 'Throne'),

  stratFender: gear('Fender Stratocaster', 'Strat'),
  prsCustom24: gear('PRS Custom 24', 'PRS'),
  ampOrange: gear('Orange Rockerverb Amp', 'Amp'),
  pedalboardA: gear('Pedalboard A', 'Pedals'),
  wirelessGuitar: gear('Shure Wireless Guitar Pack', 'Wireless'),

  bassStingray: gear('Music Man StingRay Bass', 'StingRay'),
  bassPrecision: gear('Fender Precision Bass', 'P-Bass'),
  ampAmpeg: gear('Ampeg SVT Bass Amp', 'Ampeg'),
  pedalboardBass: gear('Bass Pedalboard', 'Pedals'),
  diActive: gear('Active DI Box', 'DI'),

  nordStage: gear('Nord Stage 4', 'Nord'),
  vocalMicShure: gear('Shure Vocal Microphone', 'Vocal'),
  percussionPack: gear('Percussion Pack', 'Percussion'),
  inEarRack: gear('In-Ear Rack', 'IEM'),
  playbackRig: gear('MacBook Playback Rig', 'Playback'),

  martinD28: gear('Martin D-28 Acoustic Guitar', 'Martin'),
  taylor714: gear('Taylor 714ce Acoustic Guitar', 'Taylor'),
  acousticDi: gear('Acoustic DI Box', 'DI'),
  clipMicShure: gear('Shure Clip Microphone', 'Clip'),
  capoStrings: gear('Capo and Strings Kit', 'Kit'),

  trumpetYamaha: gear('Yamaha Trumpet', 'Trumpet'),
  trumpetClip: gear('Trumpet Clip Microphone', 'Clip'),
  bellStand: gear('Bell Stand', 'Stand'),
  muteSet: gear('Brass Mute Set', 'Mutes'),
  wirelessBeltpack: gear('Wireless Beltpack', 'Wireless'),

  clarinetA: gear('Clarinet', 'Clarinet'),
  saxAlto: gear('Alto Saxophone', 'Sax'),
  clipMicDual: gear('Dual Clip Microphone Set', 'Clip'),
  reedKit: gear('Reed Kit', 'Reeds'),
  instrumentStand: gear('Instrument Stand', 'Stand'),

  tromboneTenor: gear('Tenor Trombone', 'Trombone'),
  brassStand: gear('Brass Stand', 'Stand'),

  consoleM32: gear('Midas M32 Console', 'Console'),
  stageboxDl32: gear('Midas DL32 Stagebox', 'Stagebox'),
  vocalRack: gear('Main Vocal Rack', 'Rack'),
  cableCase: gear('Spare Cable Case', 'Cables'),
  measureMic: gear('Measurement Microphone', 'Measure'),

  productionBinder: gear('Production Binder', 'Binder'),
  showLaptop: gear('Show Laptop', 'Laptop'),
  commsHeadset: gear('Comms Headset', 'Comms'),
  hospitalityFolder: gear('Hospitality Folder', 'Hospitality'),
  transportPack: gear('Transport Pack', 'Transport'),

  none: gear('—', '—'),
} as const;

