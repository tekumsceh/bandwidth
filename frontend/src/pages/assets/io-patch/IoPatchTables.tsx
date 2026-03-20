import { getInstrument } from '../instrumentIcons';
import { buildLinkDescription } from './patchTableUtils';

type InputPatchTableProps = {
  inputPatch: Record<number, { mic: string; stand: string }>;
  inputChannelInstruments: Record<number, string>;
  inputChannelInstrumentLabels?: Record<number, string>;
  inputChannelSkips: Record<number, boolean>;
  inputChannelLR: Record<number, 'L' | 'R' | ''>;
  inputChannelLinks: Record<number, number>;
};

export function InputPatchTable({
  inputPatch,
  inputChannelInstruments,
  inputChannelInstrumentLabels,
  inputChannelSkips,
  inputChannelLR,
  inputChannelLinks,
}: InputPatchTableProps) {
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
                  <td>{skipped ? 'skip' : ((inputChannelInstrumentLabels?.[ch] && inputChannelInstrumentLabels[ch] !== '') ? inputChannelInstrumentLabels[ch] : inst?.shortLabel) ?? '—'}</td>
                  <td>{skipped ? 'skip' : (inputPatch[ch]?.mic ?? '—')}</td>
                  <td>{skipped ? 'skip' : (inputPatch[ch]?.stand ?? '—')}</td>
                  <td>{skipped ? 'skip' : buildLinkDescription(inputChannelLR[ch], inputChannelLinks[ch])}</td>
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

export function OutputPatchTable({ outputPatch, outputChannelSkips, outputChannelLR, outputChannelLinks }: OutputPatchTableProps) {
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
                  <td>{skipped ? 'skip' : (outputPatch[ch]?.type || '—')}</td>
                  <td>{skipped ? 'skip' : (outputPatch[ch]?.member ?? '—')}</td>
                  <td>{skipped ? 'skip' : buildLinkDescription(outputChannelLR[ch], outputChannelLinks[ch])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
