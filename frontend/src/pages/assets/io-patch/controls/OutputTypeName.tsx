type OutputTypeNameProps = {
  value: string;
};

export function OutputTypeName({ value }: OutputTypeNameProps) {
  return (
    <div className="io-patch-instrument-name" title={value === 'Wedge' ? 'Wedge monitor' : value === 'IEM' ? 'IEM body pack' : ''}>
      {value || '—'}
    </div>
  );
}
