type Props = {
  activeTab: 'overview' | 'ledger';
  bandName: string;
};

function BandHeaderMeta({ activeTab, bandName }: Props) {
  return (
    <header className="page-header">
      <div>
        <h1>
          {activeTab === 'overview' ? 'Band schedule' : 'Band ledger'} – {bandName}
        </h1>
        <div className="page-header-sub">
          {activeTab === 'overview' ? 'Where and when this band is playing.' : 'Finance overview for this band.'}
        </div>
      </div>
    </header>
  );
}

export default BandHeaderMeta;

